from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routers import schedule

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting")

    yield

    print("Stopping")


app = FastAPI(lifespan=lifespan)


app.include_router(schedule.router)