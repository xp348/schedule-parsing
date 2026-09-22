from collections import OrderedDict
from pathlib import Path
from threading import Lock
from time import monotonic

import requests

from app.exceptions import ScheduleDownloadError, ScheduleTimeoutError

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
    )
}

CACHE_TTL_SECONDS = 15 * 60
CACHE_MAX_FILES = 32
_cache: OrderedDict[str, tuple[float, bytes]] = OrderedDict()
_cache_lock = Lock()


def _download_content(name: str, base_url: str) -> bytes:
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
    return content


def invalidate_downloads(names: list[str], *, base_url: str) -> None:
    """Не оставляем в кэше файлы, которые не удалось разобрать."""
    with _cache_lock:
        for name in names:
            _cache.pop(base_url + name, None)


def download_file(name: str, *, base_url: str, directory: Path) -> Path:
    """Сохраняем копию файла; успешную загрузку кэшируем на 15 минут."""
    url = base_url + name
    save_to = directory / name
    directory.mkdir(parents=True, exist_ok=True)

    # Блокировка объединяет одновременные загрузки в рамках процесса.
    with _cache_lock:
        now = monotonic()
        for key, (expires_at, _) in list(_cache.items()):
            if expires_at <= now:
                del _cache[key]

        cached = _cache.get(url)
        if cached is None:
            content = _download_content(name, base_url)
            save_to.write_bytes(content)
            _cache[url] = (monotonic() + CACHE_TTL_SECONDS, content)
            while len(_cache) > CACHE_MAX_FILES:
                _cache.popitem(last=False)
        else:
            save_to.write_bytes(cached[1])
            _cache.move_to_end(url)
    return save_to
