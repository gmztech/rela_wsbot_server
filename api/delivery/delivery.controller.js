'use strict'

const Delivery = require('./delivery.model')

exports.getAll = async ctx => {
  let deliveries = await Delivery.find({})
  deliveries = deliveries.map(d => d._doc)
  ctx.body = deliveries
}

exports.getZones = async ctx => {
  const {query} = ctx.request.body
  let deliveries = await Delivery.find(query)
  deliveries = deliveries.map(d => d._doc)
  ctx.body = deliveries
}
