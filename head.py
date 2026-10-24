import logging
import re


logger = logging.getLogger("schedule_parsing.head")


def get_sheet_information(filename, sheet):
    """Читает и разбирает шапку листа, предупреждая о нераспознанных полях."""
    header = get_sheet_header(sheet)
    information = parse_header(header)
    warn_header(header, information, filename, sheet.name)
    return information


def get_sheet_header(sheet):
    """Собирает шапку из ячеек A5, A6 и A7, убирая лишние пробелы."""
    education_form = sheet.cell_value(4, 0)
    faculty = sheet.cell_value(5, 0)
    academic_period = sheet.cell_value(6, 0)

    return {
        "education_form": " ".join(education_form.split()),
        "faculty": " ".join(faculty.split()),
        "academic_period": " ".join(academic_period.split()),
    }


def parse_header(header):
    """Выделяет сведения из текста шапки. Неуказанные значения — None."""
    academic_period = header["academic_period"].casefold()
    course_match = re.search(r"(\d+)\s*курс", academic_period)
    semester_match = re.search(r"(\d+)\s*семестр", academic_period)

    course = int(course_match.group(1)) if course_match else None
    semester = int(semester_match.group(1)) if semester_match else None

    education_text = header["education_form"].casefold()
    education_form = None
    # Сначала проверяем составную форму: она также содержит «заочной».
    if "очно-заочной" in education_text:
        education_form = "очно-заочная"
    elif "заочной" in education_text:
        education_form = "заочная"
    elif "очной" in education_text:
        education_form = "очная"

    faculty_text = header["faculty"].casefold()
    faculties = []
    if "электроэнергетики" in faculty_text:
        faculties.append("ФЭЭиУ")
    if "горно" in faculty_text and "технологическ" in faculty_text:
        faculties.append("ГТФ")

    faculty = " и ".join(faculties) if faculties else None

    program = None
    if "магистр" in education_text:
        program = "магистратура"
    elif "бакалавр" in education_text:
        program = "бакалавриат"
    elif "специал" in education_text:
        program = "специалитет"

    return {
        "course": course,
        "semester": semester,
        "faculty": faculty,
        "education_form": education_form,
        "program": program,
    }


def warn_header(header, information, filename, sheet_name):
    """Предупреждает о сведениях, которые не удалось распознать."""
    fields = [
        ("course", "academic_period", "A7", "курс"),
        ("semester", "academic_period", "A7", "семестр"),
        ("faculty", "faculty", "A6", "факультет"),
        ("education_form", "education_form", "A5", "форма обучения"),
    ]
    # Программа обязательна для распознавания, только если упомянута в строке.
    if "по программам" in header["education_form"].casefold():
        fields.append(("program", "education_form", "A5", "программа"))

    for field, header_field, cell, description in fields:
        if information[field] is None:
            logger.warning(
                "%s / %s / %s: не распознано поле «%s». Исходная строка: %r",
                filename, sheet_name.strip(), cell, description, header[header_field],
            )
