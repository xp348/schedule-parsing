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

Откройте http://localhost:8000 — страницу поиска. Документация API:
http://localhost:8000/docs.

Файлы развертывания находятся в `docker/`. Команды выполняются из корня проекта.
`Dockerfile.dockerignore` задаёт исключения для сборки образа.
Compose передаёт настройки из корневого `.env`, но задаёт путь загрузки внутри контейнера
как `/app/docs`. Файлы каждого запроса хранятся во временной папке и удаляются
после поиска; постоянный том не требуется. `.env` не попадает в Docker-образ.

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
Поиск отправляет `GET /schedule?keyword=...`. На компьютере результаты показаны
таблицей, на узком экране — карточками с подписями всех столбцов.
