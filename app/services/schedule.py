from pathlib import Path
from tempfile import TemporaryDirectory

from app.config import Settings
from app.downloader import download_file
from app.exceptions import ScheduleStorageError
from app.parser import find_schedule, post_process_schedule
from app.schemas.schedule import ScheduleItem


def search_schedule(keyword: str, settings: Settings) -> list[ScheduleItem]:
    try:
        settings.base_path_download.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(dir=settings.base_path_download) as directory:
            paths = [
                download_file(
                    name, base_url=str(settings.base_url), directory=Path(directory)
                )
                for name in settings.files
            ]
            results_raw = find_schedule(paths, keyword)
            results = post_process_schedule(results_raw, start_time_only=True)
            return [ScheduleItem.model_validate(item) for item in results]
    except OSError as exc:
        raise ScheduleStorageError(
            "Не удалось сохранить или прочитать расписание"
        ) from exc
