import json
import logging
from pathlib import Path

from main import main
from memory_logging import setup_memory_logging


logger = logging.getLogger("schedule_parsing.export")


def export_schedule(
    output_path=Path("output/schedule.json"),
    log_path=Path("logs/schedule.log"),
):
    """Сохраняет полное расписание в JSON, а журнал — даже при ошибке."""
    log_buffer = setup_memory_logging()
    try:
        schedule = main(log_buffer=log_buffer)
        if not schedule:
            raise RuntimeError("Получено пустое расписание")

        contents = json.dumps(schedule, ensure_ascii=False, indent=2) + "\n"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = output_path.with_suffix(".tmp")
        temporary_path.write_text(contents, encoding="utf-8")
        temporary_path.replace(output_path)
        logger.info("Расписание сохранено: %s", output_path)
        return schedule
    except Exception:
        logger.exception("Экспорт расписания завершился ошибкой")
        raise
    finally:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(log_buffer.getvalue(), encoding="utf-8")


if __name__ == "__main__":
    export_schedule()
