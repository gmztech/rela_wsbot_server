'use strict';

const controller = require('./delivery.controller'); 
module.exports = Router => {
  const router = new Router({
    prefix: `/deliveries`,
  });

  router
    .get('/', controller.getAll)
    
  return router;
};
