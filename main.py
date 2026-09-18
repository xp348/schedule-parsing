import requests
from pathlib import Path

from find_schedule import find_schedule 


BASE_URL = "https://norvuz.ru/upload/timetable/"
BASE_PATH_DOWNLOAD = Path("docs")

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
    )
}


def download_file(name: str):
    save_to = BASE_PATH_DOWNLOAD / name

    try:
        response = requests.get(
            BASE_URL + name,
            headers=headers,
            timeout=30
        )

        response.raise_for_status()

        if (
            response.content.startswith(b"<html")
            or response.content.startswith(b"<!DOCTYPE")
        ):
            raise RuntimeError(
                "Сервер вернул HTML вместо Excel-файла"
            )

        save_to.write_bytes(response.content)

        print("Успешно скачано")
        print("Путь:", save_to.resolve())
        print("Размер:", len(response.content), "байт")

    except requests.RequestException as e:
        print(f"Ошибка скачивания {name}:", e)

    except Exception as e:
        print(f"Ошибка {name}:", e)


if __name__ == "__main__":

    BASE_PATH_DOWNLOAD.mkdir(
        parents=True,
        exist_ok=True
    )

    files = [
        "1-ochnoe.xls",
        "4-ochnoe-mag.xls"
    ]

    for file in files:
        download_file(file)

    print("\nПОИСК В РАСПИСАНИИ\n")

    find_schedule(
        "docs/1-ochnoe.xls",
        "Громов"
    )