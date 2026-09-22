# Поиск по расписанию

## Настройки

Создайте `.env` на основе `.env.example`. Укажите настоящий `BASE_URL`
(адрес каталога расписаний с завершающим `/`) и имена Excel-файлов:

```dotenv
BASE_URL=https://example.org/schedule/
FILES='["1-ochnoe.xls","4-ochnoe-mag.xls"]'
BASE_PATH_DOWNLOAD=docs
```

## Docker Compose

```sh
docker compose -f docker/compose.yaml up --build -d
```

Откройте http://localhost:18080 — страницу поиска. Документация API:
http://localhost:18080/docs.

Проект Compose: `schedule-search`, контейнер: `schedule-search-app`,
образ: `schedule-search:local`. Внешний порт по умолчанию — `18080`.
Если он занят, задайте другой порт через переменную окружения `APP_PORT`.
Например, в PowerShell:

```powershell
$env:APP_PORT = "18081"
docker compose -f docker/compose.yaml up --build -d
```

Файлы развертывания находятся в `docker/`. Команды выполняются из корня проекта.
`Dockerfile.dockerignore` задаёт исключения для сборки образа.
Compose передаёт настройки из корневого `.env`, но задаёт путь загрузки внутри контейнера
как `/app/docs`. Успешные загрузки кэшируются в памяти процесса на 15 минут
с момента завершения скачивания. По истечении срока файл обновляется при следующем
поиске. Кэш общий для поисковых запросов, хранит до 32 файлов и очищается при
перезапуске приложения; у каждого worker свой кэш. Ошибки загрузки не кэшируются,
при ошибке разбора Excel файлы текущего набора исключаются из кэша.
Для разбора создаются временные копии файлов, которые удаляются после поиска;
постоянный том не требуется. `.env` не попадает в Docker-образ.

```sh
docker compose -f docker/compose.yaml logs -f app
docker compose -f docker/compose.yaml down
```

## Локальный запуск

```sh
uv sync --locked
uv run fastapi dev
```

Страницу нужно открывать через FastAPI, а не как файл с диска.
Поиск отправляет `GET /schedule?keyword=...`. Результаты показаны таблицей;
на узком экране доступны компактные строки и горизонтальная прокрутка всех столбцов.
