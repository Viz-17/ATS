from database import SessionLocal, engine, Base
import models
import json

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed():
    # Check if data exists
    if db.query(models.Assessment).first():
        print("Data already exists.")
        return

    # Job 1: Full Stack Developer
    jd1 = """
    We are looking for a Full Stack Developer with experience in React, Python (FastAPI), and PostgreSQL.
    Key Responsibilities:
    - Develop frontend architecture using React.
    - Build robust APIs with FastAPI.
    - optimize database queries.
    - Write unit and integration tests.
    
    Requirements:
    - 2+ years of experience.
    - Strong understanding of REST APIs.
    - Experience with Docker and AWS is a plus.
    """
    
    job1 = models.Assessment(
        role_title="Full Stack Developer",
        job_description=jd1,
        suggested_skills=["React", "Python", "FastAPI", "SQL", "Git"],

        questions=[
            {"id": "j1", "text": "Explain how the Virtual DOM works in React and why it improves performance.", "type": "subjective", "difficulty": "medium", "keywords": ["virtual dom", "diffing", "reconciliation", "performance"]},
            {"id": "j2", "text": "What is the difference between specific HTTP methods like PUT and PATCH?", "type": "subjective", "difficulty": "medium", "keywords": ["put", "patch", "replace", "update"]},
            {"id": "j3", "text": "Describe how you would handle database migrations in a production FastAPI environment.", "type": "subjective", "difficulty": "hard", "keywords": ["alembic", "migration", "backup", "downtime"]}
        ] # seeded questions
    )

    # Job 2: AI Engineer
    jd2 = """
    We need an AI Engineer to integrate LLMs into our product.
    Responsibilities:
    - Fine-tune open source models (Llama, Mistral).
    - Implement RAG pipelines using LangChain.
    - Optimize inference latency.
    
    Skills:
    - Python, PyTorch, TensorFlow.
    - Experience with HuggingFace.
    - Knowledge of vector databases (ChromaDB, Pinecone).
    """
    
    job2 = models.Assessment(
        role_title="AI Engineer",
        job_description=jd2,
        suggested_skills=["Python", "PyTorch", "LLMs", "RAG", "Vector DB"],
        questions=[
            {"id": "s1", "text": "Describe the architecture of a RAG pipeline.", "type": "subjective", "difficulty": "medium", "keywords": ["retrieval", "generation", "vector", "embedding"]},
            {"id": "s2", "text": "How do you prevent overfitting when training a neural network?", "type": "subjective", "difficulty": "easy", "keywords": ["dropout", "regularization", "data augmentation"]},
            {"id": "s3", "text": "Explain the attention mechanism in Transformers.", "type": "subjective", "difficulty": "hard", "keywords": ["attention", "weights", "self-attention", "query", "key", "value"]}
        ]
    )

    db.add(job1)
    db.add(job2)
    db.commit()
    print("Database Seeded Successfully!")

if __name__ == "__main__":
    seed()
