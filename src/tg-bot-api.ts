const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
};


enum BOT_API_METHOD {
    getUpdates = 'getUpdates',
    sendMessage = 'sendMessage'
}

export class BunBotApi {

    private listeners: Record<string, Function> = {};

    private resolvedMsg: number[] = [];

    constructor(private token: string, private options: { polling?: number } = { polling: 1 }) {
        this.polling = options?.polling || 1;
        this.runPolling();
    }

    get polling() {
        return this.options?.polling;
    }

    set polling(polling) {
        this.options.polling = polling;
    }

    private async runPolling() {
        while(1) {
            try {
                const data = await this.getUpdates();
                const json = await data.json();
                if(json.ok) {
                    const msg = json.result.at(-1).message;
                    msg?.message_id && !this.resolvedMsg.includes(msg?.message_id) && await this.checkListeners(msg);
                }
            } catch {}
        }
    }

    private async checkListeners(message: any) {
        for (let event in this.listeners) {
            console.log(message.text, message.message_id);
            if(event === message.text) {
                console.log(message.message_id);
                this.resolvedMsg.push(message.message_id);
                this.listeners[event](message);
            }
        }
    }

    private get botUrl() {
        return `https://api.telegram.org/bot${this.token}`;
    }

    _fetchCallback(method: `${BOT_API_METHOD}`, options: RequestInit = {}) {
        return fetch(`${this.botUrl}/${method}`, {
                method: "POST",
                headers,
                ...options
            })
    }

    getUpdates() {
        return this._fetchCallback('getUpdates');
    }

    sendMessage(message: any) {
        return this._fetchCallback('sendMessage', { body: JSON.stringify(message) });
    }

    on(message: string, callback: (message: any) => void) {
        this.listeners[message] = callback;
    }

}