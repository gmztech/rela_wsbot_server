const mongoose = require('mongoose');
const Schema = mongoose.Schema; 
 
const DeliverySchema = new Schema({
  created: { type: Number },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  priceBolivar: { type: Number, required: true },
  conveyance: { type: String, enum: [
    'Carro', 'Moto', 'Bicicleta'
  ] },
  coordinates: {}
});

module.exports = mongoose.model('Delivery', DeliverySchema);