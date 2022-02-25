'use strict';

const controller = require('./atco.controller'); 
module.exports = Router => {
  const router = new Router({
    prefix: `/atcorders`,
  });
  
  router 
    .get('/', controller.getAtcOrders)
    .post('/', controller.createAtcOrder)
    .put('/:orderId', controller.updateAtcOrder)
    
  return router;
};
