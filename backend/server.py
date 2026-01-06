from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'edos_database')]

# Create the main app
app = FastAPI(
    title="EdOS - School Management Platform",
    description="Comprehensive school management SaaS platform",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and configure routes
from routes.auth import auth_router, set_db as set_auth_db
from routes.schools import schools_router, set_db as set_schools_db
from routes.users import users_router, set_db as set_users_db
from routes.students import students_router, set_db as set_students_db
from routes.academic import academic_router, set_db as set_academic_db
from routes.attendance import attendance_router, set_db as set_attendance_db
from routes.grades import grades_router, set_db as set_grades_db
from routes.dashboard import dashboard_router, set_db as set_dashboard_db
from routes.communication import communication_router, set_db as set_communication_db

# Set database for all routes
set_auth_db(db)
set_schools_db(db)
set_users_db(db)
set_students_db(db)
set_academic_db(db)
set_attendance_db(db)
set_grades_db(db)
set_dashboard_db(db)
set_communication_db(db)

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(schools_router)
api_router.include_router(users_router)
api_router.include_router(students_router)
api_router.include_router(academic_router)
api_router.include_router(attendance_router)
api_router.include_router(grades_router)
api_router.include_router(dashboard_router)
api_router.include_router(communication_router)


# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "EdOS API is running", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}


# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_db_client():
    """Create indexes on startup"""
    # User indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("school_id")
    await db.users.create_index([("school_id", 1), ("user_type", 1)])
    
    # Student indexes
    await db.students.create_index([("school_id", 1), ("enrollment_number", 1)], unique=True)
    await db.students.create_index([("school_id", 1), ("class_id", 1)])
    await db.students.create_index([("school_id", 1), ("status", 1)])
    
    # Attendance indexes
    await db.attendance.create_index([("school_id", 1), ("student_id", 1), ("date", 1)])
    await db.attendance.create_index([("school_id", 1), ("class_id", 1), ("date", 1)])
    
    # Grade indexes
    await db.grades.create_index([("school_id", 1), ("student_id", 1)])
    await db.grades.create_index([("school_id", 1), ("assignment_id", 1)])
    
    # Other indexes
    await db.schools.create_index("code", unique=True)
    await db.invitations.create_index("token", unique=True)
    await db.invitations.create_index([("school_id", 1), ("email", 1)])
    
    logger.info("Database indexes created successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
