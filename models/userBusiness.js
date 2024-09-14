const mongoose = require('mongoose');

const SalaryTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: Number, required: true },
  powerLeg: { type: String },
  otherLeg: { type: Number},
  total: { type: String },
  status: { type: Boolean, default:false },
}, { timestamps: true });

module.exports = mongoose.model('SalaryTransaction', SalaryTransactionSchema);