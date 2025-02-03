import { Api, Bot, Context, Keyboard, RawApi } from "grammy";
import { appConfig } from "./";

enum Message {
    other     = "Что умеешь ?",
    translate = "Переведи...",
    joke      = "Анекдот"
}

const aiRequest = async (text: string) => {
    const headers = {
        'x-device-id' : appConfig['x-device-id'],
        'x-project-id': appConfig['x-project-id'],
        'x-request-id': appConfig['x-request-id'],
        'x-sm-user-id': appConfig['x-sm-user-id'],
        Cookie        : appConfig.cookie,
        'Content-Type': 'application/json',
    }

    const answer = await fetch(appConfig.requestUrl, { method: 'POST', headers, body: JSON.stringify({ text }) });

    return await answer.text();
}

const jokeThemes = ['питомца', 'отдых на природе', 'курьеров', "вахтеров", 'проводника'];

const getJoke = () => {
    let index = Math.floor(Math.random() * jokeThemes.length);
    while(!jokeThemes[index]) {
        index = Math.floor(Math.random() * jokeThemes.length);
    }

    return jokeThemes[index];
};

const handleAIAnswer = (answerText: string) => {
    try {
        const answer = answerText.split('\n').filter(Boolean).map(e => JSON.parse(e.replace(/\"/g, "\"").slice(5)));
        return Promise.resolve(answer.find(item => item.status === 'READY')?.message?.text);
    } catch(e) { 
        console.log(e);
    }

    return 'Что-то пошло не так попробуйте еще раз...'
}

export const startBot = async (bot: Bot<Context, Api<RawApi>>) => {

    const keyboard = new Keyboard()
        .text(Message.other).row()
        .text(Message.translate)
        .resized()
        .text(Message.joke);

    bot.command('start', (ctx) => {
    
        ctx.reply("Привет! Что интересует?", {
            reply_markup: keyboard,
          });
    })

    let lastCtxMessage = '';

    bot.on('message:text', async (ctx) => {
        let text = <string>ctx?.message?.text

        if('Вернуться к меню' === text) {
            ctx.reply('Что интересует ?', { reply_markup: keyboard });
            lastCtxMessage = '';
        }

        if(lastCtxMessage) {
            switch(lastCtxMessage) {
                case Message.other:
                    const weather = await handleAIAnswer(await aiRequest(text));
                    ctx.reply(weather, { reply_markup: new Keyboard().text('Вернуться к меню').resized() })
                    return;
                case Message.translate:
                    const translate = await handleAIAnswer(await aiRequest(`${Message.translate} ${text}`));
                    ctx.reply(translate, { reply_markup: keyboard });
                    break;
            }

            lastCtxMessage = '';
        }

        switch(text) {
            case Message.joke:
                const jokeValue = await handleAIAnswer(await aiRequest(`${Message.joke} про ${getJoke()}`));
                ctx.reply(jokeValue, { reply_markup: keyboard });
                break;
            case Message.other:
                lastCtxMessage = Message.other;
                const other = await handleAIAnswer(await aiRequest(text));
                ctx.reply(other, { reply_markup: keyboard });
                break;
            case Message.translate:
                lastCtxMessage = Message.translate;
                ctx.reply("Напишите сообщение которое хотите перевести и язык");
                break;
        }

    })


    bot.on('message:photo', (ctx) => ctx.reply('Это вы на фото ?)'));
    
    bot.start();

}