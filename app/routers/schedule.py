import logging
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated
from zipfile import BadZipFile

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from xlrd.biffh import XLRDError
from xlrd.compdoc import CompDocError

from app.schemas.schedule import ScheduleItem
from app.services.find_schedule import find_schedule, post_process_schedule
from app.services.schedule_download import download_file
from config import Settings, get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("", response_model=list[ScheduleItem])
def read_users(
    keyword: Annotated[str, Query(min_length=1)],
    settings: Annotated[Settings, Depends(get_settings)]
    ) -> list[ScheduleItem]:
    keyword = keyword.strip()
    if not keyword:
        raise HTTPException(status_code=422, detail="Введите строку поиска")

    try:
        settings.base_path_download.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(dir=settings.base_path_download) as directory:
            paths = []
            for name in settings.files:
                try:
                    paths.append(download_file(name, directory=Path(directory)))
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

            try:
                results_raw = find_schedule(paths, keyword)
            except (XLRDError, CompDocError, BadZipFile, EOFError, ValueError) as exc:
                logger.exception("Ошибка разбора расписания")
                raise HTTPException(
                    status_code=502,
                    detail="Сервер расписания вернул некорректный Excel-файл",
                ) from exc

            results = post_process_schedule(results_raw, start_time_only=True)
            return [ScheduleItem.model_validate(item) for item in results]
    except OSError as exc:
        logger.exception("Ошибка работы с файлами расписания")
        raise HTTPException(
            status_code=500,
            detail="Не удалось сохранить или прочитать расписание",
        ) from exc
