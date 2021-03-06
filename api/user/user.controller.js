'use strict'

const { locale } = require('../../config').server
const User = require('./user.model') 
const {Plan} = require('../general/general.model') 
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')


exports.checkSession = async ctx => {
  try {
    const token = ctx.request.header.authorization.split(' ')[1]
    const decoded = jwt.verify(token, locale)
    if (!decoded.id)
      return ctx.body = { error: `Invalid token` }

    let user = await User.findOne({ _id: decoded.id })
    if (!user)
      return ctx.body = { error: `Invalid token` }

    ctx.body = user.public

  } catch (error) {
    ctx.body = {
      error
    }
  }

}

exports.login = async ctx => {
  try {
    const body = ctx.request.body
    let user = await User.findOne({ email: body.email, type: 'admin' })
    if (!user)
      return ctx.body = { error: `Este usuario no existe` }
    const verifyPass = await bcrypt.compare(body.password, user.password)
    if (!verifyPass)
      return ctx.body = { error: `Contraseña incorrecta` }
    const tmp = jwt.sign({ id: user._id }, locale)
    ctx.body = {
      user: user.public,
      tmp
    }
  } catch (error) {
    ctx.body = {
      error
    }
  }

} 

exports.update = async ctx => {
  let body = ctx.request.body
  const { userId } = ctx.params
  if (!body.storeCategory) { body.storeCategory = {} }
  const edited = await User.findByIdAndUpdate({ _id: userId }, { $set: body }, { new: true })
  ctx.body = edited.public
}

exports.getSingle = async ctx => {
  const { userId } = ctx.params
  let user = await User.findOne({ _id: userId })
  user = user._doc
  delete user.password
  ctx.body = user
}

exports.findUsers = async ctx => {
  const {query} = ctx.request.body
  const { user } = ctx.request
  if (!user || user.type === 'user') {
    query['enabled'] = true
  }
  let users = await User.find(query).populate('plan')
  // gets the public document
  users = users.map(u => Object.assign({}, u.public, {
    plan: u.public.plan ? u.public.plan._doc : undefined
  }))
  if (!user || user.type === 'user') {
    // sorts firts alphabetically
    users = users.sort((a, b) => a.name.localeCompare(b.name))
    // then by position
    users = users.sort((a, b) => {
      const aHas = typeof a.position !== 'undefined';
      const bHas = typeof b.position !== 'undefined';
      return (bHas - aHas) || (aHas === true && a.position - b.position) || 0;
    });
  }
  ctx.body = users
}
