const mongoose = require("mongoose");
const wsBotUtils = require('./../../wsbot/wsbotUtils');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const BotOrderSchema = new Schema({
  order: String, 
  created: Number,
  deliveryCost: Number,
  orderDetail: String,
  atcComment: String,
  dealer: {},
  admin: {},
  store: {},
  receiving: {
    name: String,
    phone: String,
    address: String
  },
  request: {},
  status: {
    type: String,
    enum: [
      "creating",
      "started",
      "completed",
      "canceled",
    ],
  },
  internal: {
    type: String,
    enum: Object.keys(wsBotUtils.internalOrderObj).map(type => type ),
  }
});
BotOrderSchema.set('autoIndex', false);
module.exports = mongoose.model("BotOrder", BotOrderSchema);
