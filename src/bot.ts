import { Bot, type Context, Keyboard } from "grammy";
import { appConfig } from "./";
import { Conversation, ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";

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

const aiErrorMessage = 'Что-то пошло не так попробуйте еще раз...';

const handleAIAnswer = (answerText: string) => {
    try {
        const answer =
            answerText
            .replace(/\n\n/g, '__SECRET_SYMBOL__')
            .split('__SECRET_SYMBOL__')
            .filter(e => e.startsWith('data:'))
            .join('')
            .split("data:")
            .filter(Boolean)
            .map(e => JSON.parse(e));
        return Promise.resolve(answer.find(item => item.status === 'READY')?.message?.text);
    } catch(e) { 
        console.log(answerText);
        console.log(e);
    }

    return aiErrorMessage;
}

export const startBot = async (bot: Bot<ConversationFlavor<Context>>) => {

    const keyboard = new Keyboard()
        .text(Message.other).row()
        .text(Message.translate).resized()
        .text(Message.joke);

    async function aiChat(conversation: Conversation, ctx: Context) {
        await conversation.waitFor("message:text")
            .and(
                (ctx) => ctx.msg.text === '🔙 Назад', {
                otherwise: async (ctx) => {
                    await bot.api.sendChatAction(ctx.chatId, 'typing');
                    const aiAnswer = await handleAIAnswer(await aiRequest(ctx.msg.text));
                    await ctx.reply(aiAnswer, { parse_mode: 'Markdown' });
                }
            });
        ctx.reply('Что интересует?', { reply_markup: keyboard });
    }

    async function translate(conversation: Conversation, ctx: Context) {
        await ctx.reply("Напишите сообщение которое хотите перевести и язык");
        const { message } = await conversation.waitFor("message:text");
        const aiAnswer = await handleAIAnswer(await aiRequest(Message.translate + " " + message.text + ' (полный перевод и ниже транскрипция на языке котором написали вопрос)'));
        await ctx.reply(aiAnswer, { parse_mode: 'Markdown' });
    }

    bot.use(conversations());
    bot.use(createConversation(aiChat));
    bot.use(createConversation(translate));

    bot.command('start', (ctx) => {
        ctx.reply("Привет! Что интересует?", { reply_markup: keyboard });
    })


    bot.on('message:text', async (ctx) => {
        let text = <string>ctx?.message?.text

        if('Вернуться к меню' === text) {
            ctx.reply('Что интересует ?', { reply_markup: keyboard });
        }

        switch(text) {
            case Message.joke:
                const jokeValue = await handleAIAnswer(await aiRequest(`${Message.joke} про ${getJoke()}`));
                ctx.reply(jokeValue, { reply_markup: keyboard });
                break;
            case Message.other:
                await ctx.reply("Секундочку... пишу ответ :)");
                await bot.api.sendChatAction(ctx.chatId, 'typing');
                const aiAnswer = await handleAIAnswer(await aiRequest(Message.other));
                if(aiAnswer !== aiErrorMessage) {
                    await ctx.reply(aiAnswer, { reply_markup: new Keyboard().text('🔙 Назад').resized(), parse_mode: 'Markdown'  });
                    await ctx.conversation.enter("aiChat");
                } else {
                    await ctx.reply(aiAnswer);
                }
                break;
            case Message.translate:
                await ctx.conversation.enter("translate");
                break;
        }

    })

    bot.on('message:photo', (ctx) => ctx.reply('Это вы на фото ?)'));


    bot.start();

}