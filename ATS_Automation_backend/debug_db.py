from database import SessionLocal
from models import Candidate, Application

db = SessionLocal()
candidates = db.query(Candidate).all()
print(f"Total Candidates: {len(candidates)}")

for c in candidates:
    print(f"Candidate: {c.name} ({c.email})")
    apps = db.query(Application).filter(Application.candidate_id == c.id).all()
    for app in apps:
        print(f"  - App ID: {app.id}, Job: {app.assessment_id}, Stage: {app.current_stage}, Status: {app.status}")
        if app.stage_scores:
            print(f"    Scores: {app.stage_scores}")
            
db.close()
