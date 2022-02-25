const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const AtcOrderSchema = new Schema({
  order: String,
  subtotal: Number,
  total: Number,
  created: Number,
  deliveryCost: Number,
  canceledReason: String,
  atcComment: String,
  dealer: {},
  admin: {},
  cupon: {},
  products: [],
  paymentMethod: {},
  bills: String,
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
      "store",
      "user"
    ],
  },

});

module.exports = mongoose.model("AtcOrder", AtcOrderSchema);
