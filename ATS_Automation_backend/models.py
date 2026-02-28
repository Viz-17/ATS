from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    role_title = Column(String, index=True)
    job_description = Column(Text)
    # Storing skills and questions as JSON for simplicity in SQLite
    # (In Prod, you might want separate tables for Questions)
    suggested_skills = Column(JSON)
    questions = Column(JSON)

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    university = Column(String)
    assessment_id = Column(Integer, nullable=True)

    # Relationship to Applications
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    assessment_id = Column(Integer, ForeignKey("assessments.id"))

    status = Column(String, default="Incomplete") # Incomplete, Shortlisted, Rejected, Hired
    current_stage = Column(Integer, default=0)
    stage_scores = Column(JSON, default={})
    resume_text = Column(Text, nullable=True)

    candidate = relationship("Candidate", back_populates="applications")
    assessment = relationship("Assessment")
    submissions = relationship("Submission", back_populates="application", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id")) # Link to Application

    answers = Column(JSON)
    score = Column(Integer)
    feedback = Column(Text)

    application = relationship("Application", back_populates="submissions")
