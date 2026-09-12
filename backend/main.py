from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import os

from database import engine, get_db, Base
from models import JobDescription, Candidate
from resume_parser import extract_text_from_file, extract_text_from_plain
from scorer import score_candidate
from text_processor import extract_jd_required_skills
from llm import generate_interview_insights

# creates all tables in MySQL on startup if they don't already exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Resume Analyzer API is running"}


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

    # extract JD required skills once so we don't repeat this for every resume
    jd_required_skills = extract_jd_required_skills(jd_content)

    # save JD to DB
    db_jd = JobDescription(title=jd_title, text=jd_content)
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

        # derive candidate name from filename 
        name = os.path.splitext(resume_file.filename)[0].replace("_", " ").title()

        # run scoring pipeline
        score_result = score_candidate(
            resume_text=resume_text,
            jd_text=jd_content,
            candidate_name=name,
            jd_required_skills=jd_required_skills,
        )

        # run LLM insights - returns None if LLM not configured, that's fine
        llm_data = generate_interview_insights(
            resume_text, jd_content, score_result["missing_skills"]
        )

        # save candidate result to DB
        db_candidate = Candidate(
            jd_id=db_jd.id,
            name=name,
            filename=resume_file.filename,
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

    # sort by score before returning
    results.sort(key=lambda x: x["overall_score"], reverse=True)

    return {
        "jd_id": db_jd.id,
        "jd_title": db_jd.title,
        "candidates": results,
    }


@app.get("/api/sessions/{jd_id}/candidates")
def get_candidates(jd_id: int, db: Session = Depends(get_db)):
    # returns all candidates for a given JD session, sorted by score
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="JD session not found.")

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
                "name": c.name,
                "overall_score": c.overall_score,
                "breakdown": c.score_breakdown,
                "matched_skills": c.matched_skills,
                "missing_skills": c.missing_skills,
                "jd_required_skills": c.jd_required_skills,
                "llm_insights": c.llm_insights,
            }
            for c in candidates
        ],
    }
