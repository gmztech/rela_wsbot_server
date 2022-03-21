const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const PlanSchema = new Schema({
  created: Number,
  clientPays: Number,
  name: String,
  description: String,
  serviceFee: String,
  operation: { type: String, enum: ['add', 'subtract'] }
});

module.exports = {
  Plan: mongoose.model('plan', PlanSchema)
}