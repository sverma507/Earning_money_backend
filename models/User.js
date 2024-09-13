const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  userName : {type:String,default:""},
  email: { type: String,default:"" },
  password: { type: String, required: true },
  referralCode: { type: String, unique: true },
  referredBy: { type: String,default:"" },
  accountNumber: { type:String,default:"" },
  ifscCode: { type:String,default:"" },
  teamIncome:{type:Number,default:0 },
  wallet: { type: Number, default: 0 },
  totalEarning: { type: Number, default: 0 },
  rechargeWallet: { type: Number, default: 0 },
  withdrawlCount: { type: Number, default:0 },
  yesterdayWallet:{type:Number,default:0},
  earningWallet: { type: Number, default: 0 },
  vanAccoutStatus: { type:Boolean, default:false },
  packages: [{ type: mongoose.Schema.Types.ObjectId }],
  active: { type: Boolean, default: false },
  purchaseDate:  [{ type: Date }],
  temporaryWallet: { type:Number, default:0 },
  claimBonus:[{type:Boolean,default:true }],
  todayEarning: { type: Number, default: 0 },
  myRoi: [{ type:Number, default:0 }],
  // withdrawlCount : { type:Number , default:0 },
  spinCount:{ type:Number,default:0 },
  blocked: { type: Boolean, default: false },
  dailyReferralCount: { type: Number, default: 0 },
  lastReferralDate: { type: Date, default: new Date().setHours(0, 0, 0, 0) },
}, { timestamps: true });



module.exports = mongoose.model('User', userSchema);