const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
 
const UserSchema = new Schema({
  created: { type: Number, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['admin', 'store', 'user', 'dealer']},
  gender: { type: String, enum: ['male', 'female', 'other']},
  lastName: { type: String },
  picture: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  citizenId: { type: String },
  address: { type: String },
  phone: { type: String, required: true },
  birthDate: { type: String },
  code: { type: String },
  superAdmin: { type: Boolean },
  headerPicture: { type: String },
  service: { type: String },
  businessType: { type: String },
  schedule: { type: String },
  scheduleWeek: {},
  paymentMethod: { type: String },
  rrss: { type: String },
  delegate: { type: String },
  yadio: { type: Boolean },
  tasaCambio: { type: Number },
  enabled: { type: Boolean },
  open: { type: Boolean },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'plan' },
  storeCategory: {},
  position: { type: Number },
  atcCheckout: { type: Boolean },
  productDisclaimer: { type: String },
  hidePrices: Boolean,
  username: String
});

UserSchema 
  .virtual( 'public' )
  .get( function() {
    return {
      id: this._id,
      username: this.username,
      productDisclaimer: this.productDisclaimer,
      created: this.created,
      type: this.type,
      open: this.open,
      atcCheckout: this.atcCheckout,
      name: this.name,
      lastName: this.lastName,
      picture: this.picture,
      email: this.email,
      citizenId: this.citizenId,
      address: this.address,
      phone: this.phone,
      birthDate: this.birthDate,
      code: this.code,
      service: this.service,
      headerPicture: this.headerPicture,
      businessType: this.businessType,
      schedule: this.schedule,
      scheduleWeek: this.scheduleWeek,
      paymentMethod: this.paymentMethod,
      rrss: this.rrss,
      delegate: this.delegate,
      gender: this.gender,
      superAdmin: this.superAdmin,
      yadio: this.yadio,
      enabled: this.enabled,
      tasaCambio: this.tasaCambio,
      plan: this.plan,
      storeCategory: this.storeCategory,
      position: this.position,
      hidePrices: this.hidePrices
    };
  });

module.exports = mongoose.model('User', UserSchema);