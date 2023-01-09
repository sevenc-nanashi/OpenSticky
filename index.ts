import * as discord from "discord.js"
import { config } from "dotenv"
import AsyncLock from "async-lock"

import * as db from "./db"

config()
const lock = new AsyncLock()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const client = new discord.Client({
  intents: [
    discord.IntentsBitField.Flags.Guilds,
    discord.IntentsBitField.Flags.GuildMessages,
    discord.IntentsBitField.Flags.MessageContent,
  ],
  allowedMentions: {
    repliedUser: false,
  },
})

const PREFIX = process.env.PREFIX || "p:"

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}.`)
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return

  if (!message.content.startsWith(PREFIX + "pin ")) return

  const content = message.content.slice((PREFIX + "pin ").length).trim()

  console.log(`[PIN] New pin: ${content}, by ${message.author.tag}`)
  await db.save("p:" + message.channelId, content)
  await message.reply("Pinned!")
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return

  if (!(message.content === PREFIX + "unpin")) return

  console.log(
    `[UNPIN] Unpinning from ${message.channelId}, by ${message.author.tag}`
  )
  await db.del("p:" + message.channelId)
  await message.reply("Unpinned!")
})

client.on("messageCreate", async (message) => {
  if (message.author.id === client.user?.id) return
  if (!db.data["p:" + message.channelId]) return

  const channel = await client.channels.fetch(message.channelId)
  lock.acquire("p:" + message.channelId, async () => {
    if (db.data["m:" + message.channelId]) {
      const messageId = db.data["m:" + message.channelId]
      ;(channel as discord.TextChannel).messages.delete(messageId).catch(() => {
        null
      })
    }
    ;(channel as discord.TextChannel)
      .send(db.data["p:" + message.channelId])
      .then((msg) => {
        db.data["m:" + message.channelId] = msg.id
      })
    await sleep(1000) // for rate limit
  })
})

const maskedToken = process.env.TOKEN?.replace(/(?<=\.)[^.]+$/, (m) =>
  "*".repeat(m.length)
)

console.log("[[-- OpenSticky --]]")
console.log(`  by sevenc-nanashi <https://sevenc7c.com>`)
console.log(``)
console.log(`  This bot is licensed under the MIT License.`)
console.log(`  https://github.com/sevenc-nanashi/OpenSticky`)
console.log(``)
console.log(`[-- Environment --]`)
console.log(`  Node.js version: ${process.version}`)
console.log(`  Discord.js version: ${discord.version}`)
console.log(``)
console.log(`[-- Configuration --]`)
console.log(`  Prefix: ${PREFIX}`)
console.log(`  Token: ${maskedToken}`)
console.log(``)
console.log(``)

client.login(process.env.TOKEN!)
