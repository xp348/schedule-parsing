import re
from pathlib import Path

import xlrd


WEEKDAYS = (
    "понедельник",
    "вторник",
    "среда",
    "четверг",
    "пятница",
    "суббота",
    "воскресенье",
)

TIME_RE = re.compile(
    r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b"
)

def clean_text(value) -> str:
    return " ".join(str(value).split())

def excel_column_name(col: int) -> str:
    """0 -> A, 1 -> B, 25 -> Z, 26 -> AA"""
    result = ""

    col += 1

    while col:
        col, remainder = divmod(col - 1, 26)
        result = chr(65 + remainder) + result

    return result


def create_merged_map(sheet):
    """
    Для каждой ячейки объединённого диапазона сохраняем
    координаты верхней левой ячейки.
    """
    merged_map = {}

    for row_start, row_end, col_start, col_end in sheet.merged_cells:
        for row in range(row_start, row_end):
            for col in range(col_start, col_end):
                merged_map[(row, col)] = (row_start, col_start)

    return merged_map


def get_cell_value(sheet, merged_map, row, col):
    """
    Возвращает значение ячейки с учётом объединённых ячеек.
    """
    if row < 0 or col < 0:
        return ""

    if row >= sheet.nrows or col >= sheet.ncols:
        return ""

    real_row, real_col = merged_map.get(
        (row, col),
        (row, col)
    )

    value = sheet.cell_value(real_row, real_col)

    return str(value).strip()


def find_weekday(sheet, merged_map, row, col):
    """
    Ищем день недели слева от найденной пары.
    """

    # Сначала ищем в этой же строке
    for c in range(col, -1, -1):
        value = get_cell_value(
            sheet,
            merged_map,
            row,
            c
        ).lower()

        for weekday in WEEKDAYS:
            if weekday in value:
                return weekday.capitalize()

    # Если не нашли — немного выше
    for r in range(row - 1, max(-1, row - 10), -1):
        for c in range(min(col, 5), -1, -1):
            value = get_cell_value(
                sheet,
                merged_map,
                r,
                c
            ).lower()

            for weekday in WEEKDAYS:
                if weekday in value:
                    return weekday.capitalize()

    return "Не найден"


def find_time(sheet, merged_map, row, col):

    for c in range(col, -1, -1):

        value = get_cell_value(
            sheet,
            merged_map,
            row,
            c
        )

        value = clean_text(value)

        match = TIME_RE.search(value)

        if match:
            return match.group()

    return "Не найдено"


def looks_like_group(value: str) -> bool:
    """
    Примерная проверка, похоже ли значение на название группы.

    Например:
        ИС-21
        ПИ-101
        ИСП-24-1
        23ПИ1
    """

    value = value.strip()

    if not value:
        return False

    if len(value) > 40:
        return False

    lower = value.lower()

    # Не принимаем такие значения за группу
    forbidden = (
        "ауд",
        "каб",
        "курс",
        "этаж",
        "корпус",
        "неделя",
    )

    if any(word in lower for word in forbidden):
        return False

    if TIME_RE.search(value):
        return False

    # В названии группы обычно есть и буквы, и цифры
    has_letter = bool(
        re.search(r"[A-Za-zА-Яа-яЁё]", value)
    )

    has_digit = bool(
        re.search(r"\d", value)
    )

    return has_letter and has_digit


def find_group(sheet, merged_map, row, col):
    """
    Ищем название группы над столбцом занятия.

    Обычно название группы находится в верхней части расписания.
    """

    # Проверяем этот столбец и несколько соседних
    columns = [
        col,
        col - 1,
        col + 1,
        col - 2,
        col + 2,
    ]

    # Группы обычно расположены в верхних строках документа
    max_header_row = min(row, 20)

    candidates = []

    for c in columns:

        if c < 0 or c >= sheet.ncols:
            continue

        for r in range(max_header_row):

            value = get_cell_value(
                sheet,
                merged_map,
                r,
                c
            )

            if looks_like_group(value):
                candidates.append(
                    (
                        abs(c - col),
                        -r,
                        value
                    )
                )

    if not candidates:
        return "Не найдена"

    # В первую очередь тот же столбец,
    # затем наиболее нижний заголовок
    candidates.sort()

    return candidates[0][2]


def find_schedule(
    file_path: str | Path,
    keyword: str
):
    workbook = xlrd.open_workbook(
        file_path,
        formatting_info=True
    )

    keyword = keyword.casefold()

    results = []

    for sheet in workbook.sheets():

        merged_map = create_merged_map(sheet)

        already_checked = set()

        for row in range(sheet.nrows):

            for col in range(sheet.ncols):

                real_position = merged_map.get(
                    (row, col),
                    (row, col)
                )

                if real_position in already_checked:
                    continue

                already_checked.add(real_position)

                real_row, real_col = real_position

                value = get_cell_value(
                    sheet,
                    merged_map,
                    real_row,
                    real_col
                )

                if not value:
                    continue

                if keyword not in value.casefold():
                    continue

                # Убираем повторные пробелы,
                # табы и переносы строк
                clean_value = " ".join(value.split())

                weekday = find_weekday(
                    sheet,
                    merged_map,
                    real_row,
                    real_col
                )

                time = find_time(
                    sheet,
                    merged_map,
                    real_row,
                    real_col
                )

                group = find_group(
                    sheet,
                    merged_map,
                    real_row,
                    real_col
                )

                cell_address = (
                    f"{excel_column_name(real_col)}"
                    f"{real_row + 1}"
                )

                results.append({
                    "Лист": clean_text(sheet.name),
                    "День": clean_text(weekday),
                    "Время": clean_text(time),
                    "Группа": clean_text(group),
                    "Ячейка": cell_address,
                    "Содержимое": clean_text(value),
                })

    if not results:
        print(
            f'По запросу "{keyword}" ничего не найдено'
        )
        return []

    # Ширина столбцов
    columns = [
        "Лист",
        "День",
        "Время",
        "Группа",
        "Ячейка",
        "Содержимое",
    ]

    widths = {}

    for column in columns:

        widths[column] = max(
            len(column),
            max(
                len(str(row[column]))
                for row in results
            )
        )

    # Заголовок
    header = " | ".join(
        column.ljust(widths[column])
        for column in columns
    )

    print(header)

    print("-" * len(header))

    # Строки
    for result in results:

        line = " | ".join(
            str(result[column]).ljust(widths[column])
            for column in columns
        )

        print(line)

    print()
    print(f"Всего найдено: {len(results)}")

    return results