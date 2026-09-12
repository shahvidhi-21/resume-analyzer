from text_processor import (
    extract_jd_required_skills,
    match_resume_skills,
    compute_semantic_similarity,
    compute_experience_score,
    compute_education_score,
)


def score_candidate(
    resume_text: str,
    jd_text: str,
    candidate_name: str,
    jd_required_skills: list[str] = None,
) -> dict:
    # jd_required_skills is extracted once per JD and passed in
    # so we don't re-run extraction for every resume uploaded
    if jd_required_skills is None:
        jd_required_skills = extract_jd_required_skills(jd_text)

    # skill match — 50% of total score
    matched_skills, missing_skills = match_resume_skills(resume_text, jd_required_skills)
    skill_ratio = len(matched_skills) / len(jd_required_skills) if jd_required_skills else 0.0
    skill_score = round(skill_ratio * 50, 1)

    # semantic similarity — 25%
    sim_raw = compute_semantic_similarity(resume_text, jd_text)
    semantic_score = round(sim_raw * 25, 1)

    # experience heuristic — 15%
    exp_result = compute_experience_score(resume_text)
    experience_score = exp_result["score"]

    # education heuristic — 10%
    edu_result = compute_education_score(resume_text)
    education_score = edu_result["score"]

    overall = round(skill_score + semantic_score + experience_score + education_score, 1)

    return {
        "candidate_name": candidate_name,
        "overall_score": overall,
        "breakdown": {
            "skill_match":         {"score": skill_score,      "max": 50},
            "semantic_similarity": {"score": semantic_score,   "max": 25},
            "experience":          {"score": experience_score, "max": 15},
            "education":           {"score": education_score,  "max": 10},
        },
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "jd_required_skills": jd_required_skills,
    }
