import json


def call_llm(prompt: str) -> str | None:
    # placeholder - wire up an actual API key here later
    # return None for now so the app works without an LLM
    # example: swap this out with a Gemini/OpenAI call
    return None


def generate_interview_insights(
    resume_text: str,
    jd_text: str,
    missing_skills: list[str]
) -> dict | None:
    # builds a prompt asking the LLM to:
    # 1. find quantifiable claims in the resume and generate verification questions
    # 2. generate 3 interview questions (technical, project-based, skill-gap)
    prompt = f"""
You are a technical recruiter assistant. Given the resume and job description below, do two things:

1. Find up to 2 quantifiable claims in the resume (e.g. "improved accuracy by 95%")
   and write one verification question for each.

2. Write 3 interview questions:
   - One TECHNICAL question based on the candidate's matched skills.
   - One PROJECT question based on their past work.
   - One SKILL-GAP question targeting these missing skills: {', '.join(missing_skills[:5])}.

Resume:
{resume_text[:3000]}

Job Description:
{jd_text[:2000]}

Respond ONLY as valid JSON in this exact format:
{{
  "claim_questions": [
    {{"claim": "...", "question": "..."}}
  ],
  "interview_questions": {{
    "technical": "...",
    "project": "...",
    "skill_gap": "..."
  }}
}}
"""
    try:
        response = call_llm(prompt)
        if response is None:
            return None
        return json.loads(response)
    except Exception:
        # if LLM fails or returns bad JSON, silently return None
        # the rest of the app must never crash because of this
        return None
