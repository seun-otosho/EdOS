from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List

from models.grade import (
    Assignment, AssignmentCreate, AssignmentUpdate, AssignmentStatus, AssignmentType,
    Submission, SubmissionCreate, SubmissionUpdate, SubmissionStatus,
    Grade, GradeCreate, GradeUpdate, GradeResponse,
    BulkGradeCreate, StudentGradeSummary,
    GradebookCategory, GradebookCategoryCreate
)
from models.user import UserType
from utils.auth import get_current_user_data, check_permissions
from utils.helpers import serialize_datetime, deserialize_datetime, calculate_grade_letter

grades_router = APIRouter(prefix="/grades", tags=["Grades"])

db = None

def set_db(database):
    global db
    db = database


# Assignments
@grades_router.post("/assignments", response_model=dict)
async def create_assignment(
    data: AssignmentCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new assignment"""
    check_permissions([
        UserType.TEACHER.value,
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value
    ], user_data)
    
    assignment = Assignment(
        school_id=user_data["school_id"],
        teacher_id=user_data["user_id"],
        **data.model_dump()
    )
    
    await db.assignments.insert_one(serialize_datetime(assignment.model_dump()))
    
    return {"message": "Assignment created", "id": assignment.id}


@grades_router.get("/assignments", response_model=List[dict])
async def get_assignments(
    class_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    status_filter: Optional[AssignmentStatus] = Query(None, alias="status"),
    user_data: dict = Depends(get_current_user_data)
):
    """Get assignments"""
    query = {"school_id": user_data["school_id"]}
    
    if class_id:
        query["class_id"] = class_id
    if subject_id:
        query["subject_id"] = subject_id
    if status_filter:
        query["status"] = status_filter.value
    
    # Teachers see their own assignments
    if user_data["user_type"] == UserType.TEACHER.value:
        query["teacher_id"] = user_data["user_id"]
    
    assignments = await db.assignments.find(query, {"_id": 0}).sort("due_date", -1).to_list(100)
    
    result = []
    for assignment in assignments:
        assignment = deserialize_datetime(assignment)
        # Get subject name
        subject = await db.subjects.find_one({"id": assignment["subject_id"]}, {"name": 1})
        assignment["subject_name"] = subject["name"] if subject else None
        # Get class name
        cls = await db.classes.find_one({"id": assignment["class_id"]}, {"name": 1})
        assignment["class_name"] = cls["name"] if cls else None
        # Get submission count
        submission_count = await db.submissions.count_documents({
            "assignment_id": assignment["id"],
            "status": {"$ne": SubmissionStatus.NOT_SUBMITTED.value}
        })
        assignment["submission_count"] = submission_count
        result.append(assignment)
    
    return result


@grades_router.get("/assignments/{assignment_id}", response_model=dict)
async def get_assignment(
    assignment_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get assignment details with submissions"""
    assignment = await db.assignments.find_one(
        {"id": assignment_id, "school_id": user_data["school_id"]},
        {"_id": 0}
    )
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    assignment = deserialize_datetime(assignment)
    
    # Get subject and class info
    subject = await db.subjects.find_one({"id": assignment["subject_id"]}, {"_id": 0, "name": 1})
    assignment["subject_name"] = subject["name"] if subject else None
    
    cls = await db.classes.find_one({"id": assignment["class_id"]}, {"_id": 0, "name": 1})
    assignment["class_name"] = cls["name"] if cls else None
    
    # Get submissions if teacher
    if user_data["user_type"] in [UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value]:
        submissions = await db.submissions.find(
            {"assignment_id": assignment_id},
            {"_id": 0}
        ).to_list(200)
        
        for sub in submissions:
            student = await db.students.find_one(
                {"id": sub["student_id"]},
                {"first_name": 1, "last_name": 1, "enrollment_number": 1}
            )
            sub["student_name"] = f"{student['first_name']} {student['last_name']}" if student else None
            sub["enrollment_number"] = student["enrollment_number"] if student else None
            
            # Get grade if exists
            grade = await db.grades.find_one(
                {"submission_id": sub["id"]},
                {"_id": 0, "score": 1, "comments": 1}
            )
            sub["grade"] = grade
        
        assignment["submissions"] = [deserialize_datetime(s) for s in submissions]
    
    return assignment


@grades_router.put("/assignments/{assignment_id}", response_model=dict)
async def update_assignment(
    assignment_id: str,
    data: AssignmentUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update assignment"""
    check_permissions([UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Verify ownership if teacher
    query = {"id": assignment_id, "school_id": user_data["school_id"]}
    if user_data["user_type"] == UserType.TEACHER.value:
        query["teacher_id"] = user_data["user_id"]
    
    result = await db.assignments.update_one(query, {"$set": serialize_datetime(update_data)})
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    return {"message": "Assignment updated"}


@grades_router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Delete assignment"""
    check_permissions([UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value], user_data)
    
    query = {"id": assignment_id, "school_id": user_data["school_id"]}
    if user_data["user_type"] == UserType.TEACHER.value:
        query["teacher_id"] = user_data["user_id"]
    
    result = await db.assignments.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Also delete related submissions and grades
    await db.submissions.delete_many({"assignment_id": assignment_id})
    await db.grades.delete_many({"assignment_id": assignment_id})
    
    return {"message": "Assignment deleted"}


# Student assignments (what students see)
@grades_router.get("/my-assignments", response_model=List[dict])
async def get_student_assignments(user_data: dict = Depends(get_current_user_data)):
    """Get assignments for current student"""
    # Get student record
    if user_data["user_type"] == UserType.STUDENT.value:
        student = await db.students.find_one({"user_id": user_data["user_id"]})
    elif user_data["user_type"] == UserType.PARENT.value:
        # Get first child's assignments for now
        link = await db.parent_students.find_one({"parent_id": user_data["user_id"]})
        if link:
            student = await db.students.find_one({"id": link["student_id"]})
        else:
            return []
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if not student:
        return []
    
    # Get published assignments for student's class
    assignments = await db.assignments.find({
        "school_id": user_data["school_id"],
        "class_id": student.get("class_id"),
        "status": AssignmentStatus.PUBLISHED.value
    }, {"_id": 0}).sort("due_date", 1).to_list(50)
    
    result = []
    for assignment in assignments:
        assignment = deserialize_datetime(assignment)
        # Get subject name
        subject = await db.subjects.find_one({"id": assignment["subject_id"]}, {"name": 1})
        assignment["subject_name"] = subject["name"] if subject else None
        
        # Get submission status
        submission = await db.submissions.find_one({
            "assignment_id": assignment["id"],
            "student_id": student["id"]
        }, {"_id": 0})
        
        assignment["submission"] = deserialize_datetime(submission) if submission else None
        
        # Get grade if graded
        if submission:
            grade = await db.grades.find_one({
                "submission_id": submission["id"]
            }, {"_id": 0, "score": 1, "max_score": 1, "percentage": 1, "comments": 1})
            assignment["grade"] = grade
        
        result.append(assignment)
    
    return result


# Submissions
@grades_router.post("/submissions", response_model=dict)
async def submit_assignment(
    data: SubmissionCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Submit an assignment (for students)"""
    # Get student record
    student = await db.students.find_one({"user_id": user_data["user_id"]})
    if not student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student record not found"
        )
    
    # Get assignment
    assignment = await db.assignments.find_one({"id": data.assignment_id})
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check if already submitted
    existing = await db.submissions.find_one({
        "assignment_id": data.assignment_id,
        "student_id": student["id"]
    })
    
    now = datetime.now(timezone.utc)
    due_date = datetime.fromisoformat(assignment["due_date"].replace('Z', '+00:00')) if isinstance(assignment["due_date"], str) else assignment["due_date"]
    is_late = now > due_date
    
    if existing:
        # Update submission
        await db.submissions.update_one(
            {"id": existing["id"]},
            {"$set": {
                "content": data.content,
                "attachment_urls": data.attachment_urls,
                "submitted_at": now.isoformat(),
                "is_late": is_late,
                "status": SubmissionStatus.LATE.value if is_late else SubmissionStatus.SUBMITTED.value,
                "updated_at": now.isoformat()
            }}
        )
        return {"message": "Submission updated", "id": existing["id"]}
    
    submission = Submission(
        school_id=user_data["school_id"],
        assignment_id=data.assignment_id,
        student_id=student["id"],
        content=data.content,
        attachment_urls=data.attachment_urls,
        submitted_at=now,
        is_late=is_late,
        status=SubmissionStatus.LATE if is_late else SubmissionStatus.SUBMITTED
    )
    
    await db.submissions.insert_one(serialize_datetime(submission.model_dump()))
    
    return {"message": "Assignment submitted", "id": submission.id}


# Grades
@grades_router.post("", response_model=dict)
async def create_grade(
    data: GradeCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Grade a submission or create a grade directly"""
    check_permissions([UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value], user_data)
    
    # Calculate percentage and letter grade
    percentage = (data.score / data.max_score) * 100
    
    # Get school's grading scale
    school = await db.schools.find_one({"id": user_data["school_id"]})
    grading_scales = school.get("settings", {}).get("grading_scales", [])
    
    letter_grade, grade_points = calculate_grade_letter(percentage, grading_scales)
    
    grade = Grade(
        school_id=user_data["school_id"],
        student_id=data.student_id,
        assignment_id=data.assignment_id,
        submission_id=data.submission_id,
        subject_id=data.subject_id,
        class_id=data.class_id,
        section_id=data.section_id,
        score=data.score,
        max_score=data.max_score,
        percentage=percentage,
        letter_grade=letter_grade,
        grade_points=grade_points,
        comments=data.comments,
        graded_by=user_data["user_id"],
        is_published=data.is_published
    )
    
    if data.is_published:
        grade.published_at = datetime.now(timezone.utc)
    
    await db.grades.insert_one(serialize_datetime(grade.model_dump()))
    
    # Update submission status if applicable
    if data.submission_id:
        await db.submissions.update_one(
            {"id": data.submission_id},
            {"$set": {"status": SubmissionStatus.GRADED.value}}
        )
    
    return {"message": "Grade created", "id": grade.id}


@grades_router.post("/bulk", response_model=dict)
async def bulk_create_grades(
    data: BulkGradeCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create grades for multiple students"""
    check_permissions([UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value], user_data)
    
    school = await db.schools.find_one({"id": user_data["school_id"]})
    grading_scales = school.get("settings", {}).get("grading_scales", [])
    
    created_count = 0
    for record in data.grades:
        percentage = (record.score / data.max_score) * 100
        letter_grade, grade_points = calculate_grade_letter(percentage, grading_scales)
        
        # Check if grade already exists
        existing = await db.grades.find_one({
            "student_id": record.student_id,
            "assignment_id": data.assignment_id
        })
        
        if existing:
            await db.grades.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "score": record.score,
                    "max_score": data.max_score,
                    "percentage": percentage,
                    "letter_grade": letter_grade,
                    "grade_points": grade_points,
                    "comments": record.comments,
                    "is_published": data.is_published,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            grade = Grade(
                school_id=user_data["school_id"],
                student_id=record.student_id,
                assignment_id=data.assignment_id,
                subject_id=data.subject_id,
                class_id=data.class_id,
                section_id=data.section_id,
                score=record.score,
                max_score=data.max_score,
                percentage=percentage,
                letter_grade=letter_grade,
                grade_points=grade_points,
                comments=record.comments,
                graded_by=user_data["user_id"],
                is_published=data.is_published
            )
            
            if data.is_published:
                grade.published_at = datetime.now(timezone.utc)
            
            await db.grades.insert_one(serialize_datetime(grade.model_dump()))
        
        created_count += 1
    
    return {"message": f"Created/updated {created_count} grades"}


@grades_router.get("/student/{student_id}", response_model=dict)
async def get_student_grades(
    student_id: str,
    subject_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get grades for a student"""
    query = {
        "school_id": user_data["school_id"],
        "student_id": student_id,
        "is_published": True
    }
    if subject_id:
        query["subject_id"] = subject_id
    
    grades = await db.grades.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Group by subject
    by_subject = {}
    for grade in grades:
        grade = deserialize_datetime(grade)
        subj_id = grade["subject_id"]
        if subj_id not in by_subject:
            subject = await db.subjects.find_one({"id": subj_id}, {"name": 1, "code": 1})
            by_subject[subj_id] = {
                "subject_id": subj_id,
                "subject_name": subject["name"] if subject else None,
                "subject_code": subject["code"] if subject else None,
                "grades": [],
                "total_score": 0,
                "total_max": 0
            }
        
        # Get assignment info
        if grade.get("assignment_id"):
            assignment = await db.assignments.find_one(
                {"id": grade["assignment_id"]},
                {"title": 1, "assignment_type": 1}
            )
            grade["assignment_title"] = assignment["title"] if assignment else None
            grade["assignment_type"] = assignment["assignment_type"] if assignment else None
        
        by_subject[subj_id]["grades"].append(grade)
        by_subject[subj_id]["total_score"] += grade["score"]
        by_subject[subj_id]["total_max"] += grade["max_score"]
    
    # Calculate averages
    for subj_id in by_subject:
        total = by_subject[subj_id]["total_max"]
        if total > 0:
            by_subject[subj_id]["average_percentage"] = round(
                (by_subject[subj_id]["total_score"] / total) * 100, 2
            )
        else:
            by_subject[subj_id]["average_percentage"] = 0
    
    return {
        "student_id": student_id,
        "subjects": list(by_subject.values())
    }


@grades_router.get("/my-grades", response_model=dict)
async def get_my_grades(
    student_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get grades for current user (student/parent)"""
    if user_data["user_type"] == UserType.STUDENT.value:
        student = await db.students.find_one({"user_id": user_data["user_id"]})
        if not student:
            return {"subjects": []}
        target_student_id = student["id"]
    elif user_data["user_type"] == UserType.PARENT.value:
        if student_id:
            # Verify parent has access to this student
            link = await db.parent_students.find_one({
                "parent_id": user_data["user_id"],
                "student_id": student_id
            })
            if not link:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            target_student_id = student_id
        else:
            # Get first child
            link = await db.parent_students.find_one({"parent_id": user_data["user_id"]})
            if not link:
                return {"subjects": []}
            target_student_id = link["student_id"]
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Reuse student grades endpoint logic
    return await get_student_grades(target_student_id, None, user_data)


@grades_router.put("/{grade_id}", response_model=dict)
async def update_grade(
    grade_id: str,
    data: GradeUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update a grade"""
    check_permissions([UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Recalculate if score changed
    if "score" in update_data:
        grade = await db.grades.find_one({"id": grade_id})
        if grade:
            max_score = grade["max_score"]
            percentage = (update_data["score"] / max_score) * 100
            
            school = await db.schools.find_one({"id": user_data["school_id"]})
            grading_scales = school.get("settings", {}).get("grading_scales", [])
            letter_grade, grade_points = calculate_grade_letter(percentage, grading_scales)
            
            update_data["percentage"] = percentage
            update_data["letter_grade"] = letter_grade
            update_data["grade_points"] = grade_points
    
    if "is_published" in update_data and update_data["is_published"]:
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.grades.update_one(
        {"id": grade_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    return {"message": "Grade updated"}


# Gradebook categories
@grades_router.post("/categories", response_model=dict)
async def create_gradebook_category(
    data: GradebookCategoryCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a gradebook category"""
    check_permissions([UserType.TEACHER.value, UserType.SCHOOL_ADMIN.value], user_data)
    
    category = GradebookCategory(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.gradebook_categories.insert_one(serialize_datetime(category.model_dump()))
    
    return {"message": "Category created", "id": category.id}


@grades_router.get("/categories/{class_id}/{subject_id}", response_model=List[dict])
async def get_gradebook_categories(
    class_id: str,
    subject_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Get gradebook categories for a class/subject"""
    categories = await db.gradebook_categories.find({
        "school_id": user_data["school_id"],
        "class_id": class_id,
        "subject_id": subject_id
    }, {"_id": 0}).to_list(20)
    
    return [deserialize_datetime(c) for c in categories]
