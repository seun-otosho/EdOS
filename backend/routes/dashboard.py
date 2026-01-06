from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone, date, timedelta
from typing import Optional

from models.user import UserType
from models.attendance import AttendanceStatus
from utils.auth import get_current_user_data
from utils.helpers import deserialize_datetime, calculate_attendance_percentage

dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

db = None

def set_db(database):
    global db
    db = database


@dashboard_router.get("/admin")
async def get_admin_dashboard(user_data: dict = Depends(get_current_user_data)):
    """Get dashboard data for school administrators"""
    school_id = user_data["school_id"]
    
    # Get counts
    total_students = await db.students.count_documents({
        "school_id": school_id,
        "status": "active"
    })
    
    total_teachers = await db.users.count_documents({
        "school_id": school_id,
        "user_type": UserType.TEACHER.value,
        "status": "active"
    })
    
    total_parents = await db.users.count_documents({
        "school_id": school_id,
        "user_type": UserType.PARENT.value,
        "status": "active"
    })
    
    total_classes = await db.classes.count_documents({
        "school_id": school_id,
        "status": "active"
    })
    
    # Today's attendance
    today = date.today().isoformat()
    attendance_marked = await db.attendance.count_documents({
        "school_id": school_id,
        "date": today
    })
    
    present_today = await db.attendance.count_documents({
        "school_id": school_id,
        "date": today,
        "status": AttendanceStatus.PRESENT.value
    })
    
    # Pending leave requests
    pending_leaves = await db.leave_requests.count_documents({
        "school_id": school_id,
        "status": "pending"
    })
    
    # Recent activities
    recent_students = await db.students.find(
        {"school_id": school_id},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Classes with student counts
    classes = await db.classes.find(
        {"school_id": school_id, "status": "active"},
        {"_id": 0}
    ).to_list(20)
    
    class_stats = []
    for cls in classes:
        student_count = await db.students.count_documents({
            "class_id": cls["id"],
            "status": "active"
        })
        class_stats.append({
            "id": cls["id"],
            "name": cls["name"],
            "grade_level": cls["grade_level"],
            "student_count": student_count,
            "capacity": cls.get("capacity", 40)
        })
    
    return {
        "stats": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_parents": total_parents,
            "total_classes": total_classes,
            "attendance_marked_today": attendance_marked,
            "present_today": present_today,
            "attendance_rate": round((present_today / attendance_marked * 100), 1) if attendance_marked > 0 else 0,
            "pending_leave_requests": pending_leaves
        },
        "recent_students": [deserialize_datetime(s) for s in recent_students],
        "class_stats": class_stats
    }


@dashboard_router.get("/teacher")
async def get_teacher_dashboard(user_data: dict = Depends(get_current_user_data)):
    """Get dashboard data for teachers"""
    if user_data["user_type"] != UserType.TEACHER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    teacher_id = user_data["user_id"]
    # school_id is available from user_data if needed
    
    # Get teacher's class assignments
    assignments = await db.class_subjects.find(
        {"teacher_id": teacher_id},
        {"_id": 0}
    ).to_list(50)
    
    class_ids = list(set(a["class_id"] for a in assignments))
    
    # Get classes
    my_classes = []
    total_students = 0
    for class_id in class_ids:
        cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
        if cls:
            student_count = await db.students.count_documents({
                "class_id": class_id,
                "status": "active"
            })
            total_students += student_count
            cls["student_count"] = student_count
            my_classes.append(deserialize_datetime(cls))
    
    # Today's classes from timetable
    today_day = date.today().strftime("%A").lower()
    today_schedule = await db.timetable_slots.find({
        "teacher_id": teacher_id,
        "day_of_week": today_day
    }, {"_id": 0}).sort("start_time", 1).to_list(20)
    
    for slot in today_schedule:
        subject = await db.subjects.find_one({"id": slot["subject_id"]}, {"name": 1})
        slot["subject_name"] = subject["name"] if subject else None
        cls = await db.classes.find_one({"id": slot["class_id"]}, {"name": 1})
        slot["class_name"] = cls["name"] if cls else None
    
    # Pending submissions to grade
    my_assignment_ids = []
    my_assignments = await db.assignments.find(
        {"teacher_id": teacher_id},
        {"id": 1}
    ).to_list(100)
    my_assignment_ids = [a["id"] for a in my_assignments]
    
    pending_grading = await db.submissions.count_documents({
        "assignment_id": {"$in": my_assignment_ids},
        "status": "submitted"
    })
    
    # Recent assignments
    recent_assignments = await db.assignments.find(
        {"teacher_id": teacher_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for assignment in recent_assignments:
        subject = await db.subjects.find_one({"id": assignment["subject_id"]}, {"name": 1})
        assignment["subject_name"] = subject["name"] if subject else None
    
    return {
        "stats": {
            "total_classes": len(my_classes),
            "total_students": total_students,
            "pending_grading": pending_grading,
            "today_classes": len(today_schedule)
        },
        "my_classes": my_classes,
        "today_schedule": [deserialize_datetime(s) for s in today_schedule],
        "recent_assignments": [deserialize_datetime(a) for a in recent_assignments]
    }


@dashboard_router.get("/parent")
async def get_parent_dashboard(user_data: dict = Depends(get_current_user_data)):
    """Get dashboard data for parents"""
    if user_data["user_type"] != UserType.PARENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get linked children
    links = await db.parent_students.find(
        {"parent_id": user_data["user_id"]},
        {"_id": 0}
    ).to_list(10)
    
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
                cls = await db.classes.find_one(
                    {"id": student["class_id"]},
                    {"name": 1, "grade_level": 1}
                )
                student["class_name"] = cls["name"] if cls else None
            
            # Get recent attendance
            recent_attendance = await db.attendance.find(
                {"student_id": student["id"]},
                {"_id": 0}
            ).sort("date", -1).limit(30).to_list(30)
            
            present = sum(1 for a in recent_attendance if a["status"] == AttendanceStatus.PRESENT.value)
            student["attendance_percentage"] = calculate_attendance_percentage(present, len(recent_attendance))
            
            # Get recent grades
            recent_grades = await db.grades.find(
                {"student_id": student["id"], "is_published": True},
                {"_id": 0}
            ).sort("created_at", -1).limit(5).to_list(5)
            
            for grade in recent_grades:
                subject = await db.subjects.find_one({"id": grade["subject_id"]}, {"name": 1})
                grade["subject_name"] = subject["name"] if subject else None
            
            student["recent_grades"] = [deserialize_datetime(g) for g in recent_grades]
            
            # Get pending assignments
            pending_assignments = await db.assignments.count_documents({
                "class_id": student.get("class_id"),
                "status": "published",
                "due_date": {"$gte": datetime.now(timezone.utc).isoformat()}
            })
            student["pending_assignments"] = pending_assignments
            
            children.append(student)
    
    # Get school announcements
    announcements = await db.announcements.find(
        {"school_id": user_data["school_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "children": children,
        "announcements": [deserialize_datetime(a) for a in announcements]
    }


@dashboard_router.get("/student")
async def get_student_dashboard(user_data: dict = Depends(get_current_user_data)):
    """Get dashboard data for students"""
    if user_data["user_type"] != UserType.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get student record
    student = await db.students.find_one(
        {"user_id": user_data["user_id"]},
        {"_id": 0}
    )
    
    if not student:
        return {"error": "Student record not found"}
    
    student = deserialize_datetime(student)
    
    # Get class info
    if student.get("class_id"):
        cls = await db.classes.find_one(
            {"id": student["class_id"]},
            {"_id": 0, "name": 1, "grade_level": 1}
        )
        student["class_info"] = cls
    
    # Get today's schedule
    today_day = date.today().strftime("%A").lower()
    schedule = await db.timetable_slots.find({
        "class_id": student.get("class_id"),
        "day_of_week": today_day
    }, {"_id": 0}).sort("start_time", 1).to_list(20)
    
    for slot in schedule:
        subject = await db.subjects.find_one({"id": slot["subject_id"]}, {"name": 1})
        slot["subject_name"] = subject["name"] if subject else None
        if slot.get("teacher_id"):
            teacher = await db.users.find_one(
                {"id": slot["teacher_id"]},
                {"first_name": 1, "last_name": 1}
            )
            slot["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}" if teacher else None
    
    # Get attendance summary
    attendance_records = await db.attendance.find(
        {"student_id": student["id"]},
        {"_id": 0}
    ).sort("date", -1).limit(30).to_list(30)
    
    present = sum(1 for a in attendance_records if a["status"] == AttendanceStatus.PRESENT.value)
    attendance_percentage = calculate_attendance_percentage(present, len(attendance_records))
    
    # Get upcoming assignments
    upcoming_assignments = await db.assignments.find({
        "class_id": student.get("class_id"),
        "status": "published",
        "due_date": {"$gte": datetime.now(timezone.utc).isoformat()}
    }, {"_id": 0}).sort("due_date", 1).limit(5).to_list(5)
    
    for assignment in upcoming_assignments:
        subject = await db.subjects.find_one({"id": assignment["subject_id"]}, {"name": 1})
        assignment["subject_name"] = subject["name"] if subject else None
        
        # Check submission status
        submission = await db.submissions.find_one({
            "assignment_id": assignment["id"],
            "student_id": student["id"]
        }, {"status": 1})
        assignment["submission_status"] = submission["status"] if submission else "not_submitted"
    
    # Get recent grades
    recent_grades = await db.grades.find(
        {"student_id": student["id"], "is_published": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for grade in recent_grades:
        subject = await db.subjects.find_one({"id": grade["subject_id"]}, {"name": 1})
        grade["subject_name"] = subject["name"] if subject else None
    
    return {
        "student": student,
        "today_schedule": [deserialize_datetime(s) for s in schedule],
        "attendance": {
            "percentage": attendance_percentage,
            "recent_count": len(attendance_records)
        },
        "upcoming_assignments": [deserialize_datetime(a) for a in upcoming_assignments],
        "recent_grades": [deserialize_datetime(g) for g in recent_grades]
    }
