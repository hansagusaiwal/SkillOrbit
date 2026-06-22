from models import Job

jobs: list[Job] = [
    Job(
        id="JOB-001",
        title="Senior AI Engineer",
        roleCategory="AI / ML",
        location="Bengaluru / Remote",
        experienceRange="5-8 years",
        status="Active",
        candidatesScanned=100000,
        topScore=92,
    ),
    Job(
        id="JOB-002",
        title="ML Platform Engineer",
        roleCategory="MLOps",
        location="Pune",
        experienceRange="4-7 years",
        status="Active",
        candidatesScanned=48200,
        topScore=89,
    ),
]
