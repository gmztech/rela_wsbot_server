'use strict';

const joi = require('joi');

const envSchema = joi
  .object({
    MONGO_URI: joi.string()
  })
  .unknown()
  .required();

const { error, value: envVars } = joi.validate(process.env, envSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  databaseConfig: {
    uri: envVars.MONGODB_URI
  },
};

module.exports = config;
