'use strict';

const joi = require('joi');

const envSchema = joi
  .object({
    NODE_ENV: joi.string().allow(['development', 'production']),
    PORT: joi.number(),
    API_VERSION: joi.number(),
    LOCALE: joi.strict()
  })
  .unknown()
  .required();
  
const { error, value: envVars } = joi.validate(process.env, envSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  server: {
    port: envVars.PORT || 3000,
    apiVersion: envVars.API_VERSION || 'v1',
    locale:  envVars.LOCALE,
  },
};

module.exports = config;
