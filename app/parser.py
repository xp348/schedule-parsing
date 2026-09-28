import re
from pathlib import Path
from zipfile import BadZipFile

import xlrd
from xlrd.biffh import XLRDError
from xlrd.compdoc import CompDocError

from app.exceptions import ScheduleParseError

WEEKDAYS = (
    "понедельник", "вторник", "среда", "четверг",
    "пятница", "суббота", "воскресенье",
)

# В XLS ширина задаётся в 1/256 ширины символа. Отсекаем почти свёрнутые колонки.
MIN_TIME_COLUMN_WIDTH = 5 * 256


def excel_column_name(col: int) -> str:
    """0 -> A, 1 -> B, 25 -> Z, 26 -> AA."""
    result = ""
    col += 1
    while col:
        col, remainder = divmod(col - 1, 26)
        result = chr(65 + remainder) + result
    return result


def create_merged_map(sheet):
    """Связываем объединённые ячейки с их верхней левой ячейкой."""
    merged_map = {}
    for row_start, row_end, col_start, col_end in sheet.merged_cells:
        for row in range(row_start, row_end):
            for col in range(col_start, col_end):
                merged_map[row, col] = (row_start, col_start)
    return merged_map


def get_cell_value(sheet, merged_map, row, col):
    """Возвращаем исходное значение с учётом объединения ячеек."""
    if not (0 <= row < sheet.nrows and 0 <= col < sheet.ncols):
        return ""
    real_row, real_col = merged_map.get((row, col), (row, col))
    return sheet.cell_value(real_row, real_col)


def time_column_offset(sheet, merged_map, row, weekday_col, lesson_col) -> int | None:
    """Смещение до видимого столбца «Время»/«Часы» между днём недели и занятием.

    Заголовок ищем выше занятия, учитывая объединения, регистр и пробелы.
    Если подходящего столбца нет, возвращаем None.
    """
    for col in range(weekday_col + 1, lesson_col):
        info = sheet.colinfo_map.get(col)
        if info is not None and info.hidden:
            continue
        if sheet.computed_column_width(col) < MIN_TIME_COLUMN_WIDTH:
            continue
        for header_row in range(row - 1, -1, -1):
            header = get_cell_value(sheet, merged_map, header_row, col)
            if str(header).strip().casefold() in {"время", "часы"}:
                return col - weekday_col
    return None


def _find_schedule(file_paths: list[str | Path], keyword: str) -> list[dict]:
    """Ищем текст во всех файлах и листах, сохраняя значения как есть.

    Поиск текста не зависит от регистра. Если день, подходящий столбец времени
    или заголовок аудитории не найден, соответствующие поля остаются пустыми.
    """
    results = []
    keyword = keyword.casefold()

    for file_path in file_paths:
        with xlrd.open_workbook(file_path, formatting_info=True) as workbook:
            for sheet in workbook.sheets():
                merged_map = create_merged_map(sheet)
                for row in range(sheet.nrows):
                    for col in range(sheet.ncols):
                        # Объединённый диапазон проверяем только один раз.
                        if merged_map.get((row, col), (row, col)) != (row, col):
                            continue
                        value = sheet.cell_value(row, col)
                        if value == "" or keyword not in str(value).casefold():
                            continue

                        weekday = time = group = ""
                        for c in range(col - 1, -1, -1):
                            left_value = get_cell_value(sheet, merged_map, row, c)
                            if str(left_value).strip().casefold() in WEEKDAYS:
                                weekday = left_value
                                offset = time_column_offset(sheet, merged_map, row, c, col)
                                if offset is not None:
                                    time = get_cell_value(sheet, merged_map, row, c + offset)
                                break

                        for r in range(row - 1, -1, -1):
                            above_value = get_cell_value(sheet, merged_map, r, col + 1)
                            # В исходных файлах встречаются и «ауд.», и «ауд».
                            if str(above_value).strip().casefold().rstrip(".") == "ауд":
                                group = get_cell_value(sheet, merged_map, r, col)
                                break

                        room = get_cell_value(sheet, merged_map, row, col + 1)
                        if room == value:
                            room = get_cell_value(sheet, merged_map, row, col + 3)

                        results.append({
                            "Лист": sheet.name,
                            "День": weekday,
                            "Время": time,
                            "Группа": group,
                            "Ячейка": f"{excel_column_name(col)}{row + 1}",
                            "Содержимое": value,
                            "Ауд": room,
                        })
    return results


def post_process_schedule(
    results_raw: list[dict], *, start_time_only: bool = False
) -> list[dict]:
    """Убираем лишние пробелы, табы и переносы, сохраняя исходные записи.

    При start_time_only=True оставляем время начала без секунд.
    Нераспознанное время сохраняем без сокращения.
    """
    results = [
        {
            key: " ".join(value.split()) if isinstance(value, str) else value
            for key, value in result.items()
        }
        for result in results_raw
    ]
    if start_time_only:
        for result in results:
            time = result.get("Время")
            if isinstance(time, str):
                match = re.match(r"^((?:[01]?\d|2[0-3]):[0-5]\d)\b", time)
                if match:
                    result["Время"] = match.group(1)
    return results



def find_schedule(file_paths: list[str | Path], keyword: str) -> list[dict]:
    try:
        return _find_schedule(file_paths, keyword)
    except (XLRDError, CompDocError, BadZipFile, EOFError, ValueError) as exc:
        raise ScheduleParseError(
            "Сервер расписания вернул некорректный Excel-файл"
        ) from exc
