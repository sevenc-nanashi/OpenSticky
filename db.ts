import AsyncLock from "async-lock"
import syncFs, { promises as fs } from "node:fs"

const lock = new AsyncLock()
const DB_PATH = "./db_data.json"

export const initDB = () => {
  const exists = syncFs.existsSync(DB_PATH)
  if (!exists) {
    syncFs.writeFileSync(DB_PATH, "{}")
    return {}
  } else {
    const data = syncFs.readFileSync(DB_PATH, "utf-8")
    return JSON.parse(data)
  }
}

export const save = async (key: string, value: unknown) => {
  db[key] = value
  return await lock.acquire("db", async () => {
    await fs.writeFile(
      DB_PATH,
      JSON.stringify({
        ...JSON.parse(await fs.readFile(DB_PATH, "utf-8")),
        [key]: value,
      })
    )
  })
}

export const del = async (key: string) => {
  delete db[key]
  return await lock.acquire("db", async () => {
    await fs.writeFile(
      DB_PATH,
      JSON.stringify({
        ...JSON.parse(await fs.readFile(DB_PATH, "utf-8")),
        [key]: undefined,
      })
    )
  })
}

const db = initDB()
export const data = db
