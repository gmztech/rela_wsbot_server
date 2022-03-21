'use strict'

const Delivery = require('./delivery.model')

exports.getAll = async ctx => {
  let deliveries = await Delivery.find({})
  deliveries = deliveries.map(d => d._doc)
  ctx.body = deliveries
}
