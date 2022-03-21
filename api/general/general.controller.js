"use strict";

const {Plan, } = require("./general.model"); 
exports.getAllPlans = async (ctx) => {
  const plans = await Plan.find({}).sort({ created: 1 });
  ctx.body = { plans };
}; 