import * as asyncutil from "@core/asyncutil"
import AsyncLock from "async-lock"
import * as discord from "discord.js"
import { config } from "dotenv"

import * as db from "./db.js"

config()
const lock = new AsyncLock()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const client = new discord.Client({
  intents: [
    discord.IntentsBitField.Flags.Guilds,
    discord.IntentsBitField.Flags.GuildMessages,
  ],
  allowedMentions: {
    repliedUser: false,
    roles: [],
    users: [],
    parse: [],
  },
})
const rest = new discord.REST({ version: "10" }).setToken(process.env.TOKEN!)

client.on("ready", async () => {
  if (!client.user) throw new Error("Client user is null")
  console.log(`Logged in as ${client.user.tag}.`)

  await rest.put(discord.Routes.applicationCommands(client.user.id), {
    body: [
      {
        name: "pin",
        description: "Pin a message to this channel.",
        default_member_permissions: (
          discord.PermissionFlagsBits.ManageMessages |
          discord.PermissionFlagsBits.ManageChannels
        ).toString(),
      },
      {
        name: "unpin",
        description: "Unpin a message from this channel.",
        default_member_permissions: (
          discord.PermissionFlagsBits.ManageMessages |
          discord.PermissionFlagsBits.ManageChannels
        ).toString(),
      },
    ] satisfies discord.RESTPutAPIApplicationGuildCommandsJSONBody,
  })
})

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== "pin") return
  const nonce = crypto.randomUUID()
  await interaction.showModal({
    title: "Pin a message",
    customId: `pin:${nonce}`,
    components: [
      {
        type: discord.ComponentType.ActionRow,
        components: [
          {
            type: discord.ComponentType.TextInput,
            label: "Content",
            customId: "content",
            required: true,
            style: discord.TextInputStyle.Paragraph,
          },
        ],
      },
    ],
  })

  const { promise, resolve } = Promise.withResolvers<discord.Interaction>()

  client.once("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return
    if (interaction.customId !== `pin:${nonce}`) return
    resolve(interaction)
  })

  await Promise.race([promise, sleep(60000)])
  if ((await asyncutil.peekPromiseState(promise)) === "pending") {
    client.off("interactionCreate", resolve)
    return
  }
  const modalResult = await promise
  if (!modalResult.isModalSubmit()) return

  console.log(
    `[PIN] Pinning to ${interaction.channelId}, by ${interaction.user.tag}`,
  )
  await db.save(
    "p:" + interaction.channelId,
    modalResult.fields.getField("content").value,
  )
  await modalResult.reply("Pinned!")
})

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== "unpin") return

  console.log(
    `[UNPIN] Unpinning from ${interaction.channelId}, by ${interaction.user.tag}`,
  )
  await db.del("p:" + interaction.channelId)
  await interaction.reply("Unpinned!")
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
  "*".repeat(m.length),
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
console.log(`  Token: ${maskedToken}`)
console.log(``)
console.log(``)

client.login(process.env.TOKEN!)
