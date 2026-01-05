from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
import uuid


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class StudentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    GRADUATED = "graduated"
    TRANSFERRED = "transferred"
    WITHDRAWN = "withdrawn"


class RelationshipType(str, Enum):
    FATHER = "father"
    MOTHER = "mother"
    GUARDIAN = "guardian"
    GRANDPARENT = "grandparent"
    SIBLING = "sibling"
    OTHER = "other"


class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone_number: str
    email: Optional[str] = None
    is_primary: bool = False


class MedicalInfo(BaseModel):
    blood_type: Optional[str] = None
    allergies: List[str] = []
    medical_conditions: List[str] = []
    medications: List[str] = []
    special_needs: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None


class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    user_id: Optional[str] = None  # Linked user account
    enrollment_number: str = Field(default_factory=lambda: f"STU-{str(uuid.uuid4())[:8].upper()}")
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    profile_picture_url: Optional[str] = None
    enrollment_date: date = Field(default_factory=lambda: date.today())
    class_id: Optional[str] = None
    section_id: Optional[str] = None
    emergency_contacts: List[EmergencyContact] = []
    medical_info: MedicalInfo = Field(default_factory=MedicalInfo)
    previous_school: Optional[str] = None
    admission_notes: Optional[str] = None
    status: StudentStatus = StudentStatus.ACTIVE
    custom_fields: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    class_id: Optional[str] = None
    section_id: Optional[str] = None
    emergency_contacts: List[EmergencyContact] = []
    medical_info: Optional[MedicalInfo] = None
    previous_school: Optional[str] = None
    admission_notes: Optional[str] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    profile_picture_url: Optional[str] = None
    class_id: Optional[str] = None
    section_id: Optional[str] = None
    emergency_contacts: Optional[List[EmergencyContact]] = None
    medical_info: Optional[MedicalInfo] = None
    status: Optional[StudentStatus] = None
    custom_fields: Optional[dict] = None


class StudentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    school_id: str
    enrollment_number: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    enrollment_date: date
    class_id: Optional[str] = None
    section_id: Optional[str] = None
    status: StudentStatus
    created_at: datetime


class ParentStudent(BaseModel):
    """Link between parent and student"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    parent_id: str  # User ID of parent
    student_id: str
    relationship: RelationshipType
    is_primary_contact: bool = False
    can_pickup: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ParentStudentCreate(BaseModel):
    parent_id: str
    student_id: str
    relationship: RelationshipType
    is_primary_contact: bool = False
    can_pickup: bool = True


class Family(BaseModel):
    """Family grouping for siblings"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    family_name: str
    student_ids: List[str] = []
    parent_ids: List[str] = []
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
