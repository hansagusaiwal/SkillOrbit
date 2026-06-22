from fastapi import APIRouter, HTTPException
from data_jobs import jobs
from models import Job, JobCreate

router = APIRouter()


@router.get("/", response_model=list[Job])
def list_jobs():
    return jobs


@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str):
    for job in jobs:
        if job.id == job_id:
            return job
    raise HTTPException(status_code=404, detail="Job not found")


@router.post("/", response_model=Job, status_code=201)
def create_job(body: JobCreate):
    new_job = Job(
        id=f"JOB-{len(jobs) + 1:03d}",
        title=body.title,
        roleCategory=body.roleCategory,
        location=body.location,
        experienceRange=body.experienceRange,
        status="Draft",
        candidatesScanned=0,
        topScore=0,
    )
    jobs.append(new_job)
    return new_job
