import { Api, Bot, Context, Keyboard, RawApi } from "grammy";

enum Message {
    weather = "Какая погода?",
    translate = "Переведи слово...",
    joke = "Анекдот"
}

const aiRequest = async (text: string) => {
    const headers = {
        'x-device-id': process.env['x-device-id'],
        'x-project-id': process.env['x-project-id'],
        'x-request-id': process.env['x-request-id'],
        'x-sm-user-id': process.env['x-sm-user-id'],
        'Content-Type': 'application/json',
        Cookie: process.env.cookie
    } as any

    const answer = await fetch(<string>process.env.requestUrl, { method: 'POST', headers, body: JSON.stringify({ text }) });

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

const handleAnswer = (answerText: string) => {
    try {
        const answer = answerText.split('\n').filter(Boolean).map(e => JSON.parse(e.replace(/\"/g, "\"").slice(5)));
        console.log(answer);
        return Promise.resolve(answer.find(item => item.status === 'READY')?.message?.text);
    } catch(e) { 
        console.log(e);
    }

    return null
}

export const startBot = async (bot: Bot<Context, Api<RawApi>>) => {

    const keyboard = new Keyboard()
        .text(Message.weather).row()
        .text(Message.translate)
        .resized()
        .text(Message.joke);
    bot.command('start', (ctx) => {
    
        ctx.reply("Привет! Что интересует?", {
            reply_markup: keyboard,
          });
    })

    bot.on('message:text', async (ctx) => {
        switch(ctx?.message?.text as unknown as Message) {
            case Message.joke:
                console.log(Message.joke);
                const jokeValue = await handleAnswer(await aiRequest(`${Message.joke} про ${getJoke()}`));
                jokeValue &&
                ctx.reply(jokeValue, { reply_markup: keyboard });
                break;
            case Message.weather:
                // console.log(Message.weather, await aiRequest(Message.weather));
                break;
            case Message.translate:
                // console.log(Message.translate, await aiRequest(Message.translate));
                break;
                
        }
    })
    
    bot.start();

}