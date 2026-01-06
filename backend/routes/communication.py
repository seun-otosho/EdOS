from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List

from models.communication import (
    Announcement, AnnouncementCreate, AnnouncementUpdate,
    AnnouncementPriority, AnnouncementAudience,
    Message, MessageCreate, MessageStatus,
    Event, EventCreate
)
from models.user import UserType
from utils.auth import get_current_user_data, check_permissions
from utils.helpers import serialize_datetime, deserialize_datetime

communication_router = APIRouter(prefix="/communication", tags=["Communication"])

db = None

def set_db(database):
    global db
    db = database


# ==================== ANNOUNCEMENTS ====================

@communication_router.post("/announcements", response_model=dict)
async def create_announcement(
    data: AnnouncementCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new announcement"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value,
        UserType.TEACHER.value
    ], user_data)
    
    announcement = Announcement(
        school_id=user_data["school_id"],
        created_by=user_data["user_id"],
        published_at=datetime.now(timezone.utc) if data.is_published else None,
        **data.model_dump()
    )
    
    await db.announcements.insert_one(serialize_datetime(announcement.model_dump()))
    
    return {"message": "Announcement created", "id": announcement.id}


@communication_router.get("/announcements", response_model=List[dict])
async def get_announcements(
    audience: Optional[AnnouncementAudience] = None,
    include_expired: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_data: dict = Depends(get_current_user_data)
):
    """Get announcements visible to current user"""
    query = {
        "school_id": user_data["school_id"],
        "is_published": True
    }
    
    # Filter by expiry
    if not include_expired:
        query["$or"] = [
            {"expires_at": None},
            {"expires_at": {"$gte": datetime.now(timezone.utc).isoformat()}}
        ]
    
    # Filter by audience based on user type
    user_type = user_data["user_type"]
    if user_type == UserType.TEACHER.value:
        query["audience"] = {"$in": [
            AnnouncementAudience.ALL.value,
            AnnouncementAudience.TEACHERS.value
        ]}
    elif user_type == UserType.PARENT.value:
        query["audience"] = {"$in": [
            AnnouncementAudience.ALL.value,
            AnnouncementAudience.PARENTS.value,
            AnnouncementAudience.SPECIFIC_CLASS.value
        ]}
    elif user_type == UserType.STUDENT.value:
        query["audience"] = {"$in": [
            AnnouncementAudience.ALL.value,
            AnnouncementAudience.STUDENTS.value,
            AnnouncementAudience.SPECIFIC_CLASS.value
        ]}
    
    # Sort by pinned first, then by date
    announcements = await db.announcements.find(
        query,
        {"_id": 0}
    ).sort([("is_pinned", -1), ("published_at", -1)]).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    result = []
    for ann in announcements:
        ann = deserialize_datetime(ann)
        # Get creator info
        creator = await db.users.find_one(
            {"id": ann["created_by"]},
            {"first_name": 1, "last_name": 1, "user_type": 1}
        )
        ann["creator_name"] = f"{creator['first_name']} {creator['last_name']}" if creator else None
        result.append(ann)
    
    return result


@communication_router.get("/announcements/{announcement_id}", response_model=dict)
async def get_announcement(
    announcement_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get announcement details"""
    announcement = await db.announcements.find_one(
        {"id": announcement_id, "school_id": user_data["school_id"]},
        {"_id": 0}
    )
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    announcement = deserialize_datetime(announcement)
    
    # Get creator info
    creator = await db.users.find_one(
        {"id": announcement["created_by"]},
        {"first_name": 1, "last_name": 1, "user_type": 1}
    )
    announcement["creator_name"] = f"{creator['first_name']} {creator['last_name']}" if creator else None
    
    return announcement


@communication_router.put("/announcements/{announcement_id}", response_model=dict)
async def update_announcement(
    announcement_id: str,
    data: AnnouncementUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update an announcement"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Set published_at if publishing for the first time
    if data.is_published:
        ann = await db.announcements.find_one({"id": announcement_id})
        if ann and not ann.get("published_at"):
            update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.announcements.update_one(
        {"id": announcement_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    return {"message": "Announcement updated"}


@communication_router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Delete an announcement"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    result = await db.announcements.delete_one({
        "id": announcement_id,
        "school_id": user_data["school_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    return {"message": "Announcement deleted"}


# ==================== MESSAGES ====================

@communication_router.post("/messages", response_model=dict)
async def send_message(
    data: MessageCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Send a message to another user"""
    # Verify recipient exists and is in the same school
    recipient = await db.users.find_one({
        "id": data.recipient_id,
        "school_id": user_data["school_id"]
    })
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found"
        )
    
    message = Message(
        school_id=user_data["school_id"],
        sender_id=user_data["user_id"],
        **data.model_dump()
    )
    
    await db.messages.insert_one(serialize_datetime(message.model_dump()))
    
    # Update or create conversation
    participant_ids = sorted([user_data["user_id"], data.recipient_id])
    conversation = await db.conversations.find_one({
        "school_id": user_data["school_id"],
        "participant_ids": participant_ids
    })
    
    if conversation:
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {"$set": {
                "last_message_id": message.id,
                "last_message_at": message.created_at.isoformat()
            }}
        )
    else:
        from models.communication import Conversation
        conv = Conversation(
            school_id=user_data["school_id"],
            participant_ids=participant_ids,
            last_message_id=message.id,
            last_message_at=message.created_at
        )
        await db.conversations.insert_one(serialize_datetime(conv.model_dump()))
    
    return {"message": "Message sent", "id": message.id}


@communication_router.get("/messages", response_model=dict)
async def get_messages(
    conversation_with: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user_data: dict = Depends(get_current_user_data)
):
    """Get messages for current user"""
    query = {
        "school_id": user_data["school_id"],
        "$or": [
            {"sender_id": user_data["user_id"]},
            {"recipient_id": user_data["user_id"]}
        ]
    }
    
    if conversation_with:
        query["$or"] = [
            {"sender_id": user_data["user_id"], "recipient_id": conversation_with},
            {"sender_id": conversation_with, "recipient_id": user_data["user_id"]}
        ]
    
    total = await db.messages.count_documents(query)
    messages = await db.messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    result = []
    for msg in messages:
        msg = deserialize_datetime(msg)
        # Get sender info
        sender = await db.users.find_one(
            {"id": msg["sender_id"]},
            {"first_name": 1, "last_name": 1}
        )
        msg["sender_name"] = f"{sender['first_name']} {sender['last_name']}" if sender else None
        
        # Get recipient info
        recipient = await db.users.find_one(
            {"id": msg["recipient_id"]},
            {"first_name": 1, "last_name": 1}
        )
        msg["recipient_name"] = f"{recipient['first_name']} {recipient['last_name']}" if recipient else None
        
        result.append(msg)
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "limit": limit
    }


@communication_router.get("/conversations", response_model=List[dict])
async def get_conversations(user_data: dict = Depends(get_current_user_data)):
    """Get all conversations for current user"""
    conversations = await db.conversations.find(
        {
            "school_id": user_data["school_id"],
            "participant_ids": user_data["user_id"]
        },
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        conv = deserialize_datetime(conv)
        # Get the other participant
        other_id = [p for p in conv["participant_ids"] if p != user_data["user_id"]][0]
        other_user = await db.users.find_one(
            {"id": other_id},
            {"first_name": 1, "last_name": 1, "user_type": 1, "profile_picture_url": 1}
        )
        if other_user:
            conv["other_user"] = {
                "id": other_id,
                "name": f"{other_user['first_name']} {other_user['last_name']}",
                "user_type": other_user.get("user_type"),
                "profile_picture_url": other_user.get("profile_picture_url")
            }
        
        # Get last message preview
        if conv.get("last_message_id"):
            last_msg = await db.messages.find_one(
                {"id": conv["last_message_id"]},
                {"content": 1, "sender_id": 1}
            )
            if last_msg:
                conv["last_message_preview"] = last_msg["content"][:100]
                conv["last_message_is_mine"] = last_msg["sender_id"] == user_data["user_id"]
        
        # Count unread messages
        unread_count = await db.messages.count_documents({
            "recipient_id": user_data["user_id"],
            "sender_id": other_id,
            "is_read": False
        })
        conv["unread_count"] = unread_count
        
        result.append(conv)
    
    return result


@communication_router.put("/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Mark a message as read"""
    result = await db.messages.update_one(
        {
            "id": message_id,
            "recipient_id": user_data["user_id"]
        },
        {"$set": {
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat(),
            "status": MessageStatus.READ.value
        }}
    )
    
    return {"message": "Message marked as read"}


@communication_router.put("/conversations/{user_id}/read-all")
async def mark_conversation_read(
    user_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Mark all messages in a conversation as read"""
    await db.messages.update_many(
        {
            "sender_id": user_id,
            "recipient_id": user_data["user_id"],
            "is_read": False
        },
        {"$set": {
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat(),
            "status": MessageStatus.READ.value
        }}
    )
    
    return {"message": "All messages marked as read"}


# ==================== EVENTS ====================

@communication_router.post("/events", response_model=dict)
async def create_event(
    data: EventCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a calendar event"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value,
        UserType.TEACHER.value
    ], user_data)
    
    event = Event(
        school_id=user_data["school_id"],
        created_by=user_data["user_id"],
        **data.model_dump()
    )
    
    await db.events.insert_one(serialize_datetime(event.model_dump()))
    
    return {"message": "Event created", "id": event.id}


@communication_router.get("/events", response_model=List[dict])
async def get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get calendar events"""
    query = {"school_id": user_data["school_id"]}
    
    if start_date:
        query["start_datetime"] = {"$gte": start_date}
    if end_date:
        if "start_datetime" in query:
            query["start_datetime"]["$lte"] = end_date
        else:
            query["start_datetime"] = {"$lte": end_date}
    if event_type:
        query["event_type"] = event_type
    
    events = await db.events.find(query, {"_id": 0}).sort("start_datetime", 1).to_list(500)
    
    return [deserialize_datetime(e) for e in events]


@communication_router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Delete an event"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    result = await db.events.delete_one({
        "id": event_id,
        "school_id": user_data["school_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return {"message": "Event deleted"}
