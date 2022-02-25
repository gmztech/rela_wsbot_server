const Koa = require('koa')
const bodyParser = require('koa-bodyparser')()
const compress = require('koa-compress')()
const helmet = require('koa-helmet')(/* Add your security option */)
const logger = require('koa-logger')()
const mount = require('koa-mount');

const serve  = require('koa-static')

const errorHandler = require('./middleware/error.middleware')
const auth = require('./middleware/auth')

const applyApiMiddleware = require('./api')
const { isDevelopment } = require('./config') 

const checkOriginAgainstWhitelist = ctx => {
  const requestOrigin = ctx.accept.headers.origin;
  const whitelist = process.env.ALLOW_DOMAINS.split(',')
  if (!whitelist.includes(requestOrigin)) {
      return ctx.throw(`🙈 ${requestOrigin} is not a valid origin`);
  }
  return requestOrigin;
}
const cors = require('@koa/cors')({ origin: checkOriginAgainstWhitelist })
const server = new Koa()

if (isDevelopment) {
  server.use(logger)
}

const static_pages = new Koa();
static_pages.use(serve('uploads'));

server 
  .use(mount('/uploads', static_pages))
  .use(errorHandler)
  .use(helmet)
  .use(compress)
  .use(cors)
  .use(auth)
  .use(bodyParser)
  
applyApiMiddleware(server)

module.exports = server
