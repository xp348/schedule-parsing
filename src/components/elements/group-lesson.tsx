import type { Lesson } from "@/lib/schedule"

export function GroupLesson({ lesson }: { lesson: Lesson }) {
  const classroom = lesson.classroom?.trim()
  const online = classroom && /^https?:\/\//i.test(classroom)

  return (
    <div className="space-y-1">
      <p>{lesson.lesson}</p>
      {classroom && (
        <p className="text-xs text-muted-foreground">
          {online ? (
            <a
              href={classroom}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Онлайн-занятие
            </a>
          ) : (
            <>Аудитория: {classroom}</>
          )}
        </p>
      )}
    </div>
  )
}
