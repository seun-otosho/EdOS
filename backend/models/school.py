from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid


class SchoolStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_SETUP = "pending_setup"
    SUSPENDED = "suspended"


class TermType(str, Enum):
    SEMESTER = "semester"
    TRIMESTER = "trimester"
    QUARTER = "quarter"
    ANNUAL = "annual"


class GradingScale(BaseModel):
    name: str
    min_score: float
    max_score: float
    grade_letter: str
    grade_point: float


class AcademicYear(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str  # e.g., "2024-2025"
    start_date: date
    end_date: date
    is_current: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AcademicYearCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_current: bool = False


class Term(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    academic_year_id: str
    name: str  # e.g., "Term 1", "Semester 1"
    term_type: TermType
    start_date: date
    end_date: date
    is_current: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TermCreate(BaseModel):
    academic_year_id: str
    name: str
    term_type: TermType
    start_date: date
    end_date: date
    is_current: bool = False


class Holiday(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str
    date: date
    description: Optional[str] = None


class HolidayCreate(BaseModel):
    name: str
    date: date
    description: Optional[str] = None


class SchoolSettings(BaseModel):
    term_type: TermType = TermType.SEMESTER
    grading_scales: List[GradingScale] = [
        GradingScale(name="A+", min_score=90, max_score=100, grade_letter="A+", grade_point=4.0),
        GradingScale(name="A", min_score=85, max_score=89.99, grade_letter="A", grade_point=3.7),
        GradingScale(name="B+", min_score=80, max_score=84.99, grade_letter="B+", grade_point=3.3),
        GradingScale(name="B", min_score=75, max_score=79.99, grade_letter="B", grade_point=3.0),
        GradingScale(name="C+", min_score=70, max_score=74.99, grade_letter="C+", grade_point=2.7),
        GradingScale(name="C", min_score=65, max_score=69.99, grade_letter="C", grade_point=2.3),
        GradingScale(name="D", min_score=60, max_score=64.99, grade_letter="D", grade_point=2.0),
        GradingScale(name="F", min_score=0, max_score=59.99, grade_letter="F", grade_point=0.0),
    ]
    attendance_threshold: float = 75.0  # Minimum attendance percentage
    late_arrival_threshold_minutes: int = 15
    timezone: str = "UTC"


class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"  # Default blue
    secondary_color: str = "#10B981"  # Default green
    status: SchoolStatus = SchoolStatus.PENDING_SETUP
    settings: SchoolSettings = Field(default_factory=SchoolSettings)
    admin_id: str  # Primary admin user ID
    setup_completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SchoolCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None


class SchoolRegister(BaseModel):
    # School info
    school_name: str
    school_address: Optional[str] = None
    school_city: Optional[str] = None
    school_country: Optional[str] = None
    school_phone: Optional[str] = None
    school_email: Optional[EmailStr] = None
    # Admin info
    admin_email: EmailStr
    admin_password: str
    admin_first_name: str
    admin_last_name: str
    admin_phone: Optional[str] = None


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    settings: Optional[SchoolSettings] = None


class SchoolResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    status: SchoolStatus
    setup_completed: bool
    created_at: datetime
