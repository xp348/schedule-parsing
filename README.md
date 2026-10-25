# Расписание ЗГУ

Ветка `main` содержит документацию, `.gitignore` и GitHub Actions.
Код приложений и результаты работы разделены по веткам:

| Ветка | Содержимое |
| --- | --- |
| `main` | README, `.gitignore`, workflows в `.github/workflows/` |
| `schedule` | Python-парсер расписания, зависимости, настройки источников и тесты |
| `front` | Сайт на React, TypeScript, Tailwind CSS и shadcn/ui |
| `data` | Сгенерированные `schedule.json` и `schedule.log` |

## Обновление данных

Workflow [«Обновление расписания»](.github/workflows/update-schedule.yml) запускается
из `main`, но получает код парсера из ветки `schedule`. Он устанавливает зависимости,
запускает тесты, читает исходные Excel-файлы и обновляет ветку `data`.
Изменения парсера следует отправлять в `schedule`; переносить его файлы в `main`
не нужно.

Автоматические запуски выполняются по будням каждые 30 минут с 09:30 до 18:00
по Красноярску (`Asia/Krasnoyarsk`). В расписании workflow используется UTC.
GitHub может запускать задания с задержкой.

Обновление workflow в `main` тоже запускает обработку. Для запуска вручную:
Actions → Обновление расписания → Run workflow → выбрать `main`.
После изменения кода в `schedule` можно запустить обработку вручную или дождаться
следующего запуска по расписанию.

Коммит в `data` создаётся только при изменении `schedule.json`. При неизменных
данных новый коммит не появляется. Ошибка парсинга или пустой результат сохраняют
предыдущее расписание. Журнал каждого запуска доступен в артефакте `schedule-log-…`
на странице Actions в течение 30 дней.

## Публикация сайта

Workflow [«Публикация сайта»](.github/workflows/deploy-pages.yml) получает сайт
из `front`, расписание из `data`, запускает тесты и публикует сборку в GitHub Pages.
После успешного workflow «Обновление расписания» публикация запускается через
`workflow_run`, поэтому новый JSON попадает на сайт автоматически.

Сайт также можно опубликовать вручную через Actions → Публикация сайта → Run workflow
на ветке `main`. В Settings → Pages источником должен быть выбран GitHub Actions.
Правила environment `github-pages`, если они заданы, должны разрешать публикацию
из `main` и `front`.

Для публикации при push в `front` файл `deploy-pages.yml` должен также оставаться
в `.github/workflows/` ветки `front`: GitHub читает push-workflow из ветки события.
Его копию следует синхронизировать при изменении логики публикации в `main`.
По расписанию (`on.schedule`) запускается только версия workflow из основной ветки `main`.

## Локальная разработка

Парсер:

```sh
git switch schedule
uv sync --frozen
uv run --frozen python -m unittest discover -s tests -v
uv run --frozen python export_schedule.py
```

Сайт:

```sh
git switch front
npm ci
git fetch origin data
npm run prepare:data
npm run dev
```

В `main` не нужно выполнять `npm` или `uv`: здесь нет исходного кода приложений.
