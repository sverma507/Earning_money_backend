const Transaction = require('../models/Transaction');
const User = require('../models/User');
const withdrawPaymentRequest = require('../models/withdrawPaymentRequest');


const addWeeklySalaryFieldsToUsers = async (req, res) => {
    try {
      // Set the default values for the three keys
     const salary = [25000, 50000, 75000, 100000,250000, 500000, 750000, 1000000, 2500000, 5000000, 7500000, 10000000]
  
      // Update all users in the database with the default values for these keys
      const updateResult = await User.updateMany(
        {},
        {
          $set: {
            salary:salary
          }
        }
      );
  
      // Send a success response with the number of updated users
      res.status(200).json({
        message: `Successfully updated ${updateResult.nModified} users with weekly salary fields`,
        usersUpdated: updateResult.nModified
      });
    } catch (error) {
      console.error("Error updating users:", error);
      res.status(500).json({ message: "An error occurred while updating users", error });
    }
  };

  

  module.exports = {
    addWeeklySalaryFieldsToUsers
  };