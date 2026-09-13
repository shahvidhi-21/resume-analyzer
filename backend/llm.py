import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(override=True)


def call_llm(prompt: str) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        print("Warning: GEMINI_API_KEY is not set.")
        return None

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.6-flash",
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
