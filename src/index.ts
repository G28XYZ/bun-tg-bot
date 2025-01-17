import { BunBotApi } from './tg-bot-api';
import path  from 'path';

const botToken = '6628056195:AAGtIwxg-BhEQAiSglM-HMV-Yg1LAYtokO8';

const bot = new BunBotApi(botToken);

const server = Bun.serve({
    port: 3000,
    async fetch(req, serv) {
        serv.upgrade(req, {
            // this object must conform to WebSocketData
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
            bot.on('/start', (message) => {
                ws.send(JSON.stringify(message));
                bot.sendMessage({ chat_id: message.chat.id, text: 'Hello'})
            })
        },
        close(ws, code, message) {
            console.log('ws close');
        },
      },
});

console.log(`Listening on localhost:${server.port}`);