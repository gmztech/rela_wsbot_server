const User = require('../api/user/user.model')
const { Client, LocalAuth } = require('whatsapp-web.js');
const { generateQrCode } = require('./bot.logic')
const { createOrder } = require('./admin.logic')
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
            wsBot = new Client({
                puppeteer: puppeteerArgs,
                authStrategy: new LocalAuth({
                    session: user.tmpss
                })
            });
            wsBot.initialize();
        } else {
            wsBot = new Client({
                puppeteer: puppeteerArgs,
                authStrategy: new LocalAuth({
                    clientId: user.id.toString()
                })
            });
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
        }
        user = { ...user, wsBot }
        // Socket listeners
        user.socket.on('wsbot_authenticate', msg => {
            console.log(user.name, ': requesting qr')
            generateQrCode(user)
        })

        user.socket.on('wsbot_disconnect', async () => {
            console.log(user.name, ': requested disconnect wsbot')
            user.wsBot.logout()
        })

        user.socket.on('create_order', async (data) => {
            createOrder(data, user.socket)
        })

        //wsbot listeners
        user.wsBot.on('ready', async () => {
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
            if (reason !== 'NAVIGATION') {
                await User.findByIdAndUpdate(userId, { $set: { tmpss: undefined } }, { new: true })
            }
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
        });

        user.wsBot.on('auth_failure', async (msg) => {
            console.log(user.name, ': wsbot faled authentication', ': ' + msg)
            await User.findByIdAndUpdate(userId, { $set: { tmpss: undefined } }, { new: true })
            user.socket.emit('ws_botAuthenticated', { wsBotAuthenticated: false })
        });

        user.wsBot.on('message', (msg) => logic_gateWay({ msg, wsBot: user.wsBot, user, socket: user.socket }))
    })
}

module.exports = {
    eventHandler
}