import json
import sys
from pathlib import Path
from pprint import pprint
from urllib.parse import urljoin
from urllib.request import urlopen

import xlrd

from head import get_sheet_information
from schedule import (
    add_cell_sizes,
    get_group_cells,
    get_lessons,
    get_time_cells,
    get_time_column,
    get_weekday_cells,
)

FIELDS_OF_STUDY = []


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


def main():
    sources = get_sources()
    final_schedule = []
    for filename, url in sources.items():
        try:
            workbook = load_workbook(url)
        except (OSError, xlrd.XLRDError) as error:
            print(f"Не удалось прочитать {filename}: {error}", file=sys.stderr)
            continue

        with workbook:
            for sheet in workbook.sheets():
                information = get_sheet_information(filename, sheet)

                weekdays = get_weekday_cells(sheet)
                groups = get_group_cells(sheet)
                time_column = get_time_column(sheet)
                times = get_time_cells(sheet, weekdays, time_column)

                weekdays = add_cell_sizes(sheet, weekdays)
                groups = add_cell_sizes(sheet, groups)
                times = add_cell_sizes(sheet, times)

                lessons = get_lessons(sheet, groups, weekdays, times)

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

    print("\nИтоговое расписание:")
    pprint(final_schedule, sort_dicts=False, width=120)
    return final_schedule


if __name__ == "__main__":
    main()
