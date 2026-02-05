const Joi = require('joi');

const donorSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  age: Joi.number().integer().min(18).max(65).required(),
  bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  email: Joi.string().email().required(),
  address: Joi.string().min(10).max(500).required()
});

const verificationSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required()
});

module.exports = { donorSchema, verificationSchema };