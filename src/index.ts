import { Bot } from 'grammy';
import path from 'path';

const botToken = '6628056195:AAGtIwxg-BhEQAiSglM-HMV-Yg1LAYtokO8';

const bot = new Bot(botToken);

const server = Bun.serve({
    port: 3000,
    async fetch(req, serv) {
        serv.upgrade(req, {
            data: {
                createdAt: Date.now(),
                channelId: new URL(req.url).searchParams.get("channelId"),
            },
        });
        return new Response(await Bun.file(path.join(__dirname, "index.html")).bytes(), {
            headers: {
              "Content-Type": "text/html",
            },
          });
    },
    websocket: {
        async message(ws, message) {
            console.log(message);
        },
        open(ws) {
            console.log('ws open');
            bot.on('message', (...args) => {
							ws.send(JSON.stringify(args));
						})
        },
        close(ws, code, message) {
            console.log('ws close');
        },
      },
});

bot.on('message', (...args) => {
	console.log(args);
})

console.log(`Start localhost:${server.port}`);