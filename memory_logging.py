import io
import logging


def setup_memory_logging():
    """Создаёт новый журнал в памяти для одного запуска приложения."""
    log_buffer = io.StringIO()
    handler = logging.StreamHandler(log_buffer)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s: %(message)s"))

    logger = logging.getLogger("schedule_parsing")
    # Повторный вызов main() начинает новый журнал без дублирования сообщений.
    for old_handler in logger.handlers[:]:
        logger.removeHandler(old_handler)
        old_handler.close()

    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return log_buffer
