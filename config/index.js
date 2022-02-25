'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const config = {};
const basePath = path.join(__dirname, 'components');

fs.readdirSync(basePath).forEach(file => {
  const componentConfig = require(path.join(basePath, file));
  Object.assign(config, componentConfig);
});

module.exports = config;
