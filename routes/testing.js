const Transaction = require('../models/Transaction');
const User = require('../models/User');
const withdrawPaymentRequest = require('../models/withdrawPaymentRequest');
const GameIncomeTransaction = require("../models/gameIncome");


const claimProfit = async (req, res) => {
  try {
    // Find all active users
    const activeUsers = await User.find({ active: true });

    if (activeUsers.length === 0) {
      return res.status(404).json({ message: "No active users found" });
    }

    // Loop through each active user and update claimBonus for all their packages
    for (const user of activeUsers) {
      // Assuming each user has multiple packages, we set claimBonus to true for each package
      user.claimBonus = user.claimBonus.map(() => true); // Set claimBonus to true for all packages
      await user.save();
    }

    // Send a success response
    res.status(200).json({
      message: `Successfully updated claimBonus for all active users.`,
      usersUpdated: activeUsers.length,
    });
  } catch (error) {
    console.error("Error updating claimBonus:", error);
    res.status(500).json({
      message: "An error occurred while updating claimBonus",
      error,
    });
  }
};

  

  module.exports = {
    claimProfit
  };