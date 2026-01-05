from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List

from models.academic import (
    Class, ClassCreate, ClassUpdate, ClassStatus,
    Section, SectionCreate, SectionUpdate,
    Subject, SubjectCreate, SubjectUpdate,
    ClassSubject, ClassSubjectCreate,
    TimetableSlot, TimetableSlotCreate,
    StudentEnrollment, StudentEnrollmentCreate
)
from models.user import UserType
from utils.auth import get_current_user_data, check_permissions
from utils.helpers import serialize_datetime, deserialize_datetime

academic_router = APIRouter(prefix="/academic", tags=["Academic"])

db = None

def set_db(database):
    global db
    db = database


# Classes endpoints
@academic_router.get("/classes", response_model=List[dict])
async def get_classes(
    status_filter: Optional[ClassStatus] = Query(None, alias="status"),
    user_data: dict = Depends(get_current_user_data)
):
    """Get all classes in the school"""
    query = {"school_id": user_data["school_id"]}
    if status_filter:
        query["status"] = status_filter.value
    
    classes = await db.classes.find(query, {"_id": 0}).sort("grade_level", 1).to_list(100)
    
    # Get student counts for each class
    result = []
    for cls in classes:
        cls = deserialize_datetime(cls)
        student_count = await db.students.count_documents({
            "school_id": user_data["school_id"],
            "class_id": cls["id"],
            "status": "active"
        })
        cls["student_count"] = student_count
        result.append(cls)
    
    return result


@academic_router.post("/classes", response_model=dict)
async def create_class(
    data: ClassCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new class"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Check for duplicate class name
    existing = await db.classes.find_one({
        "school_id": user_data["school_id"],
        "name": data.name,
        "status": {"$ne": ClassStatus.ARCHIVED.value}
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class with this name already exists"
        )
    
    cls = Class(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.classes.insert_one(serialize_datetime(cls.model_dump()))
    
    return {"message": "Class created", "id": cls.id, "name": cls.name}


@academic_router.get("/classes/{class_id}", response_model=dict)
async def get_class(
    class_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get class details with sections and students"""
    cls = await db.classes.find_one(
        {"id": class_id, "school_id": user_data["school_id"]},
        {"_id": 0}
    )
    
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    cls = deserialize_datetime(cls)
    
    # Get sections
    sections = await db.sections.find(
        {"class_id": class_id},
        {"_id": 0}
    ).to_list(20)
    cls["sections"] = [deserialize_datetime(s) for s in sections]
    
    # Get student count
    cls["student_count"] = await db.students.count_documents({
        "class_id": class_id,
        "status": "active"
    })
    
    # Get subjects taught in this class
    class_subjects = await db.class_subjects.find(
        {"class_id": class_id},
        {"_id": 0}
    ).to_list(50)
    
    subjects = []
    for cs in class_subjects:
        subject = await db.subjects.find_one({"id": cs["subject_id"]}, {"_id": 0})
        if subject:
            subject = deserialize_datetime(subject)
            subject["teacher_id"] = cs.get("teacher_id")
            subject["periods_per_week"] = cs.get("periods_per_week")
            # Get teacher info
            if cs.get("teacher_id"):
                teacher = await db.users.find_one(
                    {"id": cs["teacher_id"]},
                    {"_id": 0, "first_name": 1, "last_name": 1}
                )
                subject["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}" if teacher else None
            subjects.append(subject)
    
    cls["subjects"] = subjects
    
    return cls


@academic_router.put("/classes/{class_id}", response_model=dict)
async def update_class(
    class_id: str,
    data: ClassUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update a class"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.classes.update_one(
        {"id": class_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    return {"message": "Class updated"}


@academic_router.delete("/classes/{class_id}")
async def archive_class(
    class_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Archive a class"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    result = await db.classes.update_one(
        {"id": class_id, "school_id": user_data["school_id"]},
        {"$set": {
            "status": ClassStatus.ARCHIVED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    return {"message": "Class archived"}


# Sections endpoints
@academic_router.get("/sections", response_model=List[dict])
async def get_sections(
    class_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get all sections"""
    query = {"school_id": user_data["school_id"]}
    if class_id:
        query["class_id"] = class_id
    
    sections = await db.sections.find(query, {"_id": 0}).to_list(200)
    
    result = []
    for section in sections:
        section = deserialize_datetime(section)
        # Get student count
        section["student_count"] = await db.students.count_documents({
            "section_id": section["id"],
            "status": "active"
        })
        # Get teacher info
        if section.get("teacher_id"):
            teacher = await db.users.find_one(
                {"id": section["teacher_id"]},
                {"_id": 0, "first_name": 1, "last_name": 1}
            )
            section["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}" if teacher else None
        result.append(section)
    
    return result


@academic_router.post("/sections", response_model=dict)
async def create_section(
    data: SectionCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new section"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Verify class exists
    cls = await db.classes.find_one({
        "id": data.class_id,
        "school_id": user_data["school_id"]
    })
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    section = Section(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.sections.insert_one(serialize_datetime(section.model_dump()))
    
    return {"message": "Section created", "id": section.id}


@academic_router.put("/sections/{section_id}", response_model=dict)
async def update_section(
    section_id: str,
    data: SectionUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update a section"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.sections.update_one(
        {"id": section_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found"
        )
    
    return {"message": "Section updated"}


# Subjects endpoints
@academic_router.get("/subjects", response_model=List[dict])
async def get_subjects(user_data: dict = Depends(get_current_user_data)):
    """Get all subjects"""
    subjects = await db.subjects.find(
        {"school_id": user_data["school_id"], "status": ClassStatus.ACTIVE.value},
        {"_id": 0}
    ).to_list(100)
    
    return [deserialize_datetime(s) for s in subjects]


@academic_router.post("/subjects", response_model=dict)
async def create_subject(
    data: SubjectCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new subject"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Check for duplicate code
    existing = await db.subjects.find_one({
        "school_id": user_data["school_id"],
        "code": data.code
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject with this code already exists"
        )
    
    subject = Subject(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.subjects.insert_one(serialize_datetime(subject.model_dump()))
    
    return {"message": "Subject created", "id": subject.id}


@academic_router.put("/subjects/{subject_id}", response_model=dict)
async def update_subject(
    subject_id: str,
    data: SubjectUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update a subject"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value
    ], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.subjects.update_one(
        {"id": subject_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    return {"message": "Subject updated"}


# Class-Subject assignment
@academic_router.post("/class-subjects", response_model=dict)
async def assign_subject_to_class(
    data: ClassSubjectCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Assign a subject to a class with teacher"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Check if already assigned
    existing = await db.class_subjects.find_one({
        "class_id": data.class_id,
        "subject_id": data.subject_id,
        "section_id": data.section_id
    })
    if existing:
        # Update teacher assignment
        await db.class_subjects.update_one(
            {"id": existing["id"]},
            {"$set": {
                "teacher_id": data.teacher_id,
                "periods_per_week": data.periods_per_week
            }}
        )
        return {"message": "Subject assignment updated", "id": existing["id"]}
    
    class_subject = ClassSubject(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.class_subjects.insert_one(serialize_datetime(class_subject.model_dump()))
    
    return {"message": "Subject assigned to class", "id": class_subject.id}


@academic_router.get("/class-subjects/{class_id}", response_model=List[dict])
async def get_class_subjects(
    class_id: str,
    section_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get subjects assigned to a class"""
    query = {"class_id": class_id, "school_id": user_data["school_id"]}
    if section_id:
        query["section_id"] = section_id
    
    assignments = await db.class_subjects.find(query, {"_id": 0}).to_list(50)
    
    result = []
    for assignment in assignments:
        subject = await db.subjects.find_one({"id": assignment["subject_id"]}, {"_id": 0})
        if subject:
            subject = deserialize_datetime(subject)
            subject["teacher_id"] = assignment.get("teacher_id")
            subject["periods_per_week"] = assignment.get("periods_per_week")
            if assignment.get("teacher_id"):
                teacher = await db.users.find_one(
                    {"id": assignment["teacher_id"]},
                    {"_id": 0, "first_name": 1, "last_name": 1}
                )
                subject["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}" if teacher else None
            result.append(subject)
    
    return result


# Timetable endpoints
@academic_router.get("/timetable/{class_id}", response_model=List[dict])
async def get_class_timetable(
    class_id: str,
    section_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get timetable for a class"""
    query = {"class_id": class_id, "school_id": user_data["school_id"]}
    if section_id:
        query["section_id"] = section_id
    
    slots = await db.timetable_slots.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for slot in slots:
        slot = deserialize_datetime(slot)
        # Get subject info
        if slot.get("subject_id"):
            subject = await db.subjects.find_one({"id": slot["subject_id"]}, {"_id": 0})
            slot["subject_name"] = subject["name"] if subject else None
        # Get teacher info
        if slot.get("teacher_id"):
            teacher = await db.users.find_one(
                {"id": slot["teacher_id"]},
                {"_id": 0, "first_name": 1, "last_name": 1}
            )
            slot["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}" if teacher else None
        result.append(slot)
    
    return result


@academic_router.post("/timetable", response_model=dict)
async def create_timetable_slot(
    data: TimetableSlotCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a timetable slot"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Check for conflicts
    conflict = await db.timetable_slots.find_one({
        "school_id": user_data["school_id"],
        "class_id": data.class_id,
        "section_id": data.section_id,
        "day_of_week": data.day_of_week.value,
        "start_time": data.start_time
    })
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot already occupied"
        )
    
    slot = TimetableSlot(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.timetable_slots.insert_one(serialize_datetime(slot.model_dump()))
    
    return {"message": "Timetable slot created", "id": slot.id}


@academic_router.delete("/timetable/{slot_id}")
async def delete_timetable_slot(
    slot_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Delete a timetable slot"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    result = await db.timetable_slots.delete_one({
        "id": slot_id,
        "school_id": user_data["school_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timetable slot not found"
        )
    
    return {"message": "Timetable slot deleted"}


# Teacher's classes
@academic_router.get("/my-classes", response_model=List[dict])
async def get_teacher_classes(user_data: dict = Depends(get_current_user_data)):
    """Get classes assigned to current teacher"""
    if user_data["user_type"] != UserType.TEACHER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this endpoint"
        )
    
    # Get class-subject assignments for this teacher
    assignments = await db.class_subjects.find(
        {"teacher_id": user_data["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Get unique classes
    class_ids = list(set(a["class_id"] for a in assignments))
    
    result = []
    for class_id in class_ids:
        cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
        if cls:
            cls = deserialize_datetime(cls)
            # Get sections where teacher teaches
            teacher_sections = [a.get("section_id") for a in assignments if a["class_id"] == class_id]
            if teacher_sections and teacher_sections[0]:
                sections = await db.sections.find(
                    {"id": {"$in": teacher_sections}},
                    {"_id": 0}
                ).to_list(20)
                cls["sections"] = [deserialize_datetime(s) for s in sections]
            else:
                # All sections
                sections = await db.sections.find(
                    {"class_id": class_id},
                    {"_id": 0}
                ).to_list(20)
                cls["sections"] = [deserialize_datetime(s) for s in sections]
            
            # Get subjects this teacher teaches in this class
            subjects = []
            for a in assignments:
                if a["class_id"] == class_id:
                    subject = await db.subjects.find_one({"id": a["subject_id"]}, {"_id": 0})
                    if subject:
                        subjects.append(deserialize_datetime(subject))
            cls["subjects"] = subjects
            
            result.append(cls)
    
    return result


# Student enrollment
@academic_router.post("/enroll-student", response_model=dict)
async def enroll_student(
    data: StudentEnrollmentCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Enroll a student in a class"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Update student's class assignment
    result = await db.students.update_one(
        {"id": data.student_id, "school_id": user_data["school_id"]},
        {"$set": {
            "class_id": data.class_id,
            "section_id": data.section_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Create enrollment record
    enrollment = StudentEnrollment(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.enrollments.insert_one(serialize_datetime(enrollment.model_dump()))
    
    return {"message": "Student enrolled", "id": enrollment.id}


@academic_router.get("/class-students/{class_id}", response_model=List[dict])
async def get_class_students(
    class_id: str,
    section_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get all students in a class"""
    query = {
        "school_id": user_data["school_id"],
        "class_id": class_id,
        "status": "active"
    }
    if section_id:
        query["section_id"] = section_id
    
    students = await db.students.find(query, {"_id": 0}).sort("first_name", 1).to_list(200)
    
    return [deserialize_datetime(s) for s in students]
