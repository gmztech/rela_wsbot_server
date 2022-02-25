const User = require('../api/user/user.model')
const jwt = require('jsonwebtoken')
const { locale } = require('../config').server

module.exports = async (ctx, next) => {
    try {  
        if ( !/\/api\//.test(ctx.path) ) return next()
        
        if ( ctx.originalUrl === '/api/v1/users/login' ) return next()
        if ( ctx.originalUrl === '/api/v1/users?' && ctx.method === 'POST' ) return next()
        
        if ( !ctx.request.header.authorization && ctx.method !== 'GET' ) 
            return ctx.body = { error: `Invalid token` }

        const token = ctx.request.header.authorization.split(' ')[1]
        if ( /null/.test(token) && ctx.method === 'GET')
            return next()
            
        const decoded = jwt.verify(token, locale)

        if ( !decoded.id ) {
            return ctx.body = { error: `Invalid token` }
        } 
        
        if ( decoded.id === 'superuser' )
            return next()

        let user = await User.findOne({ _id: decoded.id })
        if ( !user )
            return ctx.body = { error: `Invalid token` }
        
        ctx.request.user = user.public
        return next()

      } catch(err) {
        ctx.body = { error: `Invalid token` }
      }
  }
  