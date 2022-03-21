'use strict';

const controller = require('./general.controller');

module.exports = Router => {
  const router = new Router({
    prefix: `/general`,
  });

  router
    .get('/plans', controller.getAllPlans) 
    
  return router;
}; 