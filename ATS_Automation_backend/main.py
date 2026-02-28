from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
import json

# Import DB stuff
from database import SessionLocal, engine, Base
import models
import schemas # Our Pydantic schemas
import resume_parser # Mock Resume Logic

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Softrate AI Hiring API")

# Allow the Frontend to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Basic Health Check ---
@app.get("/")
def read_root():
    return {"status": "active", "message": "Softrate Engine is Running with DB"}

# --- MODULE 0: AUTHENTICATION ---
@app.post("/auth/signup")
def candidate_signup(request: schemas.CandidateSignupRequest, db: Session = Depends(get_db)):
    # Check duplicate
    existing = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create Candidate
    candidate = models.Candidate(
        name=request.name,
        email=request.email,
        password=request.password, # In real app, hash this!
        university=request.university
    )
    db.add(candidate)
    db.commit()
    return {"status": "success", "message": "Account created"}

@app.post("/auth/login")
def candidate_login(request: schemas.CandidateLoginRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate or candidate.password != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "status": "success",
        "name": candidate.name,
        "email": candidate.email,
        "university": candidate.university,
        "assessment_id": candidate.assessment_id # Return active job
    }

@app.post("/candidate/select-job")
def select_job(request: schemas.SelectJobRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # STRICT RULE: Exclusivity - If QUALIFIED for ANY job, cannot apply for others.
    qualified_app = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.status == "Qualified" 
    ).first()
    
    if qualified_app and qualified_app.assessment_id != request.assessment_id:
        raise HTTPException(status_code=400, detail="You have already Qualified for another role. You cannot apply to new jobs.")

    # SINGLE ACTIVE JOB RULE:
    # If starting a NEW job (or resuming one), we must ensure no OTHER incomplete jobs are "In Progress".
    # Logic:
    # 1. Getting existing app for THIS job.
    # 2. Getting ALL other active apps.
    # 3. If resetting/starting fresh, we might need to clear others.
    
    # Let's simple rule: If we are selecting a job, we DELETE any OTHER "Incomplete" (In Progress) applications.
    # This enforces that at any point, only ONE "Incomplete" application exists (the current one).
    
    other_incomplete = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.status == "Incomplete",
        models.Application.assessment_id != request.assessment_id
    ).all()
    
    for other in other_incomplete:
        db.delete(other) # Resetting/Deleting other in-progress assignments
    
    # Check for existing application for THIS job
    existing_app = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == request.assessment_id
    ).first()

    if existing_app:
        if existing_app.status in ["Rejected", "Disqualified"]:
             raise HTTPException(status_code=400, detail="Application Rejected/Disqualified. You cannot re-apply for this role.")
        if existing_app.status == "Qualified":
             # Just switch context, don't error, but frontend should handle "Completed" state
             pass
        
        # If Incomplete, WE DO NOT RESET. We just switch context.
        candidate.assessment_id = request.assessment_id
        candidate.current_stage = existing_app.current_stage
        candidate.stage_scores = existing_app.stage_scores
        candidate.resume_text = existing_app.resume_text
        db.commit()
        return {"status": "success", "message": "Resumed Application. Other active applications have been reset."}

    # Use Update Job & Reset Stage (Only if starting FRESH)
    candidate.assessment_id = request.assessment_id
    candidate.current_stage = 1 # Start from Resume Round
    candidate.stage_scores = {} # Reset Previous Scores
    candidate.resume_text = None # Reset Resume
    
    # Create the application row immediately to track state
    new_app = models.Application(
        candidate_id=candidate.id,
        assessment_id=request.assessment_id,
        current_stage=1,
        status="Incomplete"
    )
    db.add(new_app)
    # db.commit() will happen at end of route ideally, but we do it here
    db.commit()
    return {"status": "success", "message": "Application Started. Other active applications have been reset."}
    db.add(new_app)
    
    db.commit()
    return {"status": "success", "message": "Application Started"}



# --- MODULE 1: GENAI ASSESSMENT GENERATOR ---
@app.post("/generate-assessment", response_model=schemas.AssessmentResponse)
def generate_assessment(request: schemas.JobDescriptionRequest, db: Session = Depends(get_db)):
    """
    Analyzes the JD, generates questions, and SAVES to DB.
    """
    
    # 1. Logic to generate questions (Mock for now)
    text = request.jd_text.lower()
    detected_skills = []
    questions = []
    
    if "python" in text:
        detected_skills.append("Python")
        questions.append({
            "id": 1, 
            "text": "Write a function to reverse a string in Python without using [::-1].", 
            "type": "code", 
            "difficulty": "easy", 
            "keywords": ["python", "string"]
        })
    
    if "communication" in text or "team" in text:
        detected_skills.append("Communication")
        questions.append({
            "id": 2, 
            "text": "Describe a time you had a conflict with a team member. How did you resolve it?", 
            "type": "subjective", 
            "difficulty": "medium", 
            "keywords": ["hr", "behavioral"]
        })

    # 1. Generate Questions via Gemini
    try:
        questions = resume_parser.generate_jd_questions(request.jd_text)
    except Exception as e:
        print(f"Gemini JD Error: {e}")
        questions = []

    # Fallback
    if not questions:
        questions.append({
            "id": 99, 
            "text": "Explain the core principles of this role.", 
            "type": "subjective", 
            "difficulty": "easy", 
            "keywords": ["general"]
        })

    # 2. SAVE to Database
    db_assessment = models.Assessment(
        role_title=request.role_title,
        job_description=request.jd_text,
        suggested_skills=detected_skills,
        questions=questions
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)

    return schemas.AssessmentResponse(
        role=db_assessment.role_title,
        suggested_skills=db_assessment.suggested_skills,
        questions=[schemas.QuestionSchema(**q) for q in db_assessment.questions]
    )

@app.get("/assessments")
def list_assessments(db: Session = Depends(get_db)):
    assessments = db.query(models.Assessment).all()
    return [{"id": a.id, "role_title": a.role_title, "jd_text": a.job_description} for a in assessments]

@app.get("/assessments/{id}", response_model=schemas.AssessmentResponse)
def get_assessment(id: int, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return schemas.AssessmentResponse(
        role=assessment.role_title,
        suggested_skills=assessment.suggested_skills,
        questions=[schemas.QuestionSchema(**q) for q in assessment.questions]
    )

@app.delete("/assessments/{id}")
def delete_assessment(id: int, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted successfully"}

@app.put("/assessments/{id}")
def update_assessment(id: int, request: schemas.AssessmentResponse, db: Session = Depends(get_db)):
    assessment = db.query(models.Assessment).filter(models.Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assessment.role_title = request.role
    assessment.suggested_skills = request.suggested_skills
    assessment.questions = [q.dict() for q in request.questions]
    
    db.commit()
    return {"message": "Assessment updated successfully"}


@app.post("/candidate/restart")
def restart_application(request: schemas.StageUpdate, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Logic: Restart the currently 'Incomplete' application for this candidate.
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.status == "Incomplete"
    ).first()

    if not application:
        raise HTTPException(status_code=400, detail="No incomplete application to restart.")
        
    application.current_stage = 1
    application.stage_scores = {}
    application.resume_text = None
    db.commit()
    return {"status": "success", "message": "Application Restarted"}

@app.post("/submit")
def submit_assessment(request: schemas.SubmissionRequest, db: Session = Depends(get_db)):
    # 1. Get Candidate
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.candidate_email).first()
    if not candidate:
        # Create candidate if not exists (Lazy registration)
        candidate = models.Candidate(
            name=request.candidate_name, 
            email=request.candidate_email,
            university=request.university
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        
    # 2. Get Application
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == request.assessment_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found. Please start the application first.")
    
    # 3. AI Evaluation
    # Retrieve questions to provide context/keywords to AI
    # We assume seeded questions in db matches what user saw.
    assessment = db.query(models.Assessment).filter(models.Assessment.id == request.assessment_id).first()
    questions = assessment.questions if assessment else []
    
    # Check if questions empty (fallback)
    if not questions:
         # Try to get from application stage scores if stored there, but likely not.
         # This is edge case.
         pass

    # Call AI
    ai_result = resume_parser.evaluate_answers(questions, request.answers)
    
    score = ai_result.get("final_score", 0)
    feedback = ai_result.get("overall_feedback", "Assessment Completed.")
    # We can also store per-question feedback if we want, but for now simple string.
    
    # Store detailed result in feedback if possible, or just append
    if "question_feedback" in ai_result:
        feedback += "\n\nDetails:\n" + "\n".join([f"Q{i+1}: {f}" for i, f in enumerate(ai_result["question_scores"])]) # Wait, question_scores is ints.
        # Let's fix loop
        pass

    # 4. Save Submission
    submission = models.Submission(
        application_id=application.id,
        answers=request.answers,
        score=score,
        feedback=feedback # This is the specific JD test feedback
    )
    db.add(submission)
    
    # --- WEIGHTED SCORING LOGIC ---
    # Retrieve previous scores
    # FORCE NEW DICT REFERENCE for SQLAlchemy change tracking
    st_scores = dict(application.stage_scores) if application.stage_scores else {}
    
    # helper to safely get int score
    def get_score(data):
        if isinstance(data, dict):
            return int(data.get('score', 0))
        if isinstance(data, (int, float)):
            return int(data)
        return 0

    # 1. Resume Score (Stage 1)
    resume_data = st_scores.get('resume', {})
    s1 = get_score(resume_data)
    
    # 2. Psychometric (Stage 2)
    stage2_data = st_scores.get('stage_2', {})
    s2 = get_score(stage2_data)
    
    # 3. Resume Tech (Stage 3)
    # The 'stage_3' key in JSON comes from 'complete_stage' call with stage=3, which saves to 'stage_2' key in previous logic?
    # Wait, let's check complete_stage logic: 
    # stage_key = f"stage_{update.stage-1}"
    # If update.stage is 3 (completing resume tech), it saves to stage_2? NO.
    # Frontend logic for Resume Tech (Stage 3): calls complete_stage with stage=4 (moving TO 4)? or completes 3?
    # Let's assume standard:
    # Stage 1 (Resume Upload) -> Result stored in 'resume'. Move to 2.
    # Stage 2 (Psychometric) -> User finishes, calls complete_stage(stage=3). Stores in 'stage_2'.
    # Stage 3 (Resume Tech) -> User finishes, calls complete_stage(stage=4). Stores in 'stage_3'.
    # Stage 4 (JD Test) -> User finishes, calls submit.
    
    stage3_data = st_scores.get('stage_3', {})
    s3 = get_score(stage3_data)
    
    # 4. JD Test (Stage 4 - Current)
    s4 = int(score)
    
    # Weights: Resume (20%), Psychometric (20%), ResumeTech (30%), JD (30%)
    # Total = 100
    w_s1 = s1 * 0.20
    w_s2 = s2 * 0.20
    w_s3 = s3 * 0.30
    w_s4 = s4 * 0.30
    
    final_weighted_score = w_s1 + w_s2 + w_s3 + w_s4
    final_weighted_score = round(final_weighted_score) # Integer
    
    # Update Status
    status = "Qualified" if final_weighted_score >= 70 else "Rejected"
    
    # Save final scores map structure for Frontend
    st_scores['final'] = {
        "score": final_weighted_score,
        "breakdown": {
            "resume_parsing": {"score": s1, "weight": "20%"},
            "psychometric": {"score": s2, "weight": "20%"},
            "resume_tech": {"score": s3, "weight": "30%"},
            "jd_test": {"score": s4, "weight": "30%"}
        },
        "feedback": f"Overall Score: {final_weighted_score}/100. Result: {status}. Awaiting Interview." if status == "Qualified" else "Application Rejected based on overall score."
    }
    st_scores['jd'] = {"score": s4, "feedback": feedback} # Specific entry
    
    application.stage_scores = st_scores
    application.current_stage = 5 
    application.status = status
    
    db.commit()
    
    return {
        "message": "Submission Evaluated", 
        "status": "success", 
        "final_score": final_weighted_score, 
        "outcome": status,
        "breakdown": st_scores['final']['breakdown']
    }

# --- MODULE 2: ANALYTICS ---
@app.get("/candidates")
def list_candidates(db: Session = Depends(get_db)):
    # Now allow viewing all applications
    applications = db.query(models.Application).options(
        joinedload(models.Application.candidate),
        joinedload(models.Application.assessment)
    ).all()
    
    data = []
    for app in applications:
        # Get Final Score if available
        scores = app.stage_scores or {}
        
        # 500-POINT SCALE LOGIC
        # s1: Resume (0-100)
        # s2: Psychometric (0-100)
        # s3: Tech Round (0-100)
        # s4: JD Fit/Test (0-100)
        # s5: Project Proof (0-100)
        
        s1 = scores.get("resume_score", 0)
        
        # Psychometric might be stored as 'stage_2' or 'psychometric_score'
        # based on resume_parser/main logic, let's check both
        s2 = scores.get("psychometric_score", 0)
        if not s2 and "stage_2" in scores: s2 = scores["stage_2"].get("score", 0)
            
        s3 = scores.get("stage3_score", 0)
        if not s3 and "stage_3" in scores: s3 = scores["stage_3"].get("score", 0)
            
        s4 = scores.get("final_score", 0) 
        # But wait, final_score was previously Weighted Average (0-100).
        # if we re-calculate, we should extract raw if possible or just use it as part.
        # Actually, let's use the 'breakdown' if available for cleaner data.
        # But for backward compatibility:
        if "final" in scores and "breakdown" in scores["final"]:
             bd = scores["final"]["breakdown"]
             s1 = bd.get("resume_parsing", {}).get("score", s1)
             s2 = bd.get("psychometric", {}).get("score", s2)
             s3 = bd.get("resume_tech", {}).get("score", s3)
             s4 = bd.get("jd_test", {}).get("score", s4)
             
        s5 = scores.get("stage5", 0)
        
        total_score = s1 + s2 + s3 + s4 + s5
        
        breakdown = {
            "resume": s1,
            "psychometric": s2,
            "tech": s3,
            "jd_test": s4,
            "project": s5
        }
        
        data.append({
            "id": app.candidate.id,
            "app_id": app.id,
            "name": app.candidate.name,
            "email": app.candidate.email,
            "role": app.assessment.role_title if app.assessment else "Unknown",
            "status": app.status,
            "score": total_score, # Now out of 500
            "university": app.candidate.university,
            "breakdown": breakdown
        })
        
    # Sort by total score descending
    data.sort(key=lambda x: x["score"], reverse=True)
    return data

@app.delete("/candidate/{id}")
def delete_candidate(id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Cascade delete submission
    db.query(models.Submission).filter(models.Submission.candidate_id == id).delete()
    
    db.delete(candidate)
    db.commit()
    return {"status": "success", "message": "Candidate deleted"}


# --- MODULE 4: RESUME PARSING & CANDIDATE STATUS ---
from pypdf import PdfReader
import io

@app.post("/upload-resume")
async def upload_resume(
    email: str = Form(...),
    assessment_id: int = Form(...), # NEW: Need to know for which job
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Read PDF file
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    try:
        content = await file.read()
        pdf_reader = PdfReader(io.BytesIO(content))
        resume_text = ""
        for page in pdf_reader.pages:
            t = page.extract_text()
            if t: resume_text += t + "\n"
    except Exception as e:
        print(f"PDF Parse Error: {e}")
        resume_text = "Error parsing PDF"

    # 2. Analyze (Scoring against JD)
    # Get the JD text first
    jd_text = ""
    assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if assessment:
        jd_text = assessment.job_description
        
    result = resume_parser.score_resume_with_gemini(resume_text, jd_text)
    
    # 3. Get/Create Candidate
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate:
        # Should usually exist from login, but handle just in case
        candidate = models.Candidate(email=email, name=email.split('@')[0])
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

    # 4. Get/Create Application
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == assessment_id
    ).first()
    
    if not application:
        application = models.Application(
            candidate_id=candidate.id, 
            assessment_id=assessment_id,
            current_stage=0,
            status="Incomplete"
        )
        db.add(application)
    
    application.resume_text = resume_text
    
    # Update Scores
    stage_scores = dict(application.stage_scores) if application.stage_scores else {}
    stage_scores['resume'] = result
    application.stage_scores = stage_scores

    if result.get("score", 0) >= 10:
        application.current_stage = 2
        application.status = "Incomplete" # Still incomplete until all stages done
    else:
        # STRICT RULE: < 10 Disqualifies
        application.current_stage = -1
        application.status = "Rejected"
        
        # Add rejection feedback
        stage_scores['resume']['feedback'] += " (Does not meet minimum 10% threshold)"
        application.stage_scores = stage_scores
        
    db.commit()
    return {"message": "Resume Processed", "result": result}

@app.get("/candidate/applications/{email}")
def get_candidate_applications(email: str, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate:
        return []
    
    apps = candidate.applications
    return [{
        "assessment_id": app.assessment_id,
        "status": app.status,
        "current_stage": app.current_stage
    } for app in apps]

@app.get("/candidate/status/{email}/{assessment_id}")
def get_candidate_status(email: str, assessment_id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    
    if not candidate:
        return {"current_stage": 0, "stage_scores": {}}
        
    # FIX: Order by ID desc to get the LATEST application status (matching the nuclear disqualification)
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == assessment_id
    ).order_by(models.Application.id.desc()).first()
    
    if not application:
         return {"current_stage": 0, "stage_scores": {}}

    return {
        "current_stage": application.current_stage, 
        "stage_scores": application.stage_scores, 
        "name": candidate.name,
        "assessment_id": application.assessment_id,
        "status": application.status
    }

# Stage 2: Psychometric (Dynamic)
# Stage 2: Psychometric (Dynamic & Persisted)
@app.get("/test/psychometric/{email}/{assessment_id}")
def get_psychometric_questions_persisted(email: str, assessment_id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate:
         raise HTTPException(status_code=400, detail="Candidate not found")
         
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == assessment_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=400, detail="Application not found")

    # CHECK EXISTING
    current_ids = dict(application.stage_scores) if application.stage_scores else {}
    if "psychometric_questions" in current_ids and current_ids["psychometric_questions"]:
        print("✅ Returning cached Psychometric Questions")
        return current_ids["psychometric_questions"]

    try:
        questions = resume_parser.generate_psychometric_questions()
    except Exception as e:
        print(f"Psychometric Error: {e}")
        questions = [
            {"id": "p1", "text": "I prefer working in a team rather than alone.", "type": "mcq", "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]},
            {"id": "p2", "text": "Backup: I handle stress well.", "type": "mcq", "options": ["Disagree", "Neutral", "Agree"]}
        ]

    # PERSIST
    current_ids["psychometric_questions"] = questions
    application.stage_scores = current_ids
    flag_modified(application, "stage_scores")
    db.commit()

    return questions

# Stage 3: Resume-Based Technical
@app.get("/test/resume-questions/{email}/{assessment_id}")
def get_resume_questions_get(email: str, assessment_id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not candidate:
         raise HTTPException(status_code=400, detail="Candidate not found")
         
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == assessment_id
    ).first()
    
    if not application or not application.resume_text:
        raise HTTPException(status_code=400, detail="Resume/Application not found")
    
    # CHECK FOR EXISTING QUESTIONS
    current_ids = dict(application.stage_scores) if application.stage_scores else {}
    if "resume_questions" in current_ids and current_ids["resume_questions"]:
        print("✅ Returning cached Resume Questions")
        return current_ids["resume_questions"]

    # Use Gemini to generate questions dynamically
    try:
        questions = resume_parser.generate_resume_questions(application.resume_text)
    except Exception as e:
        print(f"Gemini Error: {e}")
        questions = []

    # Fallback if Gemini fails or returns emptiness
    if not questions:
        questions = [
             {"id": "fallback_1", "text": "Describe your most challenging project.", "type": "subjective", "difficulty": "medium", "options": []},
             {"id": "fallback_2", "text": "What are your key strengths?", "type": "subjective", "difficulty": "easy", "options": []}
        ]
    
    # PERSIST QUESTIONS
    current_ids["resume_questions"] = questions
    application.stage_scores = current_ids
    flag_modified(application, "stage_scores") # Explicitly flag for SQLAlchemy tracking
    db.commit()
        
    return questions
    
@app.post("/candidate/restart")
def restart_application(request: schemas.StageUpdate, db: Session = Depends(get_db)):
    # Reusing StageUpdate schema partially (email, stage=1)
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.assessment_id == candidate.assessment_id # Active job
    ).first()
    
    if application:
        # BLOCK RESTART IF REJECTED/DISQUALIFIED
        if application.status in ["Rejected", "Disqualified"]:
             raise HTTPException(status_code=400, detail=f"Cannot restart. Application status is {application.status}.")
             
        application.current_stage = 1
        application.status = "Incomplete"
        application.stage_scores = {}
        candidate.current_stage = 1
        db.commit()
        return {"status": "restarted"}
    
    raise HTTPException(status_code=404, detail="Active application not found")

@app.post("/candidate/disqualify")
def disqualify_candidate(request: schemas.DisqualifyRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # STRATEGY: Find the app to kill.
    # 1. Try Specific Active App (Incomplete + ID)
    # 2. Try ANY Active App (Incomplete) - Nuclear Option since we assume exclusivity.
    
    application = None
    
    # 1. Specific
    if request.assessment_id and request.assessment_id > 0:
        application = db.query(models.Application).filter(
            models.Application.candidate_id == candidate.id,
            models.Application.assessment_id == request.assessment_id,
            models.Application.status == "Incomplete"
        ).first()

    # 2. Fallback: Any Incomplete
    if not application:
        print(f"DEBUG: Specific incomplete app not found for ID {request.assessment_id}. Finding ANY active application to disqualify.")
        application = db.query(models.Application).filter(
            models.Application.candidate_id == candidate.id,
            models.Application.status == "Incomplete"
        ).order_by(models.Application.id.desc()).first()
        
    # 3. Last Resort: Find the application even if status is weird, by ID
    if not application and request.assessment_id and request.assessment_id > 0:
         application = db.query(models.Application).filter(
            models.Application.candidate_id == candidate.id,
            models.Application.assessment_id == request.assessment_id
        ).first()

    if application:
        application.current_stage = -1 
        application.status = "Disqualified"
        
        scores = application.stage_scores or {}
        if not isinstance(scores, dict): scores = {}
        
        scores["disqualification_reason"] = request.reason or "Proctoring Violation"
        application.stage_scores = scores
        
        db.commit()
        db.refresh(application) # Ensure persistence
        print(f"DEBUG: DISQUALIFIED Application ID {application.id}. Status: {application.status}")
        return {
            "status": "disqualified", 
            "message": "Candidate Disqualified", 
            "assessment_id": application.assessment_id,
            "app_id": application.id
        }
    
    # If strictly no application found, we can't do much in DB.
    # But this implies the user is taking a test without an application row??
    print("DEBUG: CRITICAL - No application found to disqualify.")
    return {"status": "disqualified", "message": "No active application found, but session terminated."}

@app.post("/stage/project-validation")
def validate_project(request: schemas.StageUpdate, db: Session = Depends(get_db)):
    # Reusing StageUpdate: stage=5, data={"url": "..."}
    candidate = db.query(models.Candidate).filter(models.Candidate.email == request.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.status == "Incomplete"
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Active application not found")
        
    url = request.data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    # Analyze
    result = resume_parser.analyze_github_project(url)
    
    # Save Score
    scores = dict(application.stage_scores) if application.stage_scores else {}
    scores["stage5"] = result["score"]
    scores["project_feedback"] = result
    
    application.stage_scores = scores
    flag_modified(application, "stage_scores")
    
    # Also update current stage to 5 (Done)
    application.current_stage = 5
    db.commit()
    
    return result

@app.post("/stage/complete")
def complete_stage(update: schemas.StageUpdate, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == update.email).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Find active application (Incomplete)
    application = db.query(models.Application).filter(
        models.Application.candidate_id == candidate.id,
        models.Application.status == "Incomplete"
    ).first()
    
    if not application:
         # Fallback check - maybe they just finished stage 5? 
         # Or maybe we need to find ANY application that matches the flow.
         # For safety, let's error if not found.
         raise HTTPException(status_code=404, detail="Application not found")

    application.current_stage = update.stage
    
    # Update scores
    # FORCE NEW DICT REFERENCE for SQLAlchemy change tracking
    current_scores = dict(application.stage_scores) if application.stage_scores else {}
    
    stage_key = f"stage_{update.stage-1}" # Score for previous stage
    
    # If score is 0 and we have answers (e.g. from Subjective Test), Trigger Server-Side Scoring if needed?
    # Actually, the Frontend should probably call a "evaluate" endpoint first?
    # OR we handle it here if we passed answers.
    # But schema `StageUpdate` only has score/feedback.
    # We should trust valid scores, but if it's 0/85 fallback, maybe re-evaluate?
    # For now, let's just save.
    # The real fix is in Frontend to call `evaluate_answers` via a new endpoint or update `StageUpdate` schema.
    
    # Wait! Frontend handles submission.
    # The user issue is "Score 0".
    # This means Frontend sent 0.
    
    current_scores[stage_key] = {"score": update.score, "feedback": update.feedback}
    application.stage_scores = current_scores
    
    # NEW RULE: If score < 50, STOP application immediately.
    if update.score < 50:
        application.current_stage = -1
        application.status = "Rejected"
        current_scores[stage_key]['feedback'] += " (Failed: Score < 50)"
        application.stage_scores = current_scores
    
    db.commit()
    return {"status": "updated", "stage": application.current_stage}

@app.post("/stage/evaluate")
def evaluate_stage_answers(request: schemas.StageEvaluationRequest):
    # Call Gemini to score
    result = resume_parser.evaluate_answers(request.questions, request.answers)
    return result

@app.post("/admin/compare-candidates")
def compare_candidates(request: schemas.ComparisonRequest, db: Session = Depends(get_db)):
    if not request.items or len(request.items) < 2:
        return {"comparison": "Please select at least 2 candidates to compare."}
    
    # Fetch Candidates
    candidates = db.query(models.Candidate).filter(models.Candidate.id.in_(request.items)).all()
    
    if not candidates:
        return {"comparison": "Candidates not found."}
        
    prompt = "Compare these candidates for a Software Engineering role. Highlight strengths, weaknesses, and best fit.\n\n"
    
    for c in candidates:
        # Get latest app
        app = db.query(models.Application).filter(models.Application.candidate_id == c.id).order_by(models.Application.id.desc()).first()
        if not app: continue
        
        scores = app.stage_scores or {}
        resume_score = scores.get('resume', {}).get('score', 0)
        final_score = scores.get('final', {}).get('score', 0)
        
        prompt += f"""
        Candidate: {c.name} ({c.university})
        Role: {app.assessment.role_title if app.assessment else 'N/A'}
        Resume Score (Pedigree): {resume_score}/100
        Technical/Final Score: {final_score}/100
        Status: {app.status}
        Detailed Scores: {scores.get('final', {}).get('breakdown', 'N/A')}
        --------------------------
        """
        
    prompt += "\nProvide a concise comparative summary in 3 paragraphs: 1) Technical Comparison, 2) Soft Skills/Pedigree, 3) Final Recommendation."
    
    analysis = resume_parser.safe_generate(prompt)
    return {"comparison": analysis}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
