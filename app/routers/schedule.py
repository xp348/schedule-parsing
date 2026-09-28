from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import Settings, get_settings
from app.schemas.schedule import ScheduleItem
from app.services.schedule import search_schedule

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("", response_model=list[ScheduleItem])
def get_schedule(
    keyword: Annotated[str, Query(min_length=3)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[ScheduleItem]:
    keyword = keyword.strip()
    if not keyword:
        raise HTTPException(status_code=422, detail="Введите строку поиска")
    return search_schedule(keyword, settings)
