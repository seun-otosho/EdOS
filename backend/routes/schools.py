from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List

from models.school import (
    School, SchoolCreate, SchoolUpdate, SchoolResponse, SchoolStatus,
    AcademicYear, AcademicYearCreate, Term, TermCreate, Holiday, HolidayCreate,
    SchoolSettings
)
from models.user import UserType
from utils.auth import get_current_user_data, check_permissions
from utils.helpers import serialize_datetime, deserialize_datetime

schools_router = APIRouter(prefix="/schools", tags=["Schools"])

db = None

def set_db(database):
    global db
    db = database


@schools_router.get("/current", response_model=SchoolResponse)
async def get_current_school(user_data: dict = Depends(get_current_user_data)):
    """Get current user's school"""
    if not user_data.get("school_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No school associated with user"
        )
    
    school = await db.schools.find_one({"id": user_data["school_id"]})
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    school = deserialize_datetime(school)
    return SchoolResponse(**school)


@schools_router.put("/current", response_model=SchoolResponse)
async def update_current_school(
    data: SchoolUpdate,
    user_data: dict = Depends(get_current_user_data)
):
    """Update current user's school"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle nested settings
    if "settings" in update_data and update_data["settings"]:
        update_data["settings"] = update_data["settings"].model_dump() if hasattr(update_data["settings"], 'model_dump') else update_data["settings"]
    
    await db.schools.update_one(
        {"id": user_data["school_id"]},
        {"$set": serialize_datetime(update_data)}
    )
    
    school = await db.schools.find_one({"id": user_data["school_id"]})
    school = deserialize_datetime(school)
    return SchoolResponse(**school)


@schools_router.post("/current/complete-setup")
async def complete_school_setup(user_data: dict = Depends(get_current_user_data)):
    """Mark school setup as complete"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    await db.schools.update_one(
        {"id": user_data["school_id"]},
        {"$set": {
            "setup_completed": True,
            "status": SchoolStatus.ACTIVE.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "School setup completed successfully"}


# Academic Year endpoints
@schools_router.post("/academic-years", response_model=dict)
async def create_academic_year(
    data: AcademicYearCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new academic year"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    academic_year = AcademicYear(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    # If this is set as current, unset others
    if data.is_current:
        await db.academic_years.update_many(
            {"school_id": user_data["school_id"]},
            {"$set": {"is_current": False}}
        )
    
    await db.academic_years.insert_one(serialize_datetime(academic_year.model_dump()))
    
    return {"message": "Academic year created", "id": academic_year.id}


@schools_router.get("/academic-years", response_model=List[dict])
async def get_academic_years(user_data: dict = Depends(get_current_user_data)):
    """Get all academic years for the school"""
    years = await db.academic_years.find(
        {"school_id": user_data["school_id"]},
        {"_id": 0}
    ).sort("start_date", -1).to_list(100)
    
    return [deserialize_datetime(y) for y in years]


@schools_router.get("/academic-years/current", response_model=dict)
async def get_current_academic_year(user_data: dict = Depends(get_current_user_data)):
    """Get current academic year"""
    year = await db.academic_years.find_one(
        {"school_id": user_data["school_id"], "is_current": True},
        {"_id": 0}
    )
    
    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current academic year set"
        )
    
    return deserialize_datetime(year)


# Terms endpoints
@schools_router.post("/terms", response_model=dict)
async def create_term(
    data: TermCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new term"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    term = Term(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    if data.is_current:
        await db.terms.update_many(
            {"school_id": user_data["school_id"]},
            {"$set": {"is_current": False}}
        )
    
    await db.terms.insert_one(serialize_datetime(term.model_dump()))
    
    return {"message": "Term created", "id": term.id}


@schools_router.get("/terms", response_model=List[dict])
async def get_terms(
    academic_year_id: Optional[str] = None,
    user_data: dict = Depends(get_current_user_data)
):
    """Get all terms for the school"""
    query = {"school_id": user_data["school_id"]}
    if academic_year_id:
        query["academic_year_id"] = academic_year_id
    
    terms = await db.terms.find(query, {"_id": 0}).sort("start_date", 1).to_list(100)
    return [deserialize_datetime(t) for t in terms]


# Holidays endpoints
@schools_router.post("/holidays", response_model=dict)
async def create_holiday(
    data: HolidayCreate,
    user_data: dict = Depends(get_current_user_data)
):
    """Create a new holiday"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    holiday = Holiday(
        school_id=user_data["school_id"],
        **data.model_dump()
    )
    
    await db.holidays.insert_one(serialize_datetime(holiday.model_dump()))
    
    return {"message": "Holiday created", "id": holiday.id}


@schools_router.get("/holidays", response_model=List[dict])
async def get_holidays(user_data: dict = Depends(get_current_user_data)):
    """Get all holidays for the school"""
    holidays = await db.holidays.find(
        {"school_id": user_data["school_id"]},
        {"_id": 0}
    ).sort("date", 1).to_list(500)
    
    return [deserialize_datetime(h) for h in holidays]


@schools_router.delete("/holidays/{holiday_id}")
async def delete_holiday(
    holiday_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """Delete a holiday"""
    check_permissions([UserType.SCHOOL_ADMIN.value, UserType.SUPER_ADMIN.value], user_data)
    
    result = await db.holidays.delete_one({
        "id": holiday_id,
        "school_id": user_data["school_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found"
        )
    
    return {"message": "Holiday deleted"}
