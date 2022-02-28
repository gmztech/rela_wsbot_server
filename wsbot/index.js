const User = require('../api/user/user.model')
const BotOrder = require('../api/botorder/botorder.model') 
const { Client, Buttons } = require('whatsapp-web.js');
const QRCode = require('qrcode')
const qrCodeTerminal = require('qrcode-terminal')  
const ObjectId = require('mongoose').Types.ObjectId;

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
        users[userId] = { ...user.public, socket };
        user = users[userId]
        user.tmpss = user.tmpss ? JSON.parse(user.tmpss) : undefined
        let wsBo;
        const args = ['--no-sandbox', '--disable-setuid-sandbox']
        const puppeteerArgs = { headless: true, args }
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
        { id: 'interno_tienda', body: 'Crear pedido interno 🏬🚴' },
        { id: 'recado', body: 'Crear recado 📦🚴' },
        { id: 'rela_go', body: 'Crear Rela Go 🚖' }
    ] 
    const createOrderTitle = "¿Deseas crear una orden?"
    let button = new Buttons('Selecciona un tipo de orden', orderTypes, createOrderTitle);
    let orderCodeSerialized;
    // check if its an answer to a previous msg
    if(msg.hasQuotedMsg) {
        // check if response is a button response
        if(msg.selectedButtonId) { 
            // check if admin has a pending order creation 
            if(user.creatingOrder) {
                try {
                    const prevOrder = await BotOrder.findById(user.creatingOrder)
                    //checks if the order still exists 
                    if(!prevOrder) {
                        // If doesnt exists remove it and run the function again
                        await User.findByIdAndUpdate(user.id, { $set: { creatingOrder: null }}, {new:true}) 
                        user.creatingOrder = null
                        wsBot.sendMessage(msg.from, button)
                        return;
                    } else {
                        // if exists requests for the pending order
                        orderCodeSerialized = `${prevOrder._doc.internal}:${prevOrder._doc._id}`
                        wsBot.sendMessage(msg.from, `Opps! parece que olvidaste crear un pedido anteriormente 😫.\nResponde este mensaje con el formato de tu pedido:\n*${orderCodeSerialized}*`);
                    }
                } catch (error) {
                    console.log(error)
                }
            } else {
                // if not, create new order
                try{ 
                    const admin = {...user}
                    delete admin.wsBot; delete admin.socket
                    const newOrder = {
                        internal: msg.selectedButtonId,
                        created: msg.timestamp,
                        order: generateOrderCode(),
                        status: 'started'
                    }
                    let botOrder = await BotOrder.create(newOrder) 
                    botOrder = botOrder._doc
                    //adds the order to the admin body, once the order is completed it should be removed
                    user.creatingOrder = botOrder._id
                    await User.findByIdAndUpdate(user.id, { $set: { creatingOrder: user.creatingOrder }})
                    //sends a message with a serialize if for later ref
                    orderCodeSerialized = `${botOrder.internal}:${botOrder._id}`
                    wsBot.sendMessage(msg.from, `Responde este mensaje con el formato del pedido 🙌:\n*${orderCodeSerialized}*`);
                } catch(error){
                    console.log(error)
                }
            }
        } else {
            try{ 
                const quotedMsg = await msg.getQuotedMessage();
                const params = quotedMsg.body.split('\n')
                if(!params.length) { return; }
                let orderString = params[params.length -1].split(':') 
                if(orderString.length < 2) { return; }
                orderString = orderString[1].replace(/\*/g, ''); 
                if(ObjectId(orderString)){ //check if message has an id of an order in it 
                    let createdOrder = await BotOrder.findById(orderString)
                    createdOrder = createdOrder._doc
                    const orderBody = parseOrderBody(msg.body, createdOrder.internal)
                    if(orderBody) {
                        if( orderBody.error ) { return wsBot.sendMessage(msg.from, orderBody.error) }
                        console.log(orderBody)
                    } else {
                        wsBot.sendMessage(msg.from, 'Formato de orden incorrecto, recuerda llenar *TODOS* los campos sin romper el formato de la orden. Intenta nueamente respondiendo el mensaje con el código del pedido');
                    } 
                } else {
                    wsBot.sendMessage(msg.from, button);
                }
            } catch(error){
                console.log(error)
            }
        }
    } else {
        wsBot.sendMessage(msg.from, button);
    }
}

const parseOrderBody = (body, orderType) => {
    const types = {
        'interno_tienda': async() => {
            const partialOrder = {}
            const format = body.split('---')
            if(format.length !== 3) { return null }
            // ORDER INFO
            const orderInfo = format[1].split('\n').filter(l => l.length)
            if(orderInfo.length !== 5) { return null }
            // _realer -> dealer
            partialOrder.dealer = orderInfo[0].split(':')
            if(!partialOrder.dealer[1] || !partialOrder.dealer[1].length || partialOrder.dealer[1].length < 5) { return null }
            // _comercio -> store
            partialOrder.store = orderInfo[1].split(':')
            if(!partialOrder.store[1] || !partialOrder.store[1].length || partialOrder.store[1].length < 5) { return null }
            // _pedido -> orderDetail
            partialOrder.orderDetail = orderInfo[2].split(':')
            if(!partialOrder.orderDetail[1] || !partialOrder.orderDetail[1].length || partialOrder.orderDetail[1].length < 3) { return null }
            // _gps -> store.gps
            partialOrder['store.gps'] = orderInfo[3].split(' -> ')
            if(!partialOrder['store.gps'][1] || !partialOrder['store.gps'][1].length || partialOrder['store.gps'][1].length < 10) { return null }
            // _delivery -> deliveryCost
            partialOrder.deliveryCost = orderInfo[4].split(':')
            if(!partialOrder.deliveryCost[1] || !partialOrder.deliveryCost[1].length || !Number(partialOrder.deliveryCost[1])) { return null }

            // DELIVERY INFO
            const deliveryInfo = format[2].split('\n').filter(l => l.length)
            if(deliveryInfo.length !== 4) { return null }
            // _entrega_nombre -> receiving.name
            partialOrder['receiving.name'] = deliveryInfo[0].split(':')
            if(!partialOrder['receiving.name'] || !partialOrder['receiving.name'].length || partialOrder['receiving.name'][1].length < 5) { return null }
            // _entrega_telefono -> receiving.phone
            partialOrder['receiving.phone'] = deliveryInfo[1].split(':')
            if(!partialOrder['receiving.phone'] || !partialOrder['receiving.phone'].length || partialOrder['receiving.phone'][1].length < 5) { return null }
            // _entrega_gps -> receiving.gps
            partialOrder['receiving.gps'] = deliveryInfo[2].split(' -> ')
            if(!partialOrder['receiving.gps'] || !partialOrder['receiving.gps'].length || partialOrder['receiving.gps'][1].length < 10) { return null }
            // _entrega_comentarios -> atcComment
            partialOrder['atcComment'] = deliveryInfo[3].split(':')

            // Complete data
            // dealer
            partialOrder.dealer = await User.findOne({ type: 'dealer', phone: partialOrder.dealer[1] })
            if(!partialOrder.dealer) { return { error: 'Realer no encontrado, verifica el número de teléfono e intenta nuevamente' } }
            partialOrder.dealer = partialOrder.dealer._doc
            // store
            partialOrder.store = await User.findOne({ type: 'store', phone: partialOrder.store[1] })
            if(!partialOrder.store) { return { error: 'Comercio no encontrado, verifica el número de teléfono e intenta nuevamente' } }
            partialOrder.store = partialOrder.store._doc
            // orderDetail
            partialOrder.orderDetail = orderDetail[1]
            // store gps
            partialOrder.store.gps = partialOrder['store.gps'][1]
            // delivery cost
            partialOrder.deliveryCost = Number(deliveryCost[1])
            // delivery
            partialOrder.delivery = {
                name: partialOrder['receiving.name'][1],
                phone: partialOrder['receiving.phone'][1],
                gps: partialOrder['receiving.gps'][1],
            }
            // atcCommet
            partialOrder.atcComment = partialOrder.atcComment[1]
            return partialOrder
        }
    }
    return types[orderType] ? types[orderType]() : null
}

module.exports = {
    eventHandler
}