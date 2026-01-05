from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone, timedelta
import uuid

from models.user import (
    User, UserCreate, UserResponse, UserType, UserStatus,
    LoginRequest, TokenResponse, RefreshTokenRequest,
    Invitation, InvitationCreate, InvitationAccept, InvitationStatus
)
from models.school import School, SchoolRegister, SchoolStatus, SchoolResponse
from utils.auth import (
    get_password_hash, verify_password, create_access_token, 
    create_refresh_token, decode_token, get_current_user_data
)
from utils.helpers import serialize_datetime, deserialize_datetime

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database will be injected
db = None

def set_db(database):
    global db
    db = database


@auth_router.post("/register", response_model=dict)
async def register_school(data: SchoolRegister):
    """Register a new school with admin account"""
    # Check if admin email already exists
    existing_user = await db.users.find_one({"email": data.admin_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create admin user
    admin_user = User(
        email=data.admin_email,
        password_hash=get_password_hash(data.admin_password),
        first_name=data.admin_first_name,
        last_name=data.admin_last_name,
        user_type=UserType.SCHOOL_ADMIN,
        phone_number=data.admin_phone,
        status=UserStatus.ACTIVE
    )
    
    # Create school
    school = School(
        name=data.school_name,
        address=data.school_address,
        city=data.school_city,
        country=data.school_country,
        phone_number=data.school_phone,
        email=data.school_email,
        admin_id=admin_user.id,
        status=SchoolStatus.PENDING_SETUP
    )
    
    # Link admin to school
    admin_user.school_id = school.id
    
    # Save to database
    await db.schools.insert_one(serialize_datetime(school.model_dump()))
    await db.users.insert_one(serialize_datetime(admin_user.model_dump()))
    
    # Create tokens
    token_data = {
        "sub": admin_user.id,
        "email": admin_user.email,
        "school_id": school.id,
        "user_type": admin_user.user_type.value
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "message": "School registered successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse(**admin_user.model_dump()).model_dump(),
        "school": SchoolResponse(**school.model_dump()).model_dump()
    }


@auth_router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": data.email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_doc = deserialize_datetime(user_doc)
    
    # Verify password
    if not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if user_doc["status"] != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create tokens
    token_data = {
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "school_id": user_doc.get("school_id"),
        "user_type": user_doc["user_type"]
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    user_response = UserResponse(**user_doc)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@auth_router.post("/refresh-token")
async def refresh_token(data: RefreshTokenRequest):
    """Refresh access token"""
    payload = decode_token(data.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Verify user still exists and is active
    user_doc = await db.users.find_one({"id": payload.get("sub")})
    if not user_doc or user_doc["status"] != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    token_data = {
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "school_id": user_doc.get("school_id"),
        "user_type": user_doc["user_type"]
    }
    access_token = create_access_token(token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user(user_data: dict = Depends(get_current_user_data)):
    """Get current user profile"""
    user_doc = await db.users.find_one({"id": user_data["user_id"]})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_doc = deserialize_datetime(user_doc)
    return UserResponse(**user_doc)


@auth_router.post("/logout")
async def logout(user_data: dict = Depends(get_current_user_data)):
    """Logout user (client should discard tokens)"""
    return {"message": "Logged out successfully"}


@auth_router.post("/invite", response_model=dict)
async def create_invitation(
    data: InvitationCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create an invitation for a new user"""
    # Only admins can invite
    if user_data["user_type"] not in [UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value, UserType.PRINCIPAL.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can send invitations"
        )
    
    # Check if email already registered
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check for existing pending invitation
    existing_invite = await db.invitations.find_one({
        "email": data.email,
        "school_id": user_data["school_id"],
        "status": InvitationStatus.PENDING.value
    })
    if existing_invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already sent to this email"
        )
    
    # Create invitation
    invitation = Invitation(
        school_id=user_data["school_id"],
        email=data.email,
        user_type=data.user_type,
        role_id=data.role_id,
        invited_by=user_data["user_id"],
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    await db.invitations.insert_one(serialize_datetime(invitation.model_dump()))
    
    return {
        "message": "Invitation sent successfully",
        "invitation_id": invitation.id,
        "token": invitation.token,
        "expires_at": invitation.expires_at.isoformat()
    }


@auth_router.get("/invite/{token}")
async def get_invitation(token: str):
    """Get invitation details by token"""
    invitation = await db.invitations.find_one({"token": token})
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invitation = deserialize_datetime(invitation)
    
    if invitation["status"] != InvitationStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is {invitation['status']}"
        )
    
    if datetime.fromisoformat(invitation["expires_at"].isoformat()) < datetime.now(timezone.utc):
        await db.invitations.update_one(
            {"token": token},
            {"$set": {"status": InvitationStatus.EXPIRED.value}}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # Get school info
    school = await db.schools.find_one({"id": invitation["school_id"]})
    
    return {
        "email": invitation["email"],
        "user_type": invitation["user_type"],
        "school_name": school["name"] if school else None,
        "expires_at": invitation["expires_at"]
    }


@auth_router.post("/invite/accept", response_model=TokenResponse)
async def accept_invitation(data: InvitationAccept):
    """Accept an invitation and create account"""
    invitation = await db.invitations.find_one({"token": data.token})
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invitation = deserialize_datetime(invitation)
    
    if invitation["status"] != InvitationStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is {invitation['status']}"
        )
    
    # Create user
    user = User(
        school_id=invitation["school_id"],
        email=invitation["email"],
        password_hash=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        user_type=UserType(invitation["user_type"]),
        role_id=invitation.get("role_id"),
        phone_number=data.phone_number,
        status=UserStatus.ACTIVE
    )
    
    await db.users.insert_one(serialize_datetime(user.model_dump()))
    
    # Update invitation status
    await db.invitations.update_one(
        {"token": data.token},
        {"$set": {"status": InvitationStatus.ACCEPTED.value}}
    )
    
    # Create tokens
    token_data = {
        "sub": user.id,
        "email": user.email,
        "school_id": user.school_id,
        "user_type": user.user_type.value
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(**user.model_dump())
    )
