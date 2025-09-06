---
sidebar_position: 1
---

# Introduction

Bakit is a framework that makes building Discord bots easier.
It's built on top of [discord.js](https://discord.js.org) and helps you handle the core system for your bot.

## Why Bakit?

- 🧩 **Unified Command System** - write once for both slash and prefix command.
- 🚀 **Clean API interfaces** - well-structured commands and events.
- ⚡ **Lightweight** - minimal overhead, only what you need.
- ✨ **TypeScript + ESM first** - modern JavaScript tooling out of the box.

### A quick peek

```ts
const Ping = Command("ping");

@Command.use(Ping)
class PingCommand {
	@Ping.main
	public async execute(context: Context) {
		await context.send(`Pong! ${context.client.ws.ping}ms!`);
	}
}
```

With just this simple code, you will have both slash and prefix command version of `ping`! That means users can run it either as `/ping` or as `!ping` (or whatever prefix you set).

![Ping command example](/img/ping-example.png)

## When Bakit might not be for you

- You **don't want to use TypeScript**.
- You don't want to use ESM and **prefer CommonJS**.
- You don't need any fancy scalable APIs for your simple slash command bot.

Next, head over to [Installation](/docs/installation) to setup your first bot.
