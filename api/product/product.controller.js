'use strict';

const Product = require('./product.model')

exports.getAll = async ctx => {
  const {query} = ctx.request.body
  const { user } = ctx.request;
  if ( user.type !== 'admin' ) {
    return ctx.body = { error: 'Not found' }
  }
  if(!query['store']) {
    return ctx.body = { error: 'Not found' }
  }
  let products = await Product.find(query) 
  ctx.body = products
};

exports.getByText = async ctx => {
  const { text } = ctx.params 
  const { user } = ctx.request
  if ( user.type !== 'admin' ) {
    return ctx.body = { error: 'Not found' }
  }
  const query = {
    type: 'store',
    $or: [
      { name: { $regex: text, $options: 'i' } }
    ]
  }
  const products = await Product.find(query)
  ctx.body = products
}
