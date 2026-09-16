# CVera — AI-Powered Resume Analyzer

> **GLS Nexus Hackathon 2026 Submission**
> 
> **Live Demo:** [https://resume-analyzer-mauve-five.vercel.app/](https://resume-analyzer-mauve-five.vercel.app/)

CVera is an intelligent resume screening and candidate ranking platform that helps recruiters hire smarter using AI. Upload a Job Description and multiple resumes — CVera extracts skills, scores candidates, generates AI interview questions, and presents everything in a beautiful dashboard.

---

## Features

- **AI Skill Extraction** — Gemini API extracts only the technical skills from both JD and resumes (no soft skills, no education noise)
- **Semantic Skill Matching** — Ecosystem-aware matching (e.g., Next.js counts for ReactJS, Django counts for Python)
- **Multi-Resume Scoring** — Candidates scored across 4 dimensions: Skill Match (50%), Semantic Similarity (25%), Experience (15%), Education (10%)
- **AI Interview Questions** — Gemini generates tailored technical, project, and skill-gap questions per candidate
- **Job Title Hierarchy** — Organize sessions under job titles; create multiple analysis sessions per role
- **Edit Sessions** — Update JD and re-score all existing candidates automatically
- **Past Sessions** — Browse all previous analyses by job title
- **AI Insights Dashboard** — View interview questions across all sessions
- **Candidate Profiles** — Detailed breakdown of every candidate's scores, matched/missing skills

---

## Technologies Used

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| Axios | HTTP client |
| React Dropzone | File upload |
| Lucide React | Icons |
| Vanilla CSS | Styling (glassmorphism, animations) |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | REST API framework |
| SQLAlchemy | ORM |
| PostgreSQL / MySQL | Database (pg8000/pymysql) |
| PyMuPDF (fitz) | PDF text extraction |
| python-docx | DOCX text extraction |
| scikit-learn | TF-IDF Semantic similarity scoring |
| Google Gemini API | Skill extraction & interview questions |
| Python-dotenv | Environment configuration |

---

## Project Structure

```
resume-analyzer/
├── backend/
│   ├── main.py            # FastAPI app & all API endpoints
│   ├── models.py          # SQLAlchemy ORM models
│   ├── database.py        # DB connection & session
│   ├── llm.py             # Gemini API integration
│   ├── scorer.py          # Candidate scoring pipeline
│   ├── text_processor.py  # Skill extraction & similarity
│   ├── resume_parser.py   # PDF/DOCX/TXT text extraction
│   ├── skills.json        # Skill keyword reference list
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, Analyze, Results, Sessions, Insights
│   │   ├── components/    # Sidebar, shared components
│   │   ├── App.jsx        # Root app & routing
│   │   └── index.css      # Global styles & design system
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

##  Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- A [Google Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone the Repository
```bash
git clone https://github.com/shahvidhi-21/resume-analyzer.git
cd resume-analyzer
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in your MySQL credentials and Gemini API key
```

**.env file:**
```
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=resume_analyzer
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Database Setup
Create the MySQL database (tables are created automatically on first run):
```sql
CREATE DATABASE resume_analyzer;
```

### 4. Start the Backend
```bash
uvicorn main:app --reload --port 8000
```
Backend runs at: `http://localhost:8000`

### 5. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/job-titles` | All job titles with session counts |
| GET | `/api/job-titles/search?q=` | Autocomplete job title search |
| GET | `/api/job-titles/{id}/sessions` | Sessions under a job title |
| POST | `/api/analyze` | Run new analysis (JD + resumes) |
| GET | `/api/sessions/{id}/candidates` | Get candidates for a session |
| PUT | `/api/sessions/{id}` | Edit session (update JD, add resumes) |
| DELETE | `/api/sessions/{id}/candidates/{cid}` | Remove a candidate |

---

##  How It Works

1. **Upload JD** — Recruiter pastes or uploads a Job Description (PDF/DOCX/TXT)
2. **Upload Resumes** — Upload one or more candidate resumes
3. **AI Extraction** — Gemini API extracts required technical skills from the JD
4. **Scoring** — Each resume is scored against the JD across 4 dimensions
5. **Semantic Matching** — Gemini API matches resume skills to JD requirements with ecosystem awareness
6. **Interview Questions** — Gemini generates tailored questions per candidate
7. **Results** — Candidates are ranked and displayed with full breakdowns

