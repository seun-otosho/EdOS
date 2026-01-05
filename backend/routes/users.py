from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from datetime import datetime, timezone
from typing import Optional, List
import csv
import io

from models.user import (
    User, UserCreate, UserUpdate, UserResponse, UserType, UserStatus,
    Role, RoleCreate, Permission
)
from utils.auth import get_current_user_data, check_permissions, get_password_hash
from utils.helpers import serialize_datetime, deserialize_datetime, paginate_results

users_router = APIRouter(prefix="/users", tags=["Users"])

db = None

def set_db(database):
    global db
    db = database


@users_router.get("", response_model=dict)
async def get_users(
    user_type: Optional[UserType] = None,
    status_filter: Optional[UserStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_data: dict = Depends(get_current_user_data)
):
    """Get all users in the school"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value, UserType.PRINCIPAL.value], user_data)
    
    query = {"school_id": user_data["school_id"]}
    
    if user_type:
        query["user_type"] = user_type.value
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    return {
        "data": [deserialize_datetime(u) for u in users],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@users_router.post("", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new user directly (without invitation)"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = User(
        school_id=user_data["school_id"],
        email=data.email,
        password_hash=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        user_type=data.user_type,
        phone_number=data.phone_number,
        status=UserStatus.ACTIVE
    )
    
    await db.users.insert_one(serialize_datetime(user.model_dump()))
    
    return UserResponse(**user.model_dump())


@users_router.get("/teachers", response_model=List[dict])
async def get_teachers(user_data: dict = Depends(get_current_user_data)):
    """Get all teachers in the school"""
    teachers = await db.users.find(
        {
            "school_id": user_data["school_id"],
            "user_type": UserType.TEACHER.value,
            "status": UserStatus.ACTIVE.value
        },
        {"_id": 0, "password_hash": 0}
    ).to_list(500)
    
    return [deserialize_datetime(t) for t in teachers]


@users_router.get("/parents", response_model=List[dict])
async def get_parents(user_data: dict = Depends(get_current_user_data)):
    """Get all parents in the school"""
    parents = await db.users.find(
        {
            "school_id": user_data["school_id"],
            "user_type": UserType.PARENT.value,
            "status": UserStatus.ACTIVE.value
        },
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    return [deserialize_datetime(p) for p in parents]


@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get user by ID"""
    user = await db.users.find_one(
        {"id": user_id, "school_id": user_data["school_id"]},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**deserialize_datetime(user))


@users_router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update user"""
    # Users can update themselves, admins can update anyone
    if user_id != user_data["user_id"]:
        check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one(
        {"id": user_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    return UserResponse(**deserialize_datetime(user))


@users_router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Deactivate a user (soft delete)"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    # Prevent self-deactivation
    if user_id == user_data["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    result = await db.users.update_one(
        {"id": user_id, "school_id": user_data["school_id"]},
        {"$set": {
            "status": UserStatus.INACTIVE.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deactivated"}


# Roles endpoints
@users_router.post("/roles", response_model=dict)
async def create_role(
    data: RoleCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a custom role"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    role = Role(
        school_id=user_data["school_id"],
        name=data.name,
        description=data.description,
        permissions=[p.model_dump() for p in data.permissions]
    )
    
    await db.roles.insert_one(serialize_datetime(role.model_dump()))
    
    return {"message": "Role created", "id": role.id}


@users_router.get("/roles/list", response_model=List[dict])
async def get_roles(user_data: dict = Depends(get_current_user_data)):
    """Get all roles for the school"""
    roles = await db.roles.find(
        {"$or": [
            {"school_id": user_data["school_id"]},
            {"is_system_role": True}
        ]},
        {"_id": 0}
    ).to_list(100)
    
    return [deserialize_datetime(r) for r in roles]


@users_router.post("/bulk-import")
async def bulk_import_users(
    file: UploadFile = File(...),
    user_type: UserType = Query(...),
    user_data: dict = Depends(get_current_user_data)
):
    """Bulk import users from CSV"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )
    
    content = await file.read()
    csv_reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
    
    imported = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            # Check required fields
            if not row.get('email') or not row.get('first_name') or not row.get('last_name'):
                errors.append({"row": row_num, "error": "Missing required fields"})
                continue
            
            # Check if email exists
            existing = await db.users.find_one({"email": row['email']})
            if existing:
                errors.append({"row": row_num, "error": f"Email {row['email']} already exists"})
                continue
            
            # Create user with default password
            user = User(
                school_id=user_data["school_id"],
                email=row['email'],
                password_hash=get_password_hash("EdOS@123"),  # Default password
                first_name=row['first_name'],
                last_name=row['last_name'],
                user_type=user_type,
                phone_number=row.get('phone_number'),
                status=UserStatus.PENDING  # Needs to change password
            )
            
            await db.users.insert_one(serialize_datetime(user.model_dump()))
            imported += 1
            
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})
    
    return {
        "message": f"Imported {imported} users",
        "imported_count": imported,
        "error_count": len(errors),
        "errors": errors[:20]  # Return first 20 errors
    }
