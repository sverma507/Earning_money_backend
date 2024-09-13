// const cryptoTransaction = require('../models/cryptoTransaction');
// const Transaction = require('../models/Transaction');
// const User = require('../models/User');
// const withdrawPaymentRequest = require('../models/withdrawPaymentRequest');


// const addWithdrawalCountToUsers = async (req, res) => {
//   try {
//     // Find all withdrawal transactions in the database
//     const allTransactions = await Transaction.find({});

//     if (!allTransactions.length) {
//       return res.status(200).json({ message: "No transactions found." });
//     }

//     // Iterate over each transaction and update userCode with the referralCode of the user
//     const updatePromises = allTransactions.map(async (transaction) => {
//       // Fetch the user by their ID from the transaction
//       const user = await User.findById(transaction.user); // Assuming userId field is stored in the transaction

//       if (user) {
//         // Update the withdrawal transaction with the referralCode as userCode
//         return withdrawPaymentRequest.updateOne(
//           { _id: transaction._id },
//           { $set: { userCode: user.referralCode } } // Add referralCode as userCode and type field
//         );
//       }
//     });

//     // Await all updates
//     const updateResults = await Promise.all(updatePromises);

//     // Count the number of modified transactions
//     const transactionsModifiedCount = updateResults.filter(result => result.nModified > 0).length;

//     // Send a success response
//     res.status(200).json({
//       message: `Successfully updated ${transactionsModifiedCount} transactions with userCode`,
//       transactionsModifiedCount
//     });

//   } catch (error) {
//     console.error("Error updating transactions:", error);
//     res.status(500).json({ message: "An error occurred while updating transactions", error });
//   }
// };

//   module.exports = {
//     addWithdrawalCountToUsers
//   };