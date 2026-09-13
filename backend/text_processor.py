import re
import json
import os
import datetime
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

_model = SentenceTransformer("all-MiniLM-L6-v2")

# skills.json is just a helper list for common terms
_skills_path = os.path.join(os.path.dirname(__file__), "skills.json")
with open(_skills_path, "r") as f:
    _data = json.load(f)
    SKILLS_HELPER_LIST = set(_data.get("skills", []))
    EXTRA_ALLOWED_TERMS = set(_data.get("extra_allowed_terms", []))
    NOISE_TERMS = set(_data.get("noise_terms", []))

NOISE_PATTERNS = [
    r'^[a-z]+-(based|year|time|site)$',   # ahmedabad-based, final-year, full-time, on-site
    r'^[a-z]-\d{2,}$',                     # b-606, address/unit codes
]

SKILL_ALIASES = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "bi": "business intelligence",
    "nlp": "natural language processing",
    "cv": "computer vision",
    "aws": "amazon web services",
    "gcp": "google cloud",
    "llm": "large language models",
    "rag": "retrieval augmented generation",
    "react.js": "react",
    "node.js": "node",
    "vue.js": "vue",
    "js": "javascript",
    "ts": "typescript"
}


def is_valid_skill(term: str) -> bool:
    # filters out noise picked up during JD parsing (HR jargon, locations, sentence fragments)
    term = term.lower().strip()
    if not term or term in NOISE_TERMS:
        return False
    for pat in NOISE_PATTERNS:
        if re.match(pat, term):
            return False
    # a short, single-word term must be a recognized skill, not just any capitalized/acronym match
    if " " not in term and "-" not in term and "/" not in term:
        if len(term) <= 4 and term not in SKILLS_HELPER_LIST and term not in EXTRA_ALLOWED_TERMS:
            return False
    # a multi-word fragment must contain at least one recognizable skill word
    if " " in term and term not in SKILLS_HELPER_LIST:
        words = term.split()
        if not any(w in SKILLS_HELPER_LIST or w in EXTRA_ALLOWED_TERMS for w in words):
            return False
    return True


def extract_jd_required_skills(jd_text: str) -> list[str]:
    # builds the required skills for this JD instead of relying on a fixed list
    skills = set()
    jd_lower = jd_text.lower()

    # check against known skills list
    for skill in SKILLS_HELPER_LIST:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, jd_lower):
            skills.add(skill.lower())

    # catch phrases like "experience with X" / "knowledge of X"
    context_patterns = [
        r'experience (?:with|in)\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
        r'knowledge of\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
        r'proficient (?:in|with)\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
        r'familiarity with\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
        r'expertise (?:in|with)\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
        r'hands.on (?:experience )?(?:with|in)?\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
        r'working knowledge of\s+([\w][\w\.\+\#\-/ ]{1,25}?)(?:\s*[,;\n\.]|$)',
    ]
    for pat in context_patterns:
        for match in re.finditer(pat, jd_text, re.IGNORECASE):
            term = match.group(1).strip().lower()
            if len(term) >= 2:
                skills.add(term)

    # catch tech-looking terms like Next.js, GPT-4, AWS, C++
    tech_pattern = r'\b([A-Z][a-zA-Z0-9]*(?:[.\-+#][a-zA-Z0-9]+)+|[A-Z]{2,}[0-9]*)\b'
    for match in re.finditer(tech_pattern, jd_text):
        term = match.group(1).strip()
        if len(term) >= 2:
            skills.add(term.lower())

    # pull skills from a Requirements/Skills section if there is one
    section_pattern = (
        r'(?:required skills?|requirements?|technical skills?|qualifications?)'
        r'[:\s]*\n([\s\S]{0,800}?)(?:\n\n|\Z)'
    )
    section_match = re.search(section_pattern, jd_text, re.IGNORECASE)
    if section_match:
        section_text = section_match.group(1)
        items = re.split(r'[•\-\*,\n]+', section_text)
        for item in items:
            item = item.strip().lower()
            if 2 <= len(item) <= 40:
                skills.add(item)

    # final cross-check: drop anything that doesn't look like a real skill
    valid_skills = set()
    for s in skills:
        if is_valid_skill(s):
            canonical = SKILL_ALIASES.get(s, s)
            valid_skills.add(canonical)
    return sorted(list(valid_skills))


def match_resume_skills(
    resume_text: str, jd_required_skills: list[str]
) -> tuple[list, list]:
    # checks which of the JD's required skills show up in the resume
    resume_lower = resume_text.lower()
    matched = []
    missing = []

    for skill in jd_required_skills:
        skill_lower = skill.lower().strip()
        if not skill_lower:
            continue
        # Check the canonical skill AND any aliases that map to it
        variations = [skill_lower]
        for alias, canonical in SKILL_ALIASES.items():
            if canonical == skill_lower:
                variations.append(alias)
                
        found = False
        for var in variations:
            pattern = r'\b' + re.escape(var) + r'\b'
            if re.search(pattern, resume_lower):
                found = True
                break
                
            # safer loose match for single-word skills
            if not found and len(var) >= 5 and " " not in var:
                if var in resume_lower:
                    found = True
                    break

        if found:
            matched.append(skill)
        else:
            missing.append(skill)

    return matched, missing


def compute_semantic_similarity(text1: str, text2: str) -> float:
    # meaning-level match between resume and JD, not just keywords
    embeddings = _model.encode([text1, text2])
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    return float(score)


def compute_experience_score(text: str) -> dict:
    # sums year ranges found in the resume (e.g. 2019-2023) into a rough years-of-experience score
    year_pattern = r'(20\d{2}|19\d{2})\s*[–\-—to]+\s*(20\d{2}|19\d{2}|[Pp]resent|[Cc]urrent)'
    matches = re.findall(year_pattern, text)
    current_year = datetime.datetime.now().year
    total_years = 0

    for start_str, end_str in matches:
        start = int(start_str)
        end = current_year if end_str.lower() in ("present", "current") else int(end_str)
        if end > start:
            total_years += (end - start)

    total_years = min(total_years, 20)
    if   total_years >= 8: score = 15
    elif total_years >= 5: score = 12
    elif total_years >= 3: score = 8
    elif total_years >= 1: score = 5
    else:                  score = 2

    return {"years_detected": total_years, "score": score, "max": 15}


def compute_education_score(text: str) -> dict:
    # keyword-based degree level check, PhD > Master's > Bachelor's > Diploma
    text_lower = text.lower()
    if any(kw in text_lower for kw in ["phd", "ph.d", "doctorate", "doctor of"]):
        score, level = 10, "PhD"
    elif any(kw in text_lower for kw in ["master", "m.s.", "m.sc", "mba", "m.tech", "m.e."]):
        score, level = 8, "Master's"
    elif any(kw in text_lower for kw in ["bachelor", "b.s.", "b.sc", "b.tech", "b.e.", "undergraduate"]):
        score, level = 6, "Bachelor's"
    elif any(kw in text_lower for kw in ["diploma", "associate", "hnd"]):
        score, level = 4, "Diploma/Associate"
    else:
        score, level = 2, "Not detected"

    return {"level": level, "score": score, "max": 10}