'use strict';

const controller = require('./user.controller');

module.exports = Router => {
  try {
    const router = new Router({
      prefix: `/users`,
    });
  
    router
      .get('/session', controller.checkSession)
      .get('/:userId', controller.getSingle)
      .put('/:userId', controller.update)
      .post('/login', controller.login)
      
    return router;
  } catch(error) {
    console.log(error)
  }
}; 