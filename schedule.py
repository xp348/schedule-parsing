import logging
import re

logger = logging.getLogger("schedule_parsing.schedule")

WEEKDAYS = {
    "понедельник",
    "вторник",
    "среда",
    "четверг",
    "пятница",
    "суббота",
    "воскресенье",
}


def add_cell_sizes(sheet, cells):
    """Возвращает новый словарь с полными размерами ячеек в столбцах и строках."""
    if not sheet.book.formatting_info:
        raise ValueError("Откройте книгу с formatting_info=True для чтения объединений.")

    result = {}
    for address, value in cells.items():
        row_text, column_text = address[1:].split("C")
        row = int(row_text) - 1
        column = int(column_text) - 1

        width = 1
        height = 1
        for first_row, last_row, first_column, last_column in sheet.merged_cells:
            if first_row <= row < last_row and first_column <= column < last_column:
                width = last_column - first_column
                height = last_row - first_row
                break

        result[address] = {"v": value, "col": width, "row": height}

    return result


def get_weekday_cells(sheet):
    """Читает столбец A с восьмой строки: {'R17C1': 'ВТОРНИК'}."""
    weekdays = {}
    for row in range(7, sheet.nrows):
        text = str(sheet.cell_value(row, 0)).strip()
        if not text:
            continue

        # В ячейке может быть день вместе с датой — сохраняем только день.
        weekday = text.split()[0].casefold()
        if weekday in WEEKDAYS:
            address = f"R{row + 1}C1"
            weekdays[address] = weekday.upper()

    return weekdays


def get_group_cells(sheet):
    """Читает только ячейки с группами в строке 8: {'R8C4': 'ЭК-26-1'}."""
    pattern = (
        r"([А-ЯЁа-яё]+\s*-\s*\d{2}(?:оз|з)?(?:-\d+(?:,\d+)*)?)"
        r"(?:\s*\([^)]*\))?"
    )
    groups = {}
    for column in range(sheet.ncols):
        text = " ".join(str(sheet.cell_value(7, column)).split())
        match = re.fullmatch(pattern, text)
        if match:
            address = f"R8C{column + 1}"
            groups[address] = match.group(1).replace(" ", "")

    return groups


def get_time_column(sheet):
    """Возвращает номер столбца с часами (с 1) или None, если кандидатов нет."""
    if not sheet.book.formatting_info:
        raise ValueError("Откройте книгу с formatting_info=True для чтения ширины столбцов.")

    groups = get_group_cells(sheet)
    if not groups:
        return None

    first_group_address = next(iter(groups))
    first_group_column = int(first_group_address.split("C")[1]) - 1

    time_column = None
    widest_width = -1
    for column in range(1, first_group_column):
        width = sheet.computed_column_width(column)
        if width > widest_width:
            widest_width = width
            time_column = column + 1

    return time_column


def get_time_cells(sheet, weekdays, time_column):
    """Собирает ячейки с интервалами времени: {'R10C3': '8.40-10.10'}."""
    if not weekdays or time_column is None:
        return {}

    day_rows = []
    for address in weekdays:
        row = int(address.split("C")[0][1:]) - 1
        day_rows.append(row)

    first_row = min(day_rows)
    last_day_row = max(day_rows)
    last_row = sheet.nrows
    # Объединённая ячейка последнего дня задаёт конец расписания.
    for start_row, end_row, start_column, end_column in sheet.merged_cells:
        if start_row == last_day_row and start_column == 0:
            last_row = end_row
            break

    pattern = (
        r"\d{1,2}[.:]\d{2}(?::\d{2})?\.?"
        r"\s*[-–—]\s*"
        r"\d{1,2}[.:]\d{2}(?::\d{2})?"
    )
    times = {}
    for row in range(first_row, last_row):
        text = " ".join(str(sheet.cell_value(row, time_column - 1)).split())
        if re.fullmatch(pattern, text):
            address = f"R{row + 1}C{time_column}"
            times[address] = text

    return times


def get_value_for_row(cells, row):
    """Находит значение, чей диапазон включает строку с номером row (с 1)."""
    for address, cell in cells.items():
        first_row = int(address.split("C")[0][1:])
        last_row = first_row + cell["row"]
        if first_row <= row < last_row:
            return cell["v"]

    return None


def get_cell_text(sheet, row, column):
    """Читает текст с учётом объединений. Номера строки и столбца — с 1."""
    row_index = row - 1
    column_index = column - 1
    for first_row, last_row, first_column, last_column in sheet.merged_cells:
        if first_row <= row_index < last_row and first_column <= column_index < last_column:
            row_index = first_row
            column_index = first_column
            break

    value = sheet.cell_value(row_index, column_index)
    return " ".join(str(value).split())


def get_classroom(sheet, row, column):
    """Идёт вправо от урока до первого другого значения или пустой ячейки."""
    lesson = get_cell_text(sheet, row, column)
    for next_column in range(column + 1, sheet.ncols + 1):
        text = get_cell_text(sheet, row, next_column)
        if text != lesson:
            return text or None

    return None


def get_week_parity(lesson):
    """Распознаёт только явную начальную пометку «н.» или «ч.»."""
    match = re.match(r"^\s*([нч])\.\s*", lesson, flags=re.IGNORECASE)
    if not match:
        return None

    remainder = lesson[match.end():]
    # Составные и противоречивые обозначения не считаем стандартным случаем.
    if re.match(r"^(?:[нч]\.|[/,;|])", remainder, flags=re.IGNORECASE):
        return None
    if re.search(r"[;|/]\s*[нч]\.", remainder, flags=re.IGNORECASE):
        return None

    return {"н": "odd", "ч": "even"}[match.group(1).casefold()]


def get_lessons(sheet, groups, weekdays, times):
    """Собирает занятия по столбцам групп. Ожидает словари с размерами ячеек."""
    lessons = []
    for address, group in groups.items():
        row_text, column_text = address[1:].split("C")
        first_row = int(row_text) + group["row"]
        column = int(column_text)
        seen_lessons = set()

        for row in range(first_row, sheet.nrows + 1):
            weekday = get_value_for_row(weekdays, row)
            if weekday is None:
                continue

            lesson = get_cell_text(sheet, row, column)
            if not lesson:
                continue

            time = get_value_for_row(times, row)
            classroom = get_classroom(sheet, row, column)
            # Объединённая ячейка читается из каждой строки и для каждой группы.
            # Внутри одной группы и интервала сохраняем занятие только один раз.
            key = (weekday, time, lesson, classroom)
            if key in seen_lessons:
                continue
            seen_lessons.add(key)
            if time is None:
                logger.warning(
                    "%s / R%sC%s / %s: для занятия не найдено время",
                    sheet.name.strip(), row, column, group["v"],
                )
            lessons.append({
                "group": group["v"],
                "time": time,
                "weekday": weekday,
                "lesson": lesson,
                "week_parity": get_week_parity(lesson),
                "classroom": classroom,
            })

    return lessons
