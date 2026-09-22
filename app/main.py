import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse

from app.config import get_settings
from app.exceptions import (
    ScheduleDownloadError,
    ScheduleError,
    ScheduleParseError,
    ScheduleStorageError,
    ScheduleTimeoutError,
)
from app.routers import schedule

logger = logging.getLogger(__name__)

ERROR_STATUS_CODES = {
    ScheduleTimeoutError: 504,
    ScheduleDownloadError: 502,
    ScheduleParseError: 502,
    ScheduleStorageError: 500,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings()
    logger.info("Starting")

    yield

    logger.info("Stopping")


app = FastAPI(lifespan=lifespan)


@app.exception_handler(ScheduleError)
async def handle_schedule_error(request: Request, exc: ScheduleError) -> JSONResponse:
    logger.error("Ошибка обработки расписания: %s", exc, exc_info=exc)
    return JSONResponse(
        status_code=ERROR_STATUS_CODES.get(type(exc), 500),
        content={"detail": str(exc)},
    )


app.include_router(schedule.router)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(Path(__file__).resolve().parent / "static" / "index.html")


@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}
