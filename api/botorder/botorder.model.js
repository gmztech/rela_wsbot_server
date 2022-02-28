const mongoose = require("mongoose");
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
  user: {},
  receiving: {},
  request: {},
  status: {
    type: String,
    enum: [
      "started",
      "completed",
      "canceled",
    ],
  },
  internal: {
    type: String,
    enum: [
      "recado",
      "interno_tienda",
      "rela_go"
    ],
  }
});
BotOrderSchema.set('autoIndex', false);
module.exports = mongoose.model("BotOrder", BotOrderSchema);
