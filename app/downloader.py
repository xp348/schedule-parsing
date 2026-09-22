from pathlib import Path

import requests

from app.exceptions import ScheduleDownloadError, ScheduleTimeoutError

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
    )
}


def download_file(name: str, *, base_url: str, directory: Path) -> Path:
    save_to = directory / name
    try:
        with requests.get(base_url + name, headers=HEADERS, timeout=30) as response:
            response.raise_for_status()
            content = response.content
        if content.lstrip().lower().startswith((b"<html", b"<!doctype")):
            raise ValueError("Сервер вернул HTML вместо Excel-файла")
    except requests.Timeout as exc:
        raise ScheduleTimeoutError(
            f"Сервер расписания не ответил вовремя: {name}"
        ) from exc
    except (requests.RequestException, ValueError) as exc:
        raise ScheduleDownloadError(
            f"Не удалось получить расписание: {name}"
        ) from exc

    directory.mkdir(parents=True, exist_ok=True)
    save_to.write_bytes(content)
    return save_to
