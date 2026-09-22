
import requests
from pathlib import Path
from config import get_settings


headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
    )
}


def download_file(name: str, *, directory: Path | None = None) -> Path:
    settings = get_settings()
    directory = directory if directory is not None else settings.base_path_download
    save_to = directory / name

    response = requests.get(
        str(settings.base_url) + name,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()

    content = response.content
    if content.lstrip().lower().startswith((b"<html", b"<!doctype")):
        raise ValueError("Сервер вернул HTML вместо Excel-файла")

    directory.mkdir(parents=True, exist_ok=True)
    save_to.write_bytes(content)
    return save_to
