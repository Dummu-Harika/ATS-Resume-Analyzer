"""
Main FastAPI Application for Round 3 Voice Interview System
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import init_db
from interview_routes import router as interview_router
from simple_routes import router as simple_router

# Initialize FastAPI app
app = FastAPI(
    title="Round 3 Voice Interview API",
    description="AI-powered voice interview system with sentiment and skill analysis",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(interview_router)
app.include_router(simple_router)

# Serve uploaded files
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    print("Database initialized")
    print("Round 3 Voice Interview API is ready!")

# Health check endpoint
@app.get("/")
def root():
    return {
        "message": "Round 3 Voice Interview API",
        "status": "active",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("INTERVIEW_PORT", "8004"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
