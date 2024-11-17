# OpenSticky / A open source [StickyBot](https://stickybot.info) alternative

OpenSticky is a open source alternative to [StickyBot](https://stickybot.info).
It is a Discord bot that allows you to create sticky messages. Sticky messages are messages that are pinned to the bottom of a channel.

## Commands

- `/pin` - Pins a message to the bottom of the channel.
- `/unpin` - Unpins a message from the bottom of the channel.

## Self Hosting

Docker image is available at `ghcr.io/sevenc-nanashi/opensticky:latest`.
Please check `docker-compose.yml` for docker configuration.

You need to do `echo {} > db_data.json` first!

#### `.env` configuration

- `TOKEN`: [Required] Discord bot token.

## License

This repository is licensed under MIT License.

