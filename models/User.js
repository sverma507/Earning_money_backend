const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true, unique: true },
    userName: { type: String, default: "" },
    email: { type: String, default: "" },
    password: { type: String, required: true },
    referralCode: { type: String, unique: true },
    referredBy: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    teamIncome: { type: Number, default: 0 },
    wallet: { type: Number, default: 0 },
    totalEarning: { type: Number, default: 0 },
    rechargeWallet: { type: Number, default: 0 },
    withdrawlCount: { type: Number, default: 0 },
    yesterdayWallet: { type: Number, default: 0 },
    earningWallet: { type: Number, default: 0 },
    business: { type: Number, default: 0 },
    vanAccoutStatus: { type: Boolean, default: false },
    packages: [{ type: mongoose.Schema.Types.ObjectId }],
    active: { type: Boolean, default: false },
    purchaseDate: [{ type: Date }],
    temporaryWallet: { type: Number, default: 0 },
    weeklySalaryActivation: {
      type: [Boolean], 
      default: [false, false, false, false, false, false, false, false, false, false, false, false]
    },
    weeklySalaryStartDate: {
      type: [Date], 
      default: [
        new Date().setHours(0, 0, 0, 0), new Date().setHours(0, 0, 0, 0), 
        new Date().setHours(0, 0, 0, 0), new Date().setHours(0, 0, 0, 0), 
        new Date().setHours(0, 0, 0, 0), new Date().setHours(0, 0, 0, 0), 
        new Date().setHours(0, 0, 0, 0), new Date().setHours(0, 0, 0, 0), 
        new Date().setHours(0, 0, 0, 0), new Date().setHours(0, 0, 0, 0), 
        new Date().setHours(0, 0, 0, 0), new Date().setHours(0, 0, 0, 0)
      ]
    },
    weeklySalaryPrice: {
      type: [Number],
      default: [50, 100, 150, 200, 500, 1000, 1500, 2000, 3000, 6000, 12000, 30000]
    },
    powerLeg: {
      type: [Number],
      default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    otherLeg: {
      type: [Number],
      default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    salary: {
      type: [Number],
      default: [25000, 50000, 75000, 100000,250000, 500000, 750000, 1000000, 2500000, 5000000, 7500000, 10000000]
    },
    claimBonus: [{ type: Boolean, default: true }],
    todayEarning: { type: Number, default: 0 },
    myRoi: [{ type: Number, default: 0 }],
    // withdrawlCount : { type:Number , default:0 },
    spinCount: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    dailyReferralCount: { type: Number, default: 0 },
    lastReferralDate: { type: Date, default: new Date().setHours(0, 0, 0, 0) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
