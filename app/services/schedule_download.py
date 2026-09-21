
import requests
from pathlib import Path
from config import get_settings


headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
    )
}


def download_file(name: str) -> Path:
    settings = get_settings()
    save_to = settings.base_path_download / name

    response = requests.get(
        str(settings.base_url) + name,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()

    content = response.content
    if content.lstrip().lower().startswith((b"<html", b"<!doctype")):
        raise ValueError("Сервер вернул HTML вместо Excel-файла")

    settings.base_path_download.mkdir(parents=True, exist_ok=True)
    save_to.write_bytes(content)
    return save_to
