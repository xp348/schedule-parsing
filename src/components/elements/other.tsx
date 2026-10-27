import type { ScheduleMetadata } from "@/hooks/use-schedule"

// Оригиналы из configs/source.json в ветке schedule.
const sources = [
  { file: "1-ochnoe.xls", label: "Очная форма" },
  { file: "2-ochno-zaochnoe.xls", label: "Очно-заочная форма" },
  { file: "3-zaochnoe.xls", label: "Заочная форма" },
  { file: "4-ochnoe-mag.xls", label: "Магистратура — очная форма" },
  { file: "5-ochno-zaochnoe-mag.xls", label: "Магистратура — очно-заочная форма" },
  { file: "6-zaochnoe-mag.xls", label: "Магистратура — заочная форма" },
]

const linkClass = "w-fit text-sm underline underline-offset-4 hover:text-muted-foreground"

export function Other({
  metadata,
  loading,
}: {
  metadata: ScheduleMetadata | null
  loading: boolean
}) {
  const updatedAt = metadata ? new Date(metadata.updatedAt) : null
  const validDate = updatedAt !== null && Number.isFinite(updatedAt.getTime())

  return (
    <div className="grid max-w-4xl gap-6 py-4 sm:grid-cols-2">
      <section className="space-y-3 sm:col-span-2" aria-labelledby="schedule-update-title">
        <h2 id="schedule-update-title" className="font-semibold">
          Последнее обновление расписания
        </h2>
        {validDate ? (
          <p className="text-sm">
            <time dateTime={updatedAt.toISOString()}>
              {new Intl.DateTimeFormat("ru-RU", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "Asia/Krasnoyarsk",
              }).format(updatedAt)}
            </time>{" "}
            <span className="text-muted-foreground">(Красноярск, UTC+7)</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {loading ? "Загрузка даты обновления…" : "Дата обновления недоступна."}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Дата последнего изменения данных, загруженных на сайт.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="schedule-sources-title">
        <h2 id="schedule-sources-title" className="font-semibold">
          Оригиналы расписания
        </h2>
        <ul className="space-y-3">
          {sources.map(({ file, label }) => (
            <li key={file}>
              <a className={linkClass} href={`https://norvuz.ru/upload/timetable/${file}`}>
                {label} <span className="text-muted-foreground">(XLS)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

    </div>
  )
}
