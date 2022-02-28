'use strict'
const BotOrder = require('./botorder.model')
// const run = async ()=>{
//   await BotOrder.remove({});
// }
// run()

exports.createBotOrders = async (ctx) => {
  try {
    const { body } = ctx.request;
    body.status = 'started'
    const create = await BotOrder.create(body);
    ctx.body = {success: true};
  } catch (error) {
    ctx.body = error;
  }
};

exports.updateBorOrders = async (ctx) => {
  try {
    const { orderId } = ctx.params
    const { body } = ctx.request; 
    await BotOrder.findByIdAndUpdate(orderId, body);
    ctx.body = {success: true};
  } catch (error) {
    ctx.body = error;
  }
};

exports.getBotOrders = async ctx => {
  try{ 
    let query = ctx.request.query.filter ? JSON.parse(ctx.request.query.filter) : {} 
    if(query.from && query.to) {
      query = {
        ...query,
        $and: [
          { created: {$gt: query.from} },
          { created: {$lt: query.to} }
        ]
      }
      delete query.from
      delete query.to
      delete query.created
    }
    const orders = await BotOrder.find(query).sort({ created: -1 })
    ctx.body = orders
  } catch (error) {
    return error
  }
}
