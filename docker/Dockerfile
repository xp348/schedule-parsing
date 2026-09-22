FROM python:3.13-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /usr/local/bin/uv

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY app ./app
RUN useradd --create-home appuser && mkdir -p /app/docs && chown appuser:appuser /app/docs
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
