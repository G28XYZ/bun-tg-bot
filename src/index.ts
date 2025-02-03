import { startBot } from './bot.js';
import { Bot, Context } from 'grammy';
import path from 'path';

interface IConfigApp {
    port          : number;
    botToken      : string;
    requestUrl    : string;
    'x-project-id': string;
    'x-request-id': string;
    'x-sm-user-id': string;
    'x-device-id' : string;
    cookie        : string;
}

export const appConfig: IConfigApp = (await (await fetch(<string>process.env.configAppUrl)).json()) || {};

const botToken = appConfig.botToken || '';

const bot = new Bot(botToken);

const latestMsg: Record<number, any> = {}

let wsOnCallback: (ctx: ReturnType<typeof bot['on']>) => any;

const logLatestMessage = (ctx: Context) => {
    const message = ctx?.message;
    if(message?.from?.id) {
        latestMsg[message.from.id] = {
            from: message.from,
            messages:
                latestMsg[message.from.id]?.messages
                ? [...latestMsg[message.from.id]?.messages, message]
                : [message]
        }
    }
}

bot.use((ctx, next) => {
    logLatestMessage(ctx);
    wsOnCallback && wsOnCallback(ctx);
    next();
})

const server = Bun.serve({
    port: appConfig.port || 3000,
    static: {
        '/index.js': new Response(await Bun.file(path.join(__dirname, "index.js")).bytes(), {
            headers: {
                "Content-Type": "text/javascript",
            },
        }),
        '/style.css': new Response(await Bun.file(path.join(__dirname, "style.css")).bytes(), {
        headers: {
                "Content-Type": "text/css",
            },
        }),
        '/img/send-icon.png': new Response(await Bun.file(path.join(__dirname, "img", "send-icon.png")).bytes(), {
        headers: {
                "Content-Type": "image/png",
            },
        })
    },
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
        async message(ws, data) {
            if(typeof data === 'string') {
                const message = JSON.parse(data);
                if(message && message.text?.trim() && message.chat_id) {
                    bot.api.sendMessage(message.chat_id,  message.text);
                }
            }
        },
        async open(ws) {
            console.log('ws open');
            wsOnCallback = (ctx) => {
                ws.send(JSON.stringify({ data: latestMsg, message: ctx.message }));
            }
            ws.send(JSON.stringify({ data: latestMsg }));
        },
        close(ws, code, message) {
            console.log('ws close');
        },
      },
});

startBot(bot);

console.log(`Start http://localhost:${server.port}`);