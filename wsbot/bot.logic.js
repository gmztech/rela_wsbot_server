
const QRCode = require('qrcode')
const qrCodeTerminal = require('qrcode-terminal')
const User = require('../api/user/user.model')
const { Buttons } = require('whatsapp-web.js');

const logic_gateWay = async ({ msg, wsBot, user, socket }) => {
    const groups = {
        'rela_pedidos': relaPedidosLogic
    }
    let chat = await msg.getChat();
    const { isGroup } = chat
    const canMessage = process.env.NUMBER_CAN_INTERACT_W_BOT.split(',').map(t => `${t}@c.us`)
    const allowMessage = canMessage.some(t => t === msg.author)
    if (!isGroup || !allowMessage) { return; }
    const group = chat.name
    groups[group] && groups[group]({ msg, chat, wsBot, user, socket })
}
const generateOrderCode = () => {
    const uniqueNumber = String(Date.now()).slice(-4);
    const randomString = Math.random().toString(36).substring(3, 5).toUpperCase();
    return `${randomString}:${uniqueNumber}`;
};

const relaPedidosLogic = async ({ msg, chat, wsBot, user, socket }) => {
    const orderTypes = [
        { id: 'interno_tienda', body: 'Crear pedido interno 🏬🚴' },
        { id: 'recado', body: 'Crear recado 📦🚴' },
        { id: 'rela_go', body: 'Crear Rela Go 🚖' }
    ]
    const createOrderTitle = "¿Deseas crear una orden?"
    let button = new Buttons('Selecciona un tipo de orden', orderTypes, createOrderTitle);
    let orderCodeSerialized;
    // check if its an answer to a previous msg
    if (msg.hasQuotedMsg) {
        // check if response is a button response
        if (msg.selectedButtonId) {
            // check if admin has a pending order creation 
            if (!user.creatingWsBotOrder) {
                await User.findByIdAndUpdate(user.id, { $set: { creatingWsBotOrder: {} } }, { new: true })
                user.creatingWsBotOrder = {}
            }
            const prevOrder = await BotOrder.findOne({
                'admin.id': user.id,
                _id: user.creatingWsBotOrder[msg.selectedButtonId],
                internal: msg.selectedButtonId
            })
            if (prevOrder) {
                // if exists requests for the pending order
                orderCodeSerialized = `${prevOrder._doc.internal}:${prevOrder._doc._id}`
                wsBot.sendMessage(msg.from, `Opps! parece que olvidaste crear un pedido anteriormente 😫.\n*RESPONDE* este mensaje con el formato de tu pedido:\n*${orderCodeSerialized}*`);
            } else {
                // if not, create new order
                try {
                    const admin = { ...user }
                    delete admin.wsBot; delete admin.socket
                    delete admin.wsBotHistory; delete admin.tmpss
                    delete admin.creatingWsBotOrder
                    const newOrder = {
                        internal: msg.selectedButtonId,
                        created: msg.timestamp,
                        status: 'creating',
                        order: generateOrderCode(),
                        admin
                    }
                    let botOrder = await BotOrder.create(newOrder)
                    botOrder = botOrder._doc
                    //adds the order to the admin body, once the order is created COMPLETELY it should be removed
                    user.creatingWsBotOrder = { ...(user.creatingWsBotOrder || {}), [botOrder.internal]: botOrder._id }
                    await User.findByIdAndUpdate(user.id, { $set: { creatingWsBotOrder: user.creatingWsBotOrder } });
                    //sends a message with a serialize if for later ref
                    orderCodeSerialized = `${botOrder.internal}:${botOrder._id}`
                    wsBot.sendMessage(msg.from, `*RESPONDE* este mensaje con el formato del pedido 🙌:\n*${orderCodeSerialized}*`);
                } catch (error) {
                    console.log(error)
                }
            }
        } else {
            try {
                const quotedMsg = await msg.getQuotedMessage();
                const params = quotedMsg.body.split('\n')
                if (!params.length) { return; }
                let orderString = params[params.length - 1].split(':')
                if (orderString.length < 2) { return; }
                orderString = orderString[1].replace(/\*/g, '');
                if (ObjectId(orderString)) { //check if message has an id of an order in it 
                    let createdOrder = await BotOrder.findById(orderString)
                    if (!createdOrder) {
                        wsBot.sendMessage(msg.from, button)
                        return;
                    }
                    createdOrder = createdOrder._doc
                    let orderBody = await parseOrderBody(msg.body, createdOrder.internal, 'parser')
                    if (orderBody) {
                        if (createdOrder.status === 'creating') {
                            if (orderBody.error) { return wsBot.sendMessage(msg.from, orderBody.error) }
                            orderBody = { ...createdOrder, ...orderBody, status: 'started', }
                            const orderId = orderBody._id
                            delete orderBody._id
                            let updatedOrder = await BotOrder.findByIdAndUpdate(orderId, { $set: orderBody }, { new: true })
                            updatedOrder = updatedOrder._doc
                            //removes the order from the admin body
                            const dealer_message = await parseOrderBody(updatedOrder, updatedOrder.internal, 'dealer_message')
                            const store_message = await parseOrderBody(updatedOrder, updatedOrder.internal, 'store_message')
                            wsBot.sendMessage(`${updatedOrder.dealer.phone}@c.us`, dealer_message)
                            wsBot.sendMessage(`${updatedOrder.store.phone}@c.us`, store_message)
                            wsBot.sendMessage(msg.from, 'Orden creada con éxito ✔️\nMensaje enviado para realer✔️\nMensaje enviado para tienda✔️')
                            user.creatingWsBotOrder = { ...(user.creatingWsBotOrder || {}), [updatedOrder.internal]: '' }
                            await User.findByIdAndUpdate(user.id, { $set: { creatingWsBotOrder: user.creatingWsBotOrder } });
                            user.socket.emit('refresh_orders', { refreshOrders: true })
                        } else {
                            wsBot.sendMessage(msg.from, button);
                        }
                    } else {
                        wsBot.sendMessage(msg.from, 'Formato de orden incorrecto, recuerda llenar *TODOS* los campos sin romper el formato de la orden. Intenta nueamente respondiendo el mensaje con el código del pedido');
                    }
                } else {
                    wsBot.sendMessage(msg.from, button);
                }
            } catch (error) {
                console.log(error)
            }
        }
    } else {
        wsBot.sendMessage(msg.from, button);
    }
}

const clearNumber = (string) => string.replace(/\s/g, '')

const parseOrderBody = async (body, orderType, tool) => {
    const types = {
        'interno_tienda': {
            parser: async () => {
                const partialOrder = {}
                const format = body.split('---')
                if (format.length !== 3) { return null }
                // ORDER INFO
                const orderInfo = format[1].split('\n').filter(l => l.length)
                if (orderInfo.length !== 4) { return null }
                // _realer -> dealer
                partialOrder.dealer = orderInfo[0].split(':')
                if (!partialOrder.dealer[1] || !partialOrder.dealer[1].length || partialOrder.dealer[1].length < 5) { return null }
                // _comercio -> store
                partialOrder.store = orderInfo[1].split(':')
                if (!partialOrder.store[1] || !partialOrder.store[1].length || partialOrder.store[1].length < 5) { return null }
                // _pedido -> orderDetail
                partialOrder.orderDetail = orderInfo[2].split(':')
                if (!partialOrder.orderDetail[1] || !partialOrder.orderDetail[1].length || partialOrder.orderDetail[1].length < 3) { return null }
                // _delivery -> deliveryCost
                partialOrder.deliveryCost = orderInfo[3].split(':')
                if (!partialOrder.deliveryCost[1] || !partialOrder.deliveryCost[1].length || !Number(partialOrder.deliveryCost[1])) { return null }

                // DELIVERY INFO
                const deliveryInfo = format[2].split('\n').filter(l => l.length)
                if (deliveryInfo.length !== 4) { return null }
                // _entrega_nombre -> receiving.name
                partialOrder['receiving.name'] = deliveryInfo[0].split(':')
                if (!partialOrder['receiving.name'] || !partialOrder['receiving.name'].length || partialOrder['receiving.name'][1].length < 5) { return null }
                // _entrega_telefono -> receiving.phone
                partialOrder['receiving.phone'] = deliveryInfo[1].split(':')
                if (!partialOrder['receiving.phone'] || !partialOrder['receiving.phone'].length || partialOrder['receiving.phone'][1].length < 5) { return null }
                // _entrega_dirección -> receiving.address
                partialOrder['receiving.address'] = deliveryInfo[2].split(':')
                if (!partialOrder['receiving.address'] || !partialOrder['receiving.address'].length || partialOrder['receiving.address'][1].length < 10) { return null }
                // _entrega_comentarios -> atcComment
                partialOrder['atcComment'] = deliveryInfo[3].split(':')

                // Complete data
                // dealer
                partialOrder.dealer = await User.findOne({ type: 'dealer', phone: clearNumber(partialOrder.dealer[1]) })
                if (!partialOrder.dealer) { return { error: 'Realer no encontrado, verifica el número de teléfono e intenta nuevamente' } }
                partialOrder.dealer = partialOrder.dealer.public
                // store
                partialOrder.store = await User.findOne({ type: 'store', phone: clearNumber(partialOrder.store[1]) })
                if (!partialOrder.store) { return { error: 'Comercio no encontrado, verifica el número de teléfono e intenta nuevamente' } }
                partialOrder.store = partialOrder.store.public
                // orderDetail
                partialOrder.orderDetail = partialOrder.orderDetail[1]
                // delivery cost
                partialOrder.deliveryCost = Number(partialOrder.deliveryCost[1])
                // delivery
                const receivingName = 'receiving.name';
                const receivingPhone = 'receiving.phone';
                const receivingAddress = 'receiving.address';

                partialOrder.receiving = {
                    name: partialOrder[receivingName][1],
                    phone: partialOrder[receivingPhone][1],
                    address: partialOrder[receivingAddress][1],
                }
                delete partialOrder[receivingName];
                delete partialOrder[receivingPhone];
                delete partialOrder[receivingAddress];
                // atcCommet
                partialOrder.atcComment = partialOrder.atcComment[1]
                return partialOrder
            },
            dealer_message: () => {
                return `Hurra *${body.dealer.name}*, te hemos asignado una orden 🤙📦🚴🎉🥳!\n*Pedido:*\n ${body.orderDetail}\n*Comercio:*\n${body.store.name}\n*Dirección de entrega:*\n${body.receiving.address}`
            },
            store_message: () => {
                return `Hurra *${body.store.name}*, te hemos asignado un realer 🤙📦🚴🎉🥳!\n*Pedido:*\n ${body.orderDetail}\n*Realer:*\n${body.dealer.name} ${body.dealer.lastName}`
            }
        },
        'recado': {
            parser: async () => {
                return null
            }
        }
    }
    const extraData = await types[orderType] && types[orderType][tool] ? types[orderType][tool]() : null
    return extraData
}

const generateQrCode = (user) => {
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
}

module.exports = {
    logic_gateWay,
    generateQrCode
}