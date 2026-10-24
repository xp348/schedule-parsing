import { execFileSync } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"

// Читает ветку data локально или из origin. Токены не попадают во фронтенд.
const ref = process.env.SCHEDULE_DATA_REF || "origin/data"
const text = execFileSync("git", ["show", `${ref}:schedule.json`], {
  encoding: "utf8",
  maxBuffer: 30 * 1024 * 1024,
})
const data = JSON.parse(text)
if (!Array.isArray(data) || data.length === 0) throw new Error("В ветке data нет расписания")
const updatedAt = execFileSync("git", ["log", "-1", "--format=%cI", ref], {
  encoding: "utf8",
}).trim()
const commit = execFileSync("git", ["rev-parse", ref], { encoding: "utf8" }).trim()
await mkdir("public/data", { recursive: true })
await writeFile("public/data/schedule.json", JSON.stringify(data), "utf8")
await writeFile("public/data/metadata.json", JSON.stringify({ updatedAt, commit }), "utf8")
console.log(`Подготовлено ${data.length} записей из ${ref} (${commit.slice(0, 7)})`)
