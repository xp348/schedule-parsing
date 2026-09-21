import logging
import requests
from fastapi import APIRouter, HTTPException
from app.services.find_schedule import find_schedule,post_process_schedule
from app.services.schedule_download import download_file
from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/schedule',tags=["schedule"])


@router.get("")
async def read_users(keyword: str):

    for name  in get_settings().files:
        try:
            download_file(name)
        except requests.Timeout as exc:
            logger.exception("Таймаут скачивания %s", name)
            raise HTTPException(
                status_code=504,
                detail=f"Сервер расписания не ответил вовремя: {name}",
            ) from exc
        except (requests.RequestException, ValueError) as exc:
            logger.exception("Ошибка загрузки расписания %s", name)
            raise HTTPException(
                status_code=502,
                detail=f"Не удалось получить расписание: {name}",
            ) from exc
        except OSError as exc:
            logger.exception("Ошибка сохранения %s", name)
            raise HTTPException(
                status_code=500,
                detail="Не удалось сохранить расписание",
            ) from exc

    results_raw = find_schedule(
    [get_settings().base_path_download / file for file in get_settings().files],
    "Громов",
)
    results = post_process_schedule(results_raw, start_time_only=True)

    return results
