const User = require('../api/user/user.model')
const Atco = require('../api/atco/atco.model') 
const { Client, Buttons } = require('whatsapp-web.js');
const QRCode = require('qrcode')
const qrCodeTerminal = require('qrcode-terminal')  

const eventHandler = (io) => {
    const users = {}
    io.on('connection', async socket => {
        const userId = socket.handshake.query.userId
        if (userId === 'undefined') { return; }
        let user = await User.findById(userId)
        if (!user) {
            socket.disconnect();
            return;
        }
        users[userId] = { ...user._doc, socket };
        user = users[userId]
        user.tmpss = user.tmpss ? JSON.parse(user.tmpss) : undefined
        let wsBo;
        const args = ['--no-sandbox', '--disable-setuid-sandbox']
        const puppeteerArgs = { headless: true, args }
        // await User.findByIdAndUpdate(userId, { $set: { tmpss: undefined } }, { new: true })
        if (user.tmpss) {
            wsBot = new Client({ puppeteer: puppeteerArgs, session: user.tmpss });
            wsBot.initialize();
        } else {
            wsBot = new Client({ puppeteer: puppeteerArgs });
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
        }
        user = { ...user, wsBot }
        // Socket listeners
        user.socket.on('wsbot_authenticate', msg => {
            console.log(user.name, ': requesting qr')
            try {
                user.wsBot.initialize();
                // if user admin
                if (user.type !== 'admin') { return; }
                user.wsBot.on('qr', async (qr) => {
                    // send the qr to be scanned
                    console.log(user.name, ': qr generated qr')
                    qrCodeTerminal.generate(qr, { small: true })
                    qr = await QRCode.toDataURL(qr, {
                        width: 500,
                        height: 500,
                        colorDark: "#000000",
                        colorLight: "#ffffff"
                    })
                    user.socket.emit('authenticate', { qr })
                    console.log(user.name, ': qr sent')
                });
            } catch (error) {
                console.log(user.name, ': qr auth eror')
                user.socket.emit('authenticate', null)
            }
        })

        user.socket.on('wsbot_disconnect', async () => {
            console.log(user.name, ': requested disconnect wsbot')
            user.wsBot.logout()
        }) 

        //wsbot listeners
        user.wsBot.on('ready', () => {
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: true })
            console.log(user.name, ': connection ready')
        });

        user.wsBot.on('authenticated', async (session) => {
            console.log(user.name, ': authenticated')
            try {
                user.tmpss = session
                await User.findByIdAndUpdate(userId, { $set: { tmpss: JSON.stringify(user.tmpss) } }, { new: true })
                user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: true })
            } catch (error) {
                await User.findByIdAndUpdate(userId, { $set: { tmpss: undefined } }, { new: true })
                user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
            }
        });

        user.wsBot.on('disconnected', async (reason) => {
            console.log(user.name, ': wsbot disconnected', ': ' + reason)
            await User.findByIdAndUpdate(userId, { $set: { tmpss: undefined } }, { new: true })
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
        });

        user.wsBot.on('auth_failure', async (msg) => {
            console.log(user.name, ': wsbot faled authentication', ': ' + msg)
            await User.findByIdAndUpdate(userId, { $set: { tmpss: undefined } }, { new: true })
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
        });

        user.wsBot.on('message', (msg) => logic_gateWay({ msg, wsBot: user.wsBot, user }))
    })
}

// ALL BOTS LOGIC
const generateOrderCode = () => {
    const uniqueNumber = String(Date.now()).slice(-4);
    const randomString = Math.random().toString(36).substring(3, 5).toUpperCase();
    return `${randomString}:${uniqueNumber}`;
};

const logic_gateWay = async ({msg, wsBot, user}) => {
    const groups = {
        'rela_pedidos': relaPedidosLogic
    }
    let chat = await msg.getChat();
    const { isGroup } = chat
    const canMessage = process.env.NUMBER_CAN_INTERACT_W_BOT.split(',').map(t => `${t}@c.us`)
    const allowMessage = canMessage.some(t => t === msg.author)
    if (!isGroup || !allowMessage) { return; }
    const group = chat.name
    groups[group] && groups[group]({ msg, chat, wsBot, user })
}

const relaPedidosLogic = async ({ msg, chat, wsBot, user }) => {
    const orderTypes = [
        { id: 'bot_store', body: 'Crear pedido interno' },
        { id: 'bot_user', body: 'Crear recado' }
    ] 
    const createOrderTitle = "¿Deseas crear una orden?"
    let button = new Buttons('Selecciona un tipo de orden', orderTypes, createOrderTitle);
    let orderCodeSerialized;
    // check if its an answer to a previous msg
    if(msg.hasQuotedMsg) {
        // check if response is a button response
        if(msg.selectedButtonId) { 
            chat.sendStateTyping();
            let atcOrder = await Atco.create({
                internal: msg.selectedButtonId,
                created: msg.timestamp,
                order: generateOrderCode(),
                admin: user
            }) 
            atcOrder = atcOrder._doc
            //adds the order to the admin body, once the order is completed it should be removed
            await User.findByIdAndUpdate(user._id, { $set: { creatingOrder: atcOrder._doc._id }})
            //sends a message with a serialize if for later ref
            orderCodeSerialized = `${atcOrder._doc.internal}:${atcOrder._doc._id}`
            wsBot.sendMessage(msg.from, `
                Responde este mensaje con el formato del pedido:\n
                ${orderCodeSerialized}
            `);
            chat.clearState();
        } else {
            // check if admin has a pending order creation
            if(user.creatingOrder) {
                chat.sendStateTyping();
                const prevOrder = await Atco.findById(user.creatingOrder)
                //checks if the order still exists 
                if(!prevOrder) {
                    // If doesnt exists remove it and run the function again
                    await User.findByIdAndUpdate(user._id, { $set: { creatingOrder: null }})
                    await relaPedidosLogic({ msg, chat, wsBot, user })
                    chat.clearState();
                    return;
                } else {
                    // if exists requests for the pending order
                    orderCodeSerialized = `${prevOrder._doc.internal}:${prevOrder._doc._id}`
                    wsBot.sendMessage(msg.from, `
                        Opps! parece que olvidaste crear un pedido anteriormente. Responde este mensaje con el formato de tu pedido:\n
                        ${orderCodeSerialized}
                    `);
                    chat.clearState();
                }
            } else {
                wsBot.sendMessage(msg.from, button);
            }
        }
    } else {
        wsBot.sendMessage(msg.from, button);
    }
}

//BOT LOGICS END 

module.exports = {
    eventHandler
}