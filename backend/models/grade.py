from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid


class AssignmentType(str, Enum):
    HOMEWORK = "homework"
    QUIZ = "quiz"
    TEST = "test"
    EXAM = "exam"
    PROJECT = "project"
    PRESENTATION = "presentation"
    LAB = "lab"
    CLASSWORK = "classwork"
    PARTICIPATION = "participation"


class AssignmentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    GRADED = "graded"


class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    teacher_id: str
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    assignment_type: AssignmentType
    max_score: float = 100.0
    weight: float = 1.0  # Weight for grade calculation
    due_date: datetime
    allow_late_submission: bool = False
    late_penalty_percent: float = 0.0  # Percentage deducted per day late
    attachment_urls: List[str] = []
    status: AssignmentStatus = AssignmentStatus.DRAFT
    academic_year_id: Optional[str] = None
    term_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssignmentCreate(BaseModel):
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    assignment_type: AssignmentType
    max_score: float = 100.0
    weight: float = 1.0
    due_date: datetime
    allow_late_submission: bool = False
    late_penalty_percent: float = 0.0
    attachment_urls: List[str] = []


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    max_score: Optional[float] = None
    weight: Optional[float] = None
    due_date: Optional[datetime] = None
    allow_late_submission: Optional[bool] = None
    late_penalty_percent: Optional[float] = None
    status: Optional[AssignmentStatus] = None
    attachment_urls: Optional[List[str]] = None


class SubmissionStatus(str, Enum):
    NOT_SUBMITTED = "not_submitted"
    SUBMITTED = "submitted"
    LATE = "late"
    GRADED = "graded"
    RETURNED = "returned"  # Returned for revision


class Submission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    assignment_id: str
    student_id: str
    content: Optional[str] = None  # Text submission
    attachment_urls: List[str] = []
    submitted_at: Optional[datetime] = None
    is_late: bool = False
    status: SubmissionStatus = SubmissionStatus.NOT_SUBMITTED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubmissionCreate(BaseModel):
    assignment_id: str
    content: Optional[str] = None
    attachment_urls: List[str] = []


class SubmissionUpdate(BaseModel):
    content: Optional[str] = None
    attachment_urls: Optional[List[str]] = None


class Grade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    student_id: str
    assignment_id: Optional[str] = None
    submission_id: Optional[str] = None
    subject_id: str
    class_id: str
    section_id: Optional[str] = None
    score: float
    max_score: float
    percentage: float
    letter_grade: Optional[str] = None
    grade_points: Optional[float] = None
    comments: Optional[str] = None
    graded_by: str  # Teacher user ID
    is_published: bool = False
    published_at: Optional[datetime] = None
    academic_year_id: Optional[str] = None
    term_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GradeCreate(BaseModel):
    student_id: str
    assignment_id: Optional[str] = None
    submission_id: Optional[str] = None
    subject_id: str
    class_id: str
    section_id: Optional[str] = None
    score: float
    max_score: float
    comments: Optional[str] = None
    is_published: bool = False


class GradeUpdate(BaseModel):
    score: Optional[float] = None
    comments: Optional[str] = None
    is_published: Optional[bool] = None


class BulkGradeRecord(BaseModel):
    student_id: str
    score: float
    comments: Optional[str] = None


class BulkGradeCreate(BaseModel):
    assignment_id: str
    subject_id: str
    class_id: str
    section_id: Optional[str] = None
    max_score: float
    is_published: bool = False
    grades: List[BulkGradeRecord]


class GradeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    student_id: str
    assignment_id: Optional[str] = None
    subject_id: str
    class_id: str
    score: float
    max_score: float
    percentage: float
    letter_grade: Optional[str] = None
    comments: Optional[str] = None
    is_published: bool
    created_at: datetime


class StudentGradeSummary(BaseModel):
    student_id: str
    student_name: str
    subject_id: str
    subject_name: str
    total_assignments: int
    graded_assignments: int
    average_score: float
    average_percentage: float
    letter_grade: str
    grade_points: float


class GradebookCategory(BaseModel):
    """Category for organizing grades (e.g., Homework 20%, Tests 40%)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    subject_id: str
    class_id: str
    name: str  # e.g., "Homework", "Tests", "Projects"
    weight: float  # Percentage weight (e.g., 0.20 for 20%)
    drop_lowest: int = 0  # Number of lowest grades to drop
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GradebookCategoryCreate(BaseModel):
    subject_id: str
    class_id: str
    name: str
    weight: float
    drop_lowest: int = 0
