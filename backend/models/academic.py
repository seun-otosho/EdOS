from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date, time
from enum import Enum
import uuid


class ClassStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class Class(BaseModel):
    """Represents a class/grade level (e.g., Grade 5, Class 10)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str  # e.g., "Grade 5", "Class 10"
    grade_level: int  # Numeric grade level
    description: Optional[str] = None
    academic_year_id: Optional[str] = None
    capacity: int = 40
    status: ClassStatus = ClassStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClassCreate(BaseModel):
    name: str
    grade_level: int
    description: Optional[str] = None
    academic_year_id: Optional[str] = None
    capacity: int = 40


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[ClassStatus] = None


class Section(BaseModel):
    """Represents a section within a class (e.g., Section A, Section B)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    class_id: str
    name: str  # e.g., "A", "B", "C"
    teacher_id: Optional[str] = None  # Class teacher
    room_number: Optional[str] = None
    capacity: int = 40
    status: ClassStatus = ClassStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SectionCreate(BaseModel):
    class_id: str
    name: str
    teacher_id: Optional[str] = None
    room_number: Optional[str] = None
    capacity: int = 40


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    teacher_id: Optional[str] = None
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[ClassStatus] = None


class Subject(BaseModel):
    """Represents a subject/course"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str  # e.g., "Mathematics", "English"
    code: str  # e.g., "MATH101"
    description: Optional[str] = None
    credits: float = 1.0
    is_elective: bool = False
    status: ClassStatus = ClassStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubjectCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    credits: float = 1.0
    is_elective: bool = False


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[float] = None
    is_elective: Optional[bool] = None
    status: Optional[ClassStatus] = None


class ClassSubject(BaseModel):
    """Links subjects to classes with teacher assignment"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    teacher_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    periods_per_week: int = 5
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClassSubjectCreate(BaseModel):
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    teacher_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    periods_per_week: int = 5


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class TimetableSlot(BaseModel):
    """Represents a single period in the timetable"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    teacher_id: Optional[str] = None
    day_of_week: DayOfWeek
    start_time: str  # Format: "HH:MM"
    end_time: str  # Format: "HH:MM"
    room_number: Optional[str] = None
    academic_year_id: Optional[str] = None
    is_break: bool = False
    break_name: Optional[str] = None  # e.g., "Lunch", "Recess"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimetableSlotCreate(BaseModel):
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    teacher_id: Optional[str] = None
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    room_number: Optional[str] = None
    is_break: bool = False
    break_name: Optional[str] = None


class StudentEnrollment(BaseModel):
    """Student enrollment in a class/section"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    student_id: str
    class_id: str
    section_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    enrollment_date: date = Field(default_factory=lambda: date.today())
    status: str = "active"  # active, dropped, transferred
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudentEnrollmentCreate(BaseModel):
    student_id: str
    class_id: str
    section_id: Optional[str] = None
    academic_year_id: Optional[str] = None
