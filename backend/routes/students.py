from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from datetime import datetime, timezone, date
from typing import Optional, List
import csv
import io

from models.student import (
    Student, StudentCreate, StudentUpdate, StudentResponse, StudentStatus,
    ParentStudent, ParentStudentCreate, Family, Gender, RelationshipType
)
from models.user import UserType, User, UserStatus
from utils.auth import get_current_user_data, check_permissions, get_password_hash
from utils.helpers import serialize_datetime, deserialize_datetime

students_router = APIRouter(prefix="/students", tags=["Students"])

db = None

def set_db(database):
    global db
    db = database


@students_router.get("", response_model=dict)
async def get_students(
    class_id: Optional[str] = None,
    section_id: Optional[str] = None,
    status_filter: Optional[StudentStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_data: dict = Depends(get_current_user_data)
):
    """Get all students in the school"""
    query = {"school_id": user_data["school_id"]}
    
    if class_id:
        query["class_id"] = class_id
    if section_id:
        query["section_id"] = section_id
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"enrollment_number": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.students.count_documents(query)
    students = await db.students.find(
        query,
        {"_id": 0}
    ).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    return {
        "data": [deserialize_datetime(s) for s in students],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@students_router.post("", response_model=StudentResponse)
async def create_student(
    data: StudentCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Add a new student"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value, 
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    student = Student(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.students.insert_one(serialize_datetime(student.model_dump()))
    
    return StudentResponse(**student.model_dump())


@students_router.get("/{student_id}", response_model=dict)
async def get_student(
    student_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get student details with class and parent info"""
    student = await db.students.find_one(
        {"id": student_id, "school_id": user_data["school_id"]},
        {"_id": 0}
    )
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    student = deserialize_datetime(student)
    
    # Get class info
    if student.get("class_id"):
        class_info = await db.classes.find_one(
            {"id": student["class_id"]},
            {"_id": 0}
        )
        student["class_info"] = class_info
    
    # Get section info
    if student.get("section_id"):
        section_info = await db.sections.find_one(
            {"id": student["section_id"]},
            {"_id": 0}
        )
        student["section_info"] = section_info
    
    # Get parent links
    parent_links = await db.parent_students.find(
        {"student_id": student_id},
        {"_id": 0}
    ).to_list(10)
    
    parents = []
    for link in parent_links:
        parent = await db.users.find_one(
            {"id": link["parent_id"]},
            {"_id": 0, "password_hash": 0}
        )
        if parent:
            parent["relationship"] = link["relationship"]
            parent["is_primary_contact"] = link["is_primary_contact"]
            parents.append(deserialize_datetime(parent))
    
    student["parents"] = parents
    
    return student


@students_router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str,
    data: StudentUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update student information"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value,
        UserType.TEACHER.value
    ], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.students.update_one(
        {"id": student_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    return StudentResponse(**deserialize_datetime(student))


@students_router.delete("/{student_id}")
async def deactivate_student(
    student_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Deactivate a student (soft delete)"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    result = await db.students.update_one(
        {"id": student_id, "school_id": user_data["school_id"]},
        {"$set": {
            "status": StudentStatus.INACTIVE.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    return {"message": "Student deactivated"}


@students_router.post("/{student_id}/link-parent")
async def link_parent_to_student(
    student_id: str,
    data: ParentStudentCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Link a parent to a student"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Verify student exists
    student = await db.students.find_one({
        "id": student_id,
        "school_id": user_data["school_id"]
    })
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Verify parent exists and is a parent type
    parent = await db.users.find_one({
        "id": data.parent_id,
        "school_id": user_data["school_id"],
        "user_type": UserType.PARENT.value
    })
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent not found"
        )
    
    # Check if link already exists
    existing = await db.parent_students.find_one({
        "parent_id": data.parent_id,
        "student_id": student_id
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent is already linked to this student"
        )
    
    link = ParentStudent(
        school_id=user_data["school_id"],
        parent_id=data.parent_id,
        student_id=student_id,
        relationship=data.relationship,
        is_primary_contact=data.is_primary_contact,
        can_pickup=data.can_pickup
    )
    
    await db.parent_students.insert_one(serialize_datetime(link.model_dump()))
    
    return {"message": "Parent linked to student", "id": link.id}


@students_router.get("/{student_id}/parents", response_model=List[dict])
async def get_student_parents(
    student_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get all parents linked to a student"""
    links = await db.parent_students.find(
        {"student_id": student_id, "school_id": user_data["school_id"]},
        {"_id": 0}
    ).to_list(10)
    
    parents = []
    for link in links:
        parent = await db.users.find_one(
            {"id": link["parent_id"]},
            {"_id": 0, "password_hash": 0}
        )
        if parent:
            parent = deserialize_datetime(parent)
            parent["relationship"] = link["relationship"]
            parent["is_primary_contact"] = link["is_primary_contact"]
            parents.append(parent)
    
    return parents


@students_router.post("/bulk-import")
async def bulk_import_students(
    file: UploadFile = File(...),
    class_id: Optional[str] = None,
    section_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Bulk import students from CSV"""
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
            required = ['first_name', 'last_name', 'date_of_birth', 'gender']
            missing = [f for f in required if not row.get(f)]
            if missing:
                errors.append({"row": row_num, "error": f"Missing fields: {missing}"})
                continue
            
            # Parse date of birth
            try:
                dob = date.fromisoformat(row['date_of_birth'])
            except ValueError:
                errors.append({"row": row_num, "error": "Invalid date format for date_of_birth"})
                continue
            
            # Parse gender
            gender_map = {'male': Gender.MALE, 'female': Gender.FEMALE, 'other': Gender.OTHER}
            gender = gender_map.get(row['gender'].lower())
            if not gender:
                errors.append({"row": row_num, "error": "Invalid gender value"})
                continue
            
            student = Student(
                school_id=user_data["school_id"],
                first_name=row['first_name'],
                last_name=row['last_name'],
                date_of_birth=dob,
                gender=gender,
                email=row.get('email'),
                phone_number=row.get('phone_number'),
                address=row.get('address'),
                class_id=class_id or row.get('class_id'),
                section_id=section_id or row.get('section_id')
            )
            
            await db.students.insert_one(serialize_datetime(student.model_dump()))
            imported += 1
            
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})
    
    return {
        "message": f"Imported {imported} students",
        "imported_count": imported,
        "error_count": len(errors),
        "errors": errors[:20]
    }


# Parent portal endpoints
@students_router.get("/my-children", response_model=List[dict])
async def get_my_children(user_data: dict = Depends(get_current_user_data)):
    """Get children linked to current parent"""
    if user_data["user_type"] != UserType.PARENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents can access this endpoint"
        )
    
    links = await db.parent_students.find(
        {"parent_id": user_data["user_id"]},
        {"_id": 0}
    ).to_list(20)
    
    children = []
    for link in links:
        student = await db.students.find_one(
            {"id": link["student_id"]},
            {"_id": 0}
        )
        if student:
            student = deserialize_datetime(student)
            # Get class info
            if student.get("class_id"):
                class_info = await db.classes.find_one(
                    {"id": student["class_id"]},
                    {"_id": 0, "name": 1, "grade_level": 1}
                )
                student["class_info"] = class_info
            children.append(student)
    
    return children
