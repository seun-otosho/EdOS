from typing import Optional, List, Any
from datetime import datetime, date, timezone


def serialize_datetime(obj: Any) -> Any:
    """Recursively serialize datetime objects to ISO format strings"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj


def deserialize_datetime(obj: Any, datetime_fields: List[str] = None) -> Any:
    """Convert ISO format strings back to datetime objects"""
    if datetime_fields is None:
        datetime_fields = ['created_at', 'updated_at', 'timestamp', 'marked_at', 
                          'submitted_at', 'published_at', 'reviewed_at', 'expires_at',
                          'last_login_at', 'due_date']
    
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if k in datetime_fields and isinstance(v, str):
                try:
                    result[k] = datetime.fromisoformat(v.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    result[k] = v
            elif k in ['date', 'start_date', 'end_date', 'enrollment_date', 'date_of_birth']:
                if isinstance(v, str):
                    try:
                        result[k] = date.fromisoformat(v)
                    except (ValueError, AttributeError):
                        result[k] = v
                else:
                    result[k] = v
            else:
                result[k] = deserialize_datetime(v, datetime_fields)
        return result
    elif isinstance(obj, list):
        return [deserialize_datetime(item, datetime_fields) for item in obj]
    return obj


def paginate_results(items: List[Any], page: int = 1, limit: int = 20) -> dict:
    """Paginate a list of items"""
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "data": items[start:end],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


def calculate_attendance_percentage(present: int, total: int) -> float:
    """Calculate attendance percentage"""
    if total == 0:
        return 0.0
    return round((present / total) * 100, 2)


def calculate_grade_letter(percentage: float, grading_scales: List[dict]) -> tuple:
    """Calculate letter grade from percentage using grading scale"""
    for scale in sorted(grading_scales, key=lambda x: x['min_score'], reverse=True):
        if percentage >= scale['min_score']:
            return scale['grade_letter'], scale['grade_point']
    return 'F', 0.0
