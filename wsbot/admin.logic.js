const BotOrder = require('../api/botorder/botorder.model')
const User = require('../api/user/user.model')

const createOrder = async (order, socket) => {
    try {
        const newOrder = await BotOrder.create(order)
        socket.emit('order_created', newOrder._doc)
        socket.emit('refresh_orders', newOrder._doc)
    } catch (error) {
        socket.emit('order_error', error)
    }
}

module.exports = {
    createOrder
}