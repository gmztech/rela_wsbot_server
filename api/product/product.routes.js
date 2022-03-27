'use strict';

const controller = require('./product.controller'); 
const multer = require('@koa/multer');
const upload = multer();
const koaBody = require('koa-body')
 
module.exports = Router => {
  const router = new Router({
    prefix: `/products`,
  });

  router
    .post('/', controller.getAll)
    .get('/bytext/:text', controller.getByText)
    
  return router;
};
