'use strict';

const controller = require('./botorder.controller'); 
module.exports = Router => {
  const router = new Router({
    prefix: `/botorders`,
  });
  
  router 
    .get('/', controller.getBotOrders)
    .post('/', controller.createBotOrders)
    .put('/:orderId', controller.updateBorOrders)
    
  return router;
};
