'use strict'

const { locale } = require('../../config').server
const User = require('./user.model') 
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
    let user = await User.findOne({ email: body.email, type: body.type })
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
