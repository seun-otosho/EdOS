from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class AnnouncementPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AnnouncementAudience(str, Enum):
    ALL = "all"
    TEACHERS = "teachers"
    PARENTS = "parents"
    STUDENTS = "students"
    SPECIFIC_CLASS = "specific_class"


class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    title: str
    content: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    audience: AnnouncementAudience = AnnouncementAudience.ALL
    target_class_ids: List[str] = []  # For specific class announcements
    attachment_urls: List[str] = []
    is_pinned: bool = False
    is_published: bool = True
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    audience: AnnouncementAudience = AnnouncementAudience.ALL
    target_class_ids: List[str] = []
    attachment_urls: List[str] = []
    is_pinned: bool = False
    is_published: bool = True
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    audience: Optional[AnnouncementAudience] = None
    target_class_ids: Optional[List[str]] = None
    is_pinned: Optional[bool] = None
    is_published: Optional[bool] = None
    expires_at: Optional[datetime] = None


class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    sender_id: str
    recipient_id: str
    subject: Optional[str] = None
    content: str
    attachment_urls: List[str] = []
    status: MessageStatus = MessageStatus.SENT
    is_read: bool = False
    read_at: Optional[datetime] = None
    parent_message_id: Optional[str] = None  # For replies/threads
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MessageCreate(BaseModel):
    recipient_id: str
    subject: Optional[str] = None
    content: str
    attachment_urls: List[str] = []
    parent_message_id: Optional[str] = None


class Conversation(BaseModel):
    """Represents a conversation between two users"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    participant_ids: List[str]  # Two user IDs
    last_message_id: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    title: str
    description: Optional[str] = None
    event_type: str  # assembly, exam, holiday, meeting, sports, etc.
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None
    is_all_day: bool = False
    target_audience: AnnouncementAudience = AnnouncementAudience.ALL
    target_class_ids: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None
    is_all_day: bool = False
    target_audience: AnnouncementAudience = AnnouncementAudience.ALL
    target_class_ids: List[str] = []
