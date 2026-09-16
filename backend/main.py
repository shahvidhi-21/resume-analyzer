from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional
import os

from database import engine, get_db, Base
from models import JobTitle, JobDescription, Candidate
from resume_parser import extract_text_from_file, extract_text_from_plain, extract_raw_text_for_name
from scorer import score_candidate
from text_processor import extract_jd_required_skills
from llm import generate_interview_insights, extract_jd_skills, extract_and_match_resume_skills

from sqlalchemy.sql import func
from pydantic import BaseModel

class SessionUpdate(BaseModel):
    title: str

# creates all tables in MySQL on startup if they don't already exist
Base.metadata.create_all(bind=engine)


def _run_startup_migration():
    """Use a raw connection to safely add the job_title_id column and migrate data."""
    from sqlalchemy import text
    with engine.connect() as conn:

        # Step 1 — add the column if it doesn't exist yet
        try:
            conn.execute(text(
                "ALTER TABLE job_descriptions ADD COLUMN job_title_id INTEGER NULL"
            ))
            conn.commit()
            print("[Migration] Added job_title_id column to job_descriptions.")
        except Exception:
            conn.rollback()
            pass  # column already exists — skip silently
            
        try:
            conn.execute(text(
                "ALTER TABLE candidates ADD COLUMN resume_text TEXT NULL"
            ))
            conn.commit()
            print("[Migration] Added resume_text column to candidates.")
        except Exception:
            conn.rollback()
            pass  # column already exists — skip silently

        # Step 2 — find sessions with no job_title_id (raw SQL to avoid ORM column issue)
        rows = conn.execute(text(
            "SELECT id, title FROM job_descriptions WHERE job_title_id IS NULL"
        )).fetchall()

        if not rows:
            return

        print(f"[Migration] Migrating {len(rows)} orphaned sessions into Job Titles...")
        title_cache: dict[str, int] = {}

        for row in rows:
            jd_id   = row[0]
            raw_title = (row[1] or "Untitled JD").strip()
            key = raw_title.lower()

            if key not in title_cache:
                existing = conn.execute(text(
                    "SELECT id FROM job_titles WHERE LOWER(title) = :key"
                ), {"key": key}).fetchone()

                if existing:
                    title_cache[key] = existing[0]
                else:
                    result = conn.execute(text(
                        "INSERT INTO job_titles (title) VALUES (:title)"
                    ), {"title": raw_title})
                    conn.commit()
                    title_cache[key] = result.lastrowid

            conn.execute(text(
                "UPDATE job_descriptions SET job_title_id = :jt_id WHERE id = :jd_id"
            ), {"jt_id": title_cache[key], "jd_id": jd_id})

        conn.commit()
        print("[Migration] Done.")


app = FastAPI(title="CVera API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    _run_startup_migration()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "CVera API is running"}


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_jds    = db.query(JobDescription).count()
    total_titles = db.query(JobTitle).count()
    total_candidates = db.query(Candidate).count()
    avg_score_res = db.query(func.avg(Candidate.overall_score)).scalar()
    avg_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

    return {
        "active_jds": total_titles,          # sidebar: unique job titles
        "resumes_analyzed": total_candidates,
        "avg_match_score": avg_score,
    }


# ─── JOB TITLES ──────────────────────────────────────────────────────────────

@app.get("/api/job-titles")
def get_job_titles(db: Session = Depends(get_db)):
    """Return all job titles with session count, candidate count and best score."""
    titles = db.query(JobTitle).order_by(JobTitle.created_at.desc()).all()
    result = []
    for jt in titles:
        sessions = db.query(JobDescription).filter(JobDescription.job_title_id == jt.id).all()
        session_ids = [s.id for s in sessions]
        candidate_count = (
            db.query(Candidate).filter(Candidate.jd_id.in_(session_ids)).count()
            if session_ids else 0
        )
        top_score_row = (
            db.query(func.max(Candidate.overall_score))
            .filter(Candidate.jd_id.in_(session_ids))
            .scalar()
            if session_ids else None
        )
        result.append({
            "id": jt.id,
            "title": jt.title,
            "created_at": jt.created_at.strftime("%Y-%m-%d %H:%M") if jt.created_at else "",
            "session_count": len(sessions),
            "candidate_count": candidate_count,
            "top_score": float(top_score_row) if top_score_row is not None else 0,
        })
    return result


@app.get("/api/job-titles/search")
def search_job_titles(q: str = "", db: Session = Depends(get_db)):
    """Autocomplete endpoint — returns matching job titles for the given query."""
    query = db.query(JobTitle)
    if q.strip():
        query = query.filter(JobTitle.title.ilike(f"%{q.strip()}%"))
    titles = query.order_by(JobTitle.title).limit(10).all()
    return [{"id": jt.id, "title": jt.title} for jt in titles]


@app.get("/api/job-titles/{title_id}/sessions")
def get_sessions_for_title(title_id: int, db: Session = Depends(get_db)):
    """Return all sessions under a given job title."""
    jt = db.query(JobTitle).filter(JobTitle.id == title_id).first()
    if not jt:
        raise HTTPException(status_code=404, detail="Job title not found.")

    sessions = (
        db.query(JobDescription)
        .filter(JobDescription.job_title_id == title_id)
        .order_by(JobDescription.created_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        c_count = db.query(Candidate).filter(Candidate.jd_id == s.id).count()
        top_c = (
            db.query(Candidate)
            .filter(Candidate.jd_id == s.id)
            .order_by(Candidate.overall_score.desc())
            .first()
        )
        result.append({
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "",
            "candidate_count": c_count,
            "top_score": top_c.overall_score if top_c else 0,
        })
    return {"job_title": jt.title, "sessions": result}


# ─── ANALYSIS ────────────────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze(
    jd_title: str                     = Form("Untitled JD"),
    jd_text: Optional[str]            = Form(None),
    jd_file: Optional[UploadFile]     = File(None),
    resumes: list[UploadFile]         = File(...),
    db: Session                       = Depends(get_db),
):
    # get JD text - either from an uploaded file or a pasted string
    if jd_file and jd_file.filename:
        jd_bytes = await jd_file.read()
        jd_content = extract_text_from_file(jd_bytes, jd_file.filename)
    elif jd_text:
        jd_content = extract_text_from_plain(jd_text)
    else:
        raise HTTPException(status_code=400, detail="Provide a JD file or paste JD text.")

    if not jd_content.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the JD.")

    # ── find-or-create the JobTitle ──────────────────────────────────────────
    normalized_title = jd_title.strip()
    key = normalized_title.lower()
    db_job_title = db.query(JobTitle).filter(func.lower(JobTitle.title) == key).first()
    if not db_job_title:
        db_job_title = JobTitle(title=normalized_title)
        db.add(db_job_title)
        db.flush()  # get the id without full commit

    # ── create a new Session under this title ────────────────────────────────
    jd_required_skills = extract_jd_skills(jd_content)
    if not jd_required_skills:
        jd_required_skills = extract_jd_required_skills(jd_content)

    db_jd = JobDescription(
        job_title_id=db_job_title.id,
        title=normalized_title,
        text=jd_content,
    )
    db.add(db_jd)
    db.commit()
    db.refresh(db_jd)

    results = []

    for resume_file in resumes:
        resume_bytes = await resume_file.read()

        try:
            resume_text = extract_text_from_file(resume_bytes, resume_file.filename)
        except ValueError:
            continue  # skip unsupported file types silently

        if not resume_text.strip():
            continue

        def _extract_name_from_text(raw_text: str, fallback_filename: str) -> str:
            for line in raw_text.splitlines():
                line = line.strip()
                if not line:
                    continue
                alpha_ratio = sum(c.isalpha() or c in " .-" for c in line) / len(line)
                if len(line) <= 60 and alpha_ratio >= 0.85 and len(line.split()) <= 6:
                    return line.title()
                break
            return os.path.splitext(fallback_filename)[0].replace("_", " ").title()

        raw_text = extract_raw_text_for_name(resume_bytes, resume_file.filename)
        name = _extract_name_from_text(raw_text, resume_file.filename)

        # Semantic matching with LLM
        llm_match_result = extract_and_match_resume_skills(resume_text, jd_required_skills)
        matched_skills = llm_match_result.get("matched_skills")
        missing_skills = llm_match_result.get("missing_skills")

        # run scoring pipeline
        score_result = score_candidate(
            resume_text=resume_text,
            jd_text=jd_content,
            candidate_name=name,
            jd_required_skills=jd_required_skills,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
        )

        # run LLM insights
        llm_data = generate_interview_insights(
            resume_text, jd_content, score_result["missing_skills"]
        )

        db_candidate = Candidate(
            jd_id=db_jd.id,
            name=name,
            filename=resume_file.filename,
            resume_text=resume_text,
            overall_score=score_result["overall_score"],
            score_breakdown=score_result["breakdown"],
            matched_skills=score_result["matched_skills"],
            missing_skills=score_result["missing_skills"],
            jd_required_skills=score_result["jd_required_skills"],
            llm_insights=llm_data,
        )
        db.add(db_candidate)
        db.commit()
        db.refresh(db_candidate)

        results.append({
            **score_result,
            "id": db_candidate.id,
            "llm_insights": llm_data,
        })

    results.sort(key=lambda x: x["overall_score"], reverse=True)

    return {
        "jd_id": db_jd.id,
        "job_title_id": db_job_title.id,
        "jd_title": normalized_title,
        "candidates": results,
    }


# ─── SESSIONS ────────────────────────────────────────────────────────────────

@app.get("/api/sessions/{jd_id}/candidates")
def get_candidates(jd_id: int, db: Session = Depends(get_db)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Session not found.")

    candidates = (
        db.query(Candidate)
        .filter(Candidate.jd_id == jd_id)
        .order_by(Candidate.overall_score.desc())
        .all()
    )

    return {
        "jd_id": jd_id,
        "jd_title": jd.title,
        "candidates": [
            {
                "id": c.id,
                "candidate_name": c.name,
                "overall_score": c.overall_score,
                "breakdown": c.score_breakdown,
                "matched_skills": c.matched_skills,
                "missing_skills": c.missing_skills,
                "jd_required_skills": c.jd_required_skills,
                "llm_insights": c.llm_insights,
            }
            for c in candidates
        ],
        "jd_text": jd.text,
    }


@app.put("/api/sessions/{session_id}")
async def edit_session(
    session_id: int,
    jd_text: Optional[str] = Form(None),
    jd_file: Optional[UploadFile] = File(None),
    resumes: list[UploadFile] = File([]),
    db: Session = Depends(get_db),
):
    jd = db.query(JobDescription).filter(JobDescription.id == session_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Session not found.")

    new_jd_content = None
    if jd_file and jd_file.filename:
        jd_bytes = await jd_file.read()
        new_jd_content = extract_text_from_file(jd_bytes, jd_file.filename)
    elif jd_text:
        new_jd_content = extract_text_from_plain(jd_text)
    
    jd_changed = new_jd_content and new_jd_content.strip() != jd.text.strip()
    
    jd_required_skills = None

    if jd_changed:
        jd.text = new_jd_content.strip()
        jd_required_skills = extract_jd_skills(jd.text)
        if not jd_required_skills:
            jd_required_skills = extract_jd_required_skills(jd.text)
        
        # Rescore existing candidates
        existing_candidates = db.query(Candidate).filter(Candidate.jd_id == session_id).all()
        for c in existing_candidates:
            if not c.resume_text:
                continue
            
            # Semantic matching with LLM
            llm_match_result = extract_and_match_resume_skills(c.resume_text, jd_required_skills)
            matched_skills = llm_match_result.get("matched_skills")
            missing_skills = llm_match_result.get("missing_skills")

            # run scoring pipeline
            score_result = score_candidate(
                resume_text=c.resume_text,
                jd_text=jd.text,
                candidate_name=c.name,
                jd_required_skills=jd_required_skills,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
            )

            # run LLM insights
            llm_data = generate_interview_insights(
                c.resume_text, jd.text, score_result["missing_skills"]
            )

            c.overall_score = score_result["overall_score"]
            c.score_breakdown = score_result["breakdown"]
            c.matched_skills = score_result["matched_skills"]
            c.missing_skills = score_result["missing_skills"]
            c.jd_required_skills = score_result["jd_required_skills"]
            # Only overwrite insights if LLM actually returned data;
            # otherwise keep the existing insights so the UI never goes blank.
            if llm_data is not None:
                c.llm_insights = llm_data
            
            # Force SQLAlchemy to detect changes in JSON columns
            flag_modified(c, "score_breakdown")
            flag_modified(c, "matched_skills")
            flag_modified(c, "missing_skills")
            flag_modified(c, "jd_required_skills")
            if llm_data is not None:
                flag_modified(c, "llm_insights")

        db.commit()

    # Process new resumes
    if resumes:
        if not jd_required_skills:
            jd_required_skills = extract_jd_skills(jd.text)
            if not jd_required_skills:
                jd_required_skills = extract_jd_required_skills(jd.text)
        
        for resume_file in resumes:
            resume_bytes = await resume_file.read()

            try:
                resume_text = extract_text_from_file(resume_bytes, resume_file.filename)
            except ValueError:
                continue

            if not resume_text.strip():
                continue

            def _extract_name_from_text(raw_text: str, fallback_filename: str) -> str:
                for line in raw_text.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    alpha_ratio = sum(c.isalpha() or c in " .-" for c in line) / len(line)
                    if len(line) <= 60 and alpha_ratio >= 0.85 and len(line.split()) <= 6:
                        return line.title()
                    break
                return os.path.splitext(fallback_filename)[0].replace("_", " ").title()

            raw_text = extract_raw_text_for_name(resume_bytes, resume_file.filename)
            name = _extract_name_from_text(raw_text, resume_file.filename)

            llm_match_result = extract_and_match_resume_skills(resume_text, jd_required_skills)
            matched_skills = llm_match_result.get("matched_skills")
            missing_skills = llm_match_result.get("missing_skills")

            score_result = score_candidate(
                resume_text=resume_text,
                jd_text=jd.text,
                candidate_name=name,
                jd_required_skills=jd_required_skills,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
            )

            llm_data = generate_interview_insights(
                resume_text, jd.text, score_result["missing_skills"]
            )

            db_candidate = Candidate(
                jd_id=jd.id,
                name=name,
                filename=resume_file.filename,
                resume_text=resume_text,
                overall_score=score_result["overall_score"],
                score_breakdown=score_result["breakdown"],
                matched_skills=score_result["matched_skills"],
                missing_skills=score_result["missing_skills"],
                jd_required_skills=score_result["jd_required_skills"],
                llm_insights=llm_data,
            )
            db.add(db_candidate)
        
        db.commit()

    return {"status": "ok", "message": "Session updated successfully"}


@app.delete("/api/sessions/{session_id}/candidates/{candidate_id}")
def delete_candidate(session_id: int, candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.jd_id == session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found in this session.")
    
    db.delete(candidate)
    db.commit()
    return {"status": "ok"}
