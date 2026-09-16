import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(override=True)

# Use gemini-3.6-flash (the current recommended model for this API key)
LLM_MODEL = "gemini-3.6-flash"


def call_llm(prompt: str) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        print("Warning: GEMINI_API_KEY is not set.")
        return None

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "claim_questions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "claim": {"type": "string"},
                                    "question": {"type": "string"}
                                },
                                "required": ["claim", "question"]
                            }
                        },
                        "interview_questions": {
                            "type": "object",
                            "properties": {
                                "technical": {"type": "string"},
                                "project": {"type": "string"},
                                "skill_gap": {"type": "string"}
                            },
                            "required": [
                                "technical",
                                "project",
                                "skill_gap"
                            ]
                        }
                    },
                    "required": [
                        "claim_questions",
                        "interview_questions"
                    ]
                }
            )
        )

        return response.text

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None


def generate_interview_insights(
    resume_text: str,
    jd_text: str,
    missing_skills: list[str]
) -> dict | None:

    missing = ", ".join(missing_skills[:5]) if missing_skills else "None"

    prompt = f"""
You are a technical recruiter assistant analyzing a candidate
for a job position.

Perform the following tasks:

1. Find up to 2 QUANTIFIABLE CLAIMS from the resume.
   Examples:
   - "Improved accuracy by 95%"
   - "Reduced processing time by 40%"
   - "Handled 10,000+ records"

   For each claim, generate ONE verification interview question.

2. Generate exactly 3 interview questions:
   - TECHNICAL:
     Based on the candidate's strongest skills that match the JD.
   - PROJECT:
     Based on a project mentioned in the resume.
   - SKILL-GAP:
     Target one or more of the missing skills listed below.

Missing skills:
{missing}

Rules:
- Questions must be specific to this candidate.
- Do not invent projects, skills, technologies, or achievements.
- Do not ask generic questions such as "Tell me about yourself."
- Keep questions suitable for a technical interview.
- If there are no quantifiable claims, return an empty claim_questions array.

RESUME:
{resume_text[:5000]}

JOB DESCRIPTION:
{jd_text[:3000]}
"""

    try:
        response = call_llm(prompt)

        if response is None:
            return None

        return json.loads(response)

    except json.JSONDecodeError as e:
        print(f"Invalid JSON returned by Gemini: {e}")
        return None

    except Exception as e:
        print(f"Interview insight generation failed: {e}")
        return None


def extract_jd_skills(jd_text: str) -> list[str]:
    prompt = f"""
You are an expert technical recruiter. Analyze the following Job Description (JD).

Your task: Extract ONLY the technical skills, tools, technologies, frameworks, programming languages, libraries, platforms, databases, and development methodologies explicitly required by this job.

STRICT RULES - DO NOT include any of the following:
- Education qualifications (e.g., "B.Tech", "BE", "MCA", "Degree in Computer Science", "Bachelor's degree")
- Years of experience requirements (e.g., "2+ years of experience")
- Soft skills (e.g., "communication", "teamwork", "problem-solving", "leadership")
- Generic phrases (e.g., "knowledge of", "familiarity with", "understanding of")
- Job responsibilities or descriptions
- Company culture or HR language

ONLY include concrete technical items such as: Python, Java, React, Node.js, MySQL, AWS, Docker, REST APIs, Git, Agile/Scrum, etc.

Return a flat JSON array of short, clean skill strings (1-4 words each). No sentences.

JOB DESCRIPTION:
{jd_text[:5000]}
"""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
            return []
        
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "array",
                    "items": {"type": "string"}
                }
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"JD skills extraction failed: {e}")
        return []


def extract_and_match_resume_skills(resume_text: str, jd_skills: list[str]) -> dict:
    jd_skills_str = ", ".join(jd_skills)
    prompt = f"""
You are an expert technical recruiter and resume analyzer.

I will provide you with a candidate's RESUME and a list of REQUIRED TECHNICAL SKILLS from the Job Description.

Your task:
1. Identify the technical skills in the resume (programming languages, frameworks, tools, libraries, platforms, databases, methodologies).
2. Cross-reference ONLY the REQUIRED SKILLS list against what the candidate knows.
3. SEMANTIC ECOSYSTEM RULE: If the JD requires a broad language/framework (e.g., "ReactJS", "Python") and the resume contains a specific related framework from the same ecosystem (e.g., "Next.js" for ReactJS, "Django" for Python), count the required skill as MATCHED.
4. STRICT MATCHING RULE: Do NOT hallucinate matches. A skill is only MATCHED if it is explicitly mentioned OR if there is undeniable evidence of equivalent hands-on experience. For example, mentioning "AI" or "Gemini API" does NOT mean the candidate has "Machine Learning", "Deep Learning", or "NLP" model-training skills. Those are distinct.
5. Split the REQUIRED SKILLS into exactly two arrays:
   - matched_skills: required skills that are present or semantically covered in the resume
   - missing_skills: required skills with no evidence in the resume

STRICT RULES:
- Only evaluate skills from the REQUIRED SKILLS list — do not add new skills to either array.
- Do NOT flag education degrees (BE, B.Tech, MCA, etc.) as matched or missing — ignore them entirely.
- Do NOT include soft skills.
- Do not over-generalize broad terms (e.g., knowing "AI APIs" does not mean knowing "Machine Learning").

REQUIRED SKILLS:
{jd_skills_str}

RESUME:
{resume_text[:5000]}
"""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
            return {"matched_skills": [], "missing_skills": jd_skills}
        
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "matched_skills": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "missing_skills": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["matched_skills", "missing_skills"]
                }
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Resume skills extraction/matching failed: {e}")
        return {"matched_skills": [], "missing_skills": jd_skills}
