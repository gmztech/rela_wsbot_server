'use strict'
const AtcOrder = require('./atco.model')  

exports.createAtcOrder = async (ctx) => {
  try {
    const { body } = ctx.request;
    body.status = 'started'
    const create = await AtcOrder.create(body);
    ctx.body = {success: true};
  } catch (error) {
    ctx.body = error;
  }
};

exports.updateAtcOrder = async (ctx) => {
  try {
    const { orderId } = ctx.params
    const { body } = ctx.request; 
    await AtcOrder.findByIdAndUpdate(orderId, body);
    ctx.body = {success: true};
  } catch (error) {
    ctx.body = error;
  }
};

exports.getAtcOrders = async ctx => {
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
    const orders = await AtcOrder.find(query).sort({ created: -1 })
    ctx.body = orders
  } catch (error) {
    return error
  }
}
