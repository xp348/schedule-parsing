from fastapi import FastAPI
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi.responses import FileResponse

from config import get_settings
from .routers import schedule

@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings()
    print("Starting")

    yield

    print("Stopping")


app = FastAPI(lifespan=lifespan)


app.include_router(schedule.router)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(Path(__file__).resolve().parent / "static" / "index.html")


@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}
