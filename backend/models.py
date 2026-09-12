from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), default="Untitled JD")
    text       = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # one JD can have many candidates
    candidates = relationship("Candidate", back_populates="job_description")


class Candidate(Base):
    __tablename__ = "candidates"

    id            = Column(Integer, primary_key=True, index=True)
    jd_id         = Column(Integer, ForeignKey("job_descriptions.id"), nullable=False)
    name          = Column(String(255), nullable=False)
    filename      = Column(String(500))
    overall_score = Column(Float, nullable=False)

    # JSON columns store Python dicts/lists directly in MySQL
    score_breakdown    = Column(JSON)
    matched_skills     = Column(JSON)
    missing_skills     = Column(JSON)
    jd_required_skills = Column(JSON)
    llm_insights       = Column(JSON, nullable=True)  # stretch feature, can be null

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job_description = relationship("JobDescription", back_populates="candidates")
