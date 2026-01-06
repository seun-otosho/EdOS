from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List

from models.attendance import (
    Attendance, AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    AttendanceStatus, AttendanceType, BulkAttendanceCreate,
    AttendanceSummary, LeaveRequest, LeaveRequestCreate, LeaveRequestUpdate, LeaveStatus
)
from models.user import UserType
from utils.auth import get_current_user_data, check_permissions
from utils.helpers import serialize_datetime, deserialize_datetime, calculate_attendance_percentage

attendance_router = APIRouter(prefix="/attendance", tags=["Attendance"])

db = None

def set_db(database):
    global db
    db = database


@attendance_router.post("", response_model=dict)
async def mark_attendance(
    data: AttendanceCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Mark attendance for a single student"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.TEACHER.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    # Check if attendance already marked
    existing = await db.attendance.find_one({
        "school_id": user_data["school_id"],
        "student_id": data.student_id,
        "date": data.date.isoformat(),
        "attendance_type": data.attendance_type.value,
        "subject_id": data.subject_id
    })
    
    if existing:
        # Update existing
        await db.attendance.update_one(
            {"id": existing["id"]},
            {"$set": {
                "status": data.status.value,
                "notes": data.notes,
                "check_in_time": data.check_in_time,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Attendance updated", "id": existing["id"]}
    
    attendance = Attendance(
        school_id=user_data["school_id"],
        marked_by=user_data["user_id"],
        **data.model_dump()
    )
    
    await db.attendance.insert_one(serialize_datetime(attendance.model_dump()))
    
    return {"message": "Attendance marked", "id": attendance.id}


@attendance_router.post("/bulk", response_model=dict)
async def bulk_mark_attendance(
    data: BulkAttendanceCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Mark attendance for multiple students at once"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.TEACHER.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    marked_count = 0
    updated_count = 0
    
    for record in data.records:
        # Check if attendance already exists
        existing = await db.attendance.find_one({
            "school_id": user_data["school_id"],
            "student_id": record.student_id,
            "date": data.date.isoformat(),
            "attendance_type": data.attendance_type.value,
            "subject_id": data.subject_id
        })
        
        if existing:
            await db.attendance.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "status": record.status.value,
                    "notes": record.notes,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            updated_count += 1
        else:
            attendance = Attendance(
                school_id=user_data["school_id"],
                student_id=record.student_id,
                class_id=data.class_id,
                section_id=data.section_id,
                subject_id=data.subject_id,
                date=data.date,
                status=record.status,
                attendance_type=data.attendance_type,
                notes=record.notes,
                marked_by=user_data["user_id"]
            )
            await db.attendance.insert_one(serialize_datetime(attendance.model_dump()))
            marked_count += 1
    
    return {
        "message": "Attendance marked",
        "new_records": marked_count,
        "updated_records": updated_count
    }


@attendance_router.get("/class/{class_id}", response_model=List[dict])
async def get_class_attendance(
    class_id: str,
    attendance_date: date = Query(..., alias="date"),
    section_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get attendance for a class on a specific date"""
    # Get all students in class
    student_query = {
        "school_id": user_data["school_id"],
        "class_id": class_id,
        "status": "active"
    }
    if section_id:
        student_query["section_id"] = section_id
    
    students = await db.students.find(
        student_query,
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "enrollment_number": 1}
    ).sort("first_name", 1).to_list(200)
    
    # Get attendance records
    attendance_query = {
        "school_id": user_data["school_id"],
        "class_id": class_id,
        "date": attendance_date.isoformat()
    }
    if section_id:
        attendance_query["section_id"] = section_id
    if subject_id:
        attendance_query["subject_id"] = subject_id
    
    records = await db.attendance.find(attendance_query, {"_id": 0}).to_list(200)
    attendance_map = {r["student_id"]: deserialize_datetime(r) for r in records}
    
    # Combine student info with attendance
    result = []
    for student in students:
        student_attendance = attendance_map.get(student["id"])
        result.append({
            "student_id": student["id"],
            "student_name": f"{student['first_name']} {student['last_name']}",
            "enrollment_number": student["enrollment_number"],
            "status": student_attendance["status"] if student_attendance else None,
            "notes": student_attendance.get("notes") if student_attendance else None,
            "attendance_id": student_attendance["id"] if student_attendance else None
        })
    
    return result


@attendance_router.get("/student/{student_id}", response_model=dict)
async def get_student_attendance(
    student_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get attendance history for a student"""
    query = {
        "school_id": user_data["school_id"],
        "student_id": student_id
    }
    
    if start_date:
        query["date"] = {"$gte": start_date.isoformat()}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date.isoformat()
        else:
            query["date"] = {"$lte": end_date.isoformat()}
    
    records = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(365)
    
    # Calculate summary
    total = len(records)
    present = sum(1 for r in records if r["status"] == AttendanceStatus.PRESENT.value)
    absent = sum(1 for r in records if r["status"] == AttendanceStatus.ABSENT.value)
    late = sum(1 for r in records if r["status"] == AttendanceStatus.LATE.value)
    excused = sum(1 for r in records if r["status"] in [AttendanceStatus.EXCUSED.value, AttendanceStatus.MEDICAL.value])
    
    return {
        "records": [deserialize_datetime(r) for r in records],
        "summary": {
            "total_days": total,
            "present_days": present,
            "absent_days": absent,
            "late_days": late,
            "excused_days": excused,
            "attendance_percentage": calculate_attendance_percentage(present + late + excused, total)
        }
    }


@attendance_router.get("/summary/{class_id}", response_model=List[AttendanceSummary])
async def get_class_attendance_summary(
    class_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    section_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get attendance summary for all students in a class"""
    # Get all students in class
    student_query = {
        "school_id": user_data["school_id"],
        "class_id": class_id,
        "status": "active"
    }
    if section_id:
        student_query["section_id"] = section_id
    
    students = await db.students.find(student_query, {"_id": 0}).to_list(200)
    
    summaries = []
    for student in students:
        # Get attendance for this student
        records = await db.attendance.find({
            "student_id": student["id"],
            "date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }, {"_id": 0}).to_list(365)
        
        total = len(records)
        present = sum(1 for r in records if r["status"] == AttendanceStatus.PRESENT.value)
        absent = sum(1 for r in records if r["status"] == AttendanceStatus.ABSENT.value)
        late = sum(1 for r in records if r["status"] == AttendanceStatus.LATE.value)
        excused = sum(1 for r in records if r["status"] in [AttendanceStatus.EXCUSED.value, AttendanceStatus.MEDICAL.value])
        
        summaries.append(AttendanceSummary(
            student_id=student["id"],
            student_name=f"{student['first_name']} {student['last_name']}",
            total_days=total,
            present_days=present,
            absent_days=absent,
            late_days=late,
            excused_days=excused,
            attendance_percentage=calculate_attendance_percentage(present + late + excused, total)
        ))
    
    return summaries


@attendance_router.put("/{attendance_id}", response_model=dict)
async def update_attendance(
    attendance_id: str,
    data: AttendanceUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update attendance record"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.TEACHER.value
    ], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.attendance.update_one(
        {"id": attendance_id, "school_id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    return {"message": "Attendance updated"}


# Leave Requests
@attendance_router.post("/leave-request", response_model=dict)
async def create_leave_request(
    data: LeaveRequestCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a leave request (for parents/students)"""
    # Parents can request leave for their children
    if user_data["user_type"] == UserType.PARENT.value:
        # Verify parent is linked to student
        link = await db.parent_students.find_one({
            "parent_id": user_data["user_id"],
            "student_id": data.student_id
        })
        if not link:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to request leave for this student"
            )
    
    leave_request = LeaveRequest(
        school_id=user_data["school_id"],
        requested_by=user_data["user_id"],
        **data.model_dump()
    )
    
    await db.leave_requests.insert_one(serialize_datetime(leave_request.model_dump()))
    
    return {"message": "Leave request submitted", "id": leave_request.id}


@attendance_router.get("/leave-requests", response_model=List[dict])
async def get_leave_requests(
    status_filter: Optional[LeaveStatus] = Query(None, alias="status"),
    student_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get leave requests"""
    query = {"school_id": user_data["school_id"]}
    
    if status_filter:
        query["status"] = status_filter.value
    if student_id:
        query["student_id"] = student_id
    
    # Parents can only see their children's requests
    if user_data["user_type"] == UserType.PARENT.value:
        links = await db.parent_students.find(
            {"parent_id": user_data["user_id"]},
            {"student_id": 1}
        ).to_list(20)
        student_ids = [link["student_id"] for link in links]
        query["student_id"] = {"$in": student_ids}
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for req in requests:
        req = deserialize_datetime(req)
        # Get student info
        student = await db.students.find_one(
            {"id": req["student_id"]},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        req["student_name"] = f"{student['first_name']} {student['last_name']}" if student else None
        result.append(req)
    
    return result


@attendance_router.put("/leave-request/{request_id}", response_model=dict)
async def update_leave_request(
    request_id: str,
    data: LeaveRequestUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Approve or reject leave request"""
    check_permissions([
        UserType.SCHOOL_ADMIN.value,
        UserType.SUPER_ADMIN.value,
        UserType.TEACHER.value,
        UserType.PRINCIPAL.value
    ], user_data)
    
    update_data = {
        "status": data.status.value,
        "review_notes": data.review_notes,
        "reviewed_by": user_data["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.leave_requests.update_one(
        {"id": request_id, "school_id": user_data["school_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    # If approved, mark attendance as excused for those dates
    if data.status == LeaveStatus.APPROVED:
        leave_req = await db.leave_requests.find_one({"id": request_id})
        if leave_req:
            start = date.fromisoformat(leave_req["start_date"]) if isinstance(leave_req["start_date"], str) else leave_req["start_date"]
            end = date.fromisoformat(leave_req["end_date"]) if isinstance(leave_req["end_date"], str) else leave_req["end_date"]
            
            current = start
            while current <= end:
                # Update or create attendance record as excused
                existing = await db.attendance.find_one({
                    "student_id": leave_req["student_id"],
                    "date": current.isoformat()
                })
                if existing:
                    await db.attendance.update_one(
                        {"id": existing["id"]},
                        {"$set": {"status": AttendanceStatus.EXCUSED.value}}
                    )
                current += timedelta(days=1)
    
    return {"message": "Leave request updated"}
