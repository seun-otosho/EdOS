from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"
    MEDICAL = "medical"
    HALF_DAY = "half_day"


class AttendanceType(str, Enum):
    DAILY = "daily"  # School-level daily attendance
    CLASS = "class"  # Per-class/period attendance
    SUBJECT = "subject"  # Per-subject attendance


class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    student_id: str
    class_id: str
    section_id: Optional[str] = None
    subject_id: Optional[str] = None  # For subject-level attendance
    date: date
    status: AttendanceStatus
    attendance_type: AttendanceType = AttendanceType.DAILY
    check_in_time: Optional[str] = None  # Format: "HH:MM"
    check_out_time: Optional[str] = None
    notes: Optional[str] = None
    marked_by: str  # User ID of teacher/admin who marked
    marked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AttendanceCreate(BaseModel):
    student_id: str
    class_id: str
    section_id: Optional[str] = None
    subject_id: Optional[str] = None
    date: date
    status: AttendanceStatus
    attendance_type: AttendanceType = AttendanceType.DAILY
    check_in_time: Optional[str] = None
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None
    notes: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None


class BulkAttendanceRecord(BaseModel):
    student_id: str
    status: AttendanceStatus
    notes: Optional[str] = None


class BulkAttendanceCreate(BaseModel):
    class_id: str
    section_id: Optional[str] = None
    subject_id: Optional[str] = None
    date: date
    attendance_type: AttendanceType = AttendanceType.DAILY
    records: List[BulkAttendanceRecord]


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    school_id: str
    student_id: str
    class_id: str
    section_id: Optional[str] = None
    subject_id: Optional[str] = None
    date: date
    status: AttendanceStatus
    attendance_type: AttendanceType
    notes: Optional[str] = None
    marked_by: str
    marked_at: datetime


class AttendanceSummary(BaseModel):
    student_id: str
    student_name: str
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    excused_days: int
    attendance_percentage: float


class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    student_id: str
    requested_by: str  # Parent or student user ID
    start_date: date
    end_date: date
    reason: str
    attachment_url: Optional[str] = None  # For medical certificates, etc.
    status: LeaveStatus = LeaveStatus.PENDING
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaveRequestCreate(BaseModel):
    student_id: str
    start_date: date
    end_date: date
    reason: str
    attachment_url: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatus
    review_notes: Optional[str] = None
