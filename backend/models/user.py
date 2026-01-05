from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserType(str, Enum):
    SUPER_ADMIN = "super_admin"
    SCHOOL_ADMIN = "school_admin"
    PRINCIPAL = "principal"
    TEACHER = "teacher"
    PARENT = "parent"
    STUDENT = "student"
    FINANCE_OFFICER = "finance_officer"
    STAFF = "staff"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class Permission(BaseModel):
    module: str
    actions: List[str]  # create, read, update, delete


class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: Optional[str] = None  # None for super_admin roles
    name: str
    description: Optional[str] = None
    permissions: List[Permission] = []
    is_system_role: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[Permission] = []


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: Optional[str] = None  # None for super_admin
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    user_type: UserType
    role_id: Optional[str] = None
    status: UserStatus = UserStatus.PENDING
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    last_login_at: Optional[datetime] = None
    two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    user_type: UserType
    phone_number: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    status: Optional[UserStatus] = None
    role_id: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    school_id: Optional[str] = None
    email: EmailStr
    first_name: str
    last_name: str
    user_type: UserType
    role_id: Optional[str] = None
    status: UserStatus
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Invitation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    email: EmailStr
    user_type: UserType
    role_id: Optional[str] = None
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: InvitationStatus = InvitationStatus.PENDING
    invited_by: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvitationCreate(BaseModel):
    email: EmailStr
    user_type: UserType
    role_id: Optional[str] = None


class InvitationAccept(BaseModel):
    token: str
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
