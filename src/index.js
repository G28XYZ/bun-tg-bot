console.log('Hello Bun');
/** сокет */
const socket = new WebSocket("ws://localhost:" + location.port);
/** селектор шаблона пользователя */
const LI_USER_TEMPLATE_SELECTOR = '#li-user';
/**  */
const LOCAL_STORAGE_LAST_MESSAGES = 'bunTgBotLastMessages';
const LOCAL_STORAGE_EVENT_DATA = 'bunTgBotEventData';

const sectionUsers = document.querySelector('.users');
const sectionChat = document.querySelector('.chat');
const ulElement = sectionUsers?.querySelector('ul');
const emptyChatEl = sectionChat?.querySelector('.chat_empty');
const chatContainer = sectionChat?.querySelector('.chat_container');
const chatMessages = sectionChat?.querySelector('.chat_messages');
const sendButton = sectionChat?.querySelector('.chat_input .button');
const chatInput = sectionChat?.querySelector('.chat_input input');
const headerInput = document.querySelector('header input');

const liTemplate = document.querySelector(LI_USER_TEMPLATE_SELECTOR);

let lastMessages = {};
/** локальные данные которые подтягиваются с локального хранилища браузера */
const localData = new Proxy(JSON.parse(localStorage.getItem(LOCAL_STORAGE_EVENT_DATA)) || {}, {
    get(_, p, r) {
        return Reflect.get(JSON.parse(localStorage.getItem(LOCAL_STORAGE_EVENT_DATA)) || {}, p,  r);
    }
})

if(localStorage.getItem(LOCAL_STORAGE_LAST_MESSAGES)) {
    lastMessages = JSON.parse(localStorage.getItem(LOCAL_STORAGE_LAST_MESSAGES)) || {};
}
/** ссылка на открытый чат */
let openedChat = null;
/** обработчик закрыти чата */
const handleCloseChat = () => {
    chatContainer.style.display = 'none';
    emptyChatEl.style.display = 'inline-block';
    chatContainer.querySelector('.chat_header')?.remove();
    sectionUsers.querySelector('.user_selected')?.classList?.remove('user_selected');
    chatMessages.innerHTML = '';
    openedChat = null;
    chatInput.value = '';
}
/** обработчик открытия чата */
const handleOpenChat = (e, from) => {
    handleCloseChat();
    openedChat = e;
    chatContainer.style.display = 'flex';
    emptyChatEl.style.display = 'none';
    e.classList.add('user_selected');
    e.dataset.count = 0;

    const chatHeader = document.createElement('div');
    chatHeader.classList.add('chat_header');

    chatHeader.append(...e.cloneNode(true).childNodes.values());
    chatContainer.prepend(chatHeader);
    renderMessages(e.id);
}
/** обработчик отображения сообщений */
const renderMessages = (userId) => {
    if(!openedChat || openedChat?.id !== userId) return;
    userId = userId.replace('id', "");
    const data = { ...(localData?.data || {})};
    if(data?.[userId]) {
        data?.[userId].messages.forEach(msg => {
            if(!chatMessages.querySelector(`#id${msg.message_id}`)) {
                createMessage(msg, 'user');
                msg.isChecked = true;
                if(lastMessages[msg.message_id]) {
                    lastMessages[msg.message_id].forEach(botMsg => {
                        createMessage(botMsg, 'bot');
                    })
                }
            }
        })
    }

    localStorage.setItem(LOCAL_STORAGE_EVENT_DATA, JSON.stringify({ ...localData, data }));
}
/** создать сообщение */
const createMessage = (msg, messageRole) => {
    const p = document.createElement('p');
    p.classList.add('chat_message-' + messageRole);
    p.id = `id${msg.message_id}`;
    p.textContent = msg.text;
    p.dataset.time = new Date(msg.date * 1000).toLocaleTimeString();
    chatMessages.append(p);
    p?.scrollIntoView({ behavior: 'smooth' });
    return p;
}
/** обработчик добавления сообщения */
const handleAddMessage = () => {
    if(openedChat && chatInput) {
        const text = chatInput.value;
        const userId = openedChat.id.replace('id', '');

        if(localData?.data?.[userId] && text?.trim()) {
            const data = localData?.data?.[userId];
            const lastUserMsgId = data.messages.at(-1)?.message_id;
            const msg = {
                text,
                date: new Date().getTime() / 1000,
                message_id:
                    lastMessages[lastUserMsgId]?.length
                    ? `${lastUserMsgId}_${lastMessages[lastUserMsgId]?.length + 1}`
                    : `${lastUserMsgId}_1`
            };
            lastMessages[lastUserMsgId] = lastMessages[lastUserMsgId] ? [...lastMessages[lastUserMsgId], msg] : [msg];
            createMessage(msg, 'bot');
            socket.send(JSON.stringify({ ...msg, chat_id: userId }));
            chatInput.value = '';
        }
    }

    localStorage.setItem(LOCAL_STORAGE_LAST_MESSAGES, JSON.stringify(lastMessages));
}
/** создать элемент списка */
const createLiElement = (props) => {
    const { id, from, message, messages } = props;
    const element = liTemplate.content.cloneNode(true);
    const messageEl = element.querySelector('.user');

    messageEl.id = `id${id}`;
    messageEl.dataset.count = messages.filter(e => !e.isChecked)?.length;
    messageEl.dataset.time = new Date(message.date * 1000).toLocaleTimeString();
    element.querySelector('.user_title').textContent = `${from.first_name} ${from.last_name}`;
    element.querySelector('.user_message').textContent = message.text;
    messageEl.addEventListener('click', () => handleOpenChat(messageEl, from));

    ulElement.append(element);
}
/** обновление элемента списка */
const updateliElement = (element, message) => {
    element.querySelector('.user_message').textContent = message.text;
    openedChat?.id !== element.id && ++element.dataset.count;
    element.dataset.time = new Date(message.date * 1000).toLocaleTimeString();
    openedChat && renderMessages(element.id);
}
/** отрисовать пользователей */
const renderUsers = () => {
    const { data, message } = localData;
    if(data) {
        Object.entries(data).forEach(([id, ctx]) => {
            if(ulElement) {
                const element = ulElement.querySelectorAll('.user').values().toArray().find(item => item.id === `id${id}`);
                if(element) {
                    parseInt(message?.from?.id) === parseInt(id) &&
                    updateliElement(element, ctx.messages.at(-1));
                } else if(ctx?.messages?.length) {
                    createLiElement({
                        id,
                        from: ctx.from,
                        message: ctx.messages.at(-1),
                        messages: ctx.messages
                    });
                }
            }
        })
    }
}
/** слушатель сообщений по сокету */
socket.addEventListener("message", event => {
    const eventData = JSON.parse(event.data);
    if(eventData) {
        const newLastMessage = eventData?.message || localData.message || {};
        const newData = localData?.data || {};
        Object.entries(eventData.data).forEach(([id, ctx]) => {
            if(!id) return;
            if(id in newData) {
                newData[id].messages = [
                    ...newData[id].messages,
                    ...ctx.messages.filter(
                        item => !newData[id].messages.find(e => e.message_id === item.message_id)
                    )
                ];
            } else {
                newData[id] = ctx;
            }
        })
        localStorage.setItem(
            LOCAL_STORAGE_EVENT_DATA,
            JSON.stringify({ data: newData, message: newLastMessage })
        )
    };
    renderUsers();
});
/** слушатель ввода значения в элементе поиска */
headerInput?.addEventListener('input', (e) => {
    const value = e.target.value;

    ulElement.querySelectorAll('.user').forEach(item => {
        !item.querySelector('.user_title')?.textContent?.includes(value)
        ? (item.style.display = 'none')
        : (item.style.display = 'list-item');
    })
})
/** слушатель фокуса на поле поиска */
headerInput?.addEventListener('focus', () => (headerInput.isFocus = true));
/** слушатель потери фокуса на поле поиска */
headerInput?.addEventListener('blur', () => (headerInput.isFocus = false));
/** слушатель клика на кнопку отправки сообщения */
sendButton?.addEventListener('click', handleAddMessage);
/** слушатель нажатия на клавиши */
document.addEventListener('keydown', (e) => {
    /** если esc закрыть чат */
    if(e.code === 'Escape'){
        handleCloseChat();
        return;
    }
    /** при нажатии на enter отправить введенное сообщение */
    if(e.code?.includes('Enter')) {
        handleAddMessage();
        return;
    }
    /**
     * при нажатии любой клавиши, если  открыт чат и если нет фокуса на поле поиске
     * то сфокусороваться на поле ввода сообщения
     * */
    if(openedChat && (e.code) && chatInput && !headerInput.isFocus) {
        chatInput.focus();
    }
})
