'use strict';

const fs = require('fs');
const path = require('path');
const Router = require('koa-router');

const { apiVersion } = require('../config').server;
const baseName = path.basename(__filename);

function applyApiMiddleware(app) {
  try {
    const router = new Router({
      prefix: `/api/v${apiVersion}`,
    });
    
    fs.readdirSync(__dirname)
      .filter(file => file.indexOf('.') !== 0 && file !== baseName)
      .forEach(file => {
        const api = require(path.join(__dirname, file))(Router);
        router.use(api.routes());
      });
  
    app.use(router.routes()).use(router.allowedMethods());
  } catch (error) {
    console.log(error)
  }
}

module.exports = applyApiMiddleware;
