import json
import logging
from pathlib import Path
from pprint import pprint
from urllib.parse import urljoin
from urllib.request import urlopen

import xlrd

from head import get_sheet_information
from memory_logging import setup_memory_logging
from schedule import (
    add_cell_sizes,
    get_group_cells,
    get_lessons,
    get_time_cells,
    get_time_column,
    get_weekday_cells,
)

FIELDS_OF_STUDY = []
logger = logging.getLogger("schedule_parsing.main")


def get_sources():
    config_path = Path(__file__).parent / "configs" / "source.json"
    with config_path.open(encoding="utf-8") as source:
        config = json.load(source)

    base_url = config["baseUrl"].rstrip("/") + "/"
    sources = {}
    for filename in config["files"]:
        sources[filename] = urljoin(base_url, filename)

    return sources


def load_workbook(url):
    with urlopen(url, timeout=30) as response:
        contents = response.read()

    return xlrd.open_workbook(file_contents=contents, formatting_info=True)


def main(log_buffer=None):
    if log_buffer is None:
        log_buffer = setup_memory_logging()
    logger.info("Начало обработки расписания")
    sources = get_sources()
    final_schedule = []
    for filename, url in sources.items():
        logger.info("Загрузка файла %s", filename)
        try:
            workbook = load_workbook(url)
        except (OSError, xlrd.XLRDError) as error:
            logger.error("Не удалось прочитать %s: %s", filename, error)
            raise

        with workbook:
            for sheet in workbook.sheets():
                logger.info("Обработка листа: %s / %s", filename, sheet.name.strip())
                information = get_sheet_information(filename, sheet)

                weekdays = get_weekday_cells(sheet)
                groups = get_group_cells(sheet)
                time_column = get_time_column(sheet)
                times = get_time_cells(sheet, weekdays, time_column)

                if not weekdays:
                    logger.warning("%s / %s: дни недели не найдены", filename, sheet.name.strip())
                if not groups:
                    logger.warning("%s / %s: группы не найдены", filename, sheet.name.strip())
                if time_column is None:
                    logger.warning("%s / %s: столбец часов не найден", filename, sheet.name.strip())

                weekdays = add_cell_sizes(sheet, weekdays)
                groups = add_cell_sizes(sheet, groups)
                times = add_cell_sizes(sheet, times)

                lessons = get_lessons(sheet, groups, weekdays, times)
                logger.info("%s / %s: собрано занятий — %s", filename, sheet.name.strip(), len(lessons))

                # print(f"\n=== {filename} / {sheet.name.strip()} ===")
                # pprint(information, sort_dicts=False, width=120)

                # print("Дни недели:")
                # pprint(weekdays, sort_dicts=False, width=120)

                # print("Группы:")
                # pprint(groups, sort_dicts=False, width=120)

                # print("Столбец с часами:", time_column)

                # print("Время:")
                # pprint(times, sort_dicts=False, width=120)

                # print("Занятия:")
                # pprint(lessons, sort_dicts=False, width=120)

                for lesson in lessons:
                    record = {**lesson, **information}
                    final_schedule.append(record)

    logger.info("Обработка завершена. Всего записей: %s", len(final_schedule))
    print("\nИтоговое расписание:")
    pprint(final_schedule, sort_dicts=False, width=120)

    logs = log_buffer.getvalue().splitlines()
    print("\nЛоги:")
    for message in logs:
        print(message)

    return final_schedule


if __name__ == "__main__":
    main()
