const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId
 
const ProductSchema = new Schema({
  created: { type: Number },
  category: String,
  name: { type: String, required: true },
  description: { type: String },
  estimedTime: String,
  picture: { type: String },
  price: { type: Number },
  priceBolivar: { type: Number },
  priceBasedOnOptions: { type: Boolean },
  options: [{
    mandatory: { type: Boolean },
    multiselect: { type: Boolean },
    priceBasedOnOptions: { type: Boolean },
    list: [{
      name: { type: String },
      price: { type: Number },
    }]
  }],
  store: { type: ObjectId, ref: 'User'},
  metadata: {},
  disabled: { type: Boolean },
  isPromo: { type: Boolean }
})

ProductSchema 
  .virtual( 'public' )
  .get( function() {
    return {
      id: this._id,
      created: this.created,
      category: this.category,
      name: this.name,
      description: this.description,
      options: this.options,
      estimedTime: this.estimedTime,
      picture: this.picture,
      price: this.price,
      priceBolivar: this.priceBolivar,
      priceBasedOnOptions: this.priceBasedOnOptions,
      store: this.store,
      metadata: this.metadata,
      disabled: this.disabled,
      isPromo: this.isPromo
    };
  });

module.exports = mongoose.model('Product', ProductSchema)

