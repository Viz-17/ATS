from pydantic import BaseModel
from typing import List, Optional, Any

# --- Request Schemas ---

class JobDescriptionRequest(BaseModel):
    role_title: str
    jd_text: str

class SubmissionRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    university: Optional[str] = None
    assessment_id: int
    answers: List[Any] # List of answers (code or text)

class ResumeUploadRequest(BaseModel):
    name: Optional[str] = None
    email: str
    university: Optional[str] = None
    resume_text: str # For hackathon, we'll paste text or basic upload

class StageUpdate(BaseModel):
    email: str
    stage: int
    score: int
    feedback: str

class CandidateSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    university: str

class CandidateLoginRequest(BaseModel):
    email: str
    password: str

class SelectJobRequest(BaseModel):
    email: str
    assessment_id: int

class DisqualifyRequest(BaseModel):
    email: str
    assessment_id: int
    reason: str


# --- Response Schemas ---

class QuestionSchema(BaseModel):
    id: Any
    text: str
    type: str  # "code", "mcq", "subjective"
    difficulty: str # "easy", "medium", "hard"
    keywords: List[str] = []

class AssessmentResponse(BaseModel):
    role: str
    suggested_skills: List[str]
    questions: List[QuestionSchema]

class StageEvaluationRequest(BaseModel):
    email: str
    questions: List[dict] # Full question objects
    answers: List[str] # Candidate answers
class ComparisonRequest(BaseModel):
    items: List[int] # List of Candidate IDs (using 'items' as in frontend if necessary, or specific key)
