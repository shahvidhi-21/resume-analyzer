from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class JobTitle(Base):
    """Represents a unique job role (e.g., 'Full Stack Developer').
    Multiple sessions (JobDescription) can exist under one JobTitle."""
    __tablename__ = "job_titles"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions   = relationship("JobDescription", back_populates="job_title", cascade="all, delete-orphan")


class JobDescription(Base):
    """Represents a single analysis session under a JobTitle.
    Each session has its own JD text and set of candidates."""
    __tablename__ = "job_descriptions"

    id            = Column(Integer, primary_key=True, index=True)
    job_title_id  = Column(Integer, ForeignKey("job_titles.id"), nullable=True)
    title         = Column(String(255), default="Untitled JD")  # kept for backward compat
    text          = Column(Text, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    job_title  = relationship("JobTitle", back_populates="sessions")
    candidates = relationship("Candidate", back_populates="job_description", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id            = Column(Integer, primary_key=True, index=True)
    jd_id         = Column(Integer, ForeignKey("job_descriptions.id"), nullable=False)
    name          = Column(String(255), nullable=False)
    filename      = Column(String(500))
    resume_text   = Column(Text, nullable=True)
    overall_score = Column(Float, nullable=False)

    # JSON columns store Python dicts/lists directly in MySQL
    score_breakdown    = Column(JSON)
    matched_skills     = Column(JSON)
    missing_skills     = Column(JSON)
    jd_required_skills = Column(JSON)
    llm_insights       = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job_description = relationship("JobDescription", back_populates="candidates")
