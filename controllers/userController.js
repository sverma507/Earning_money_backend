const cron = require("node-cron");
const axios = require("axios");
const User = require("../models/User");
const Package = require("../models/Package");
const Transaction = require("../models/Transaction");
const Admin = require("../models/admin");
const Payments = require("../models/payment");
const Product = require("../models/addPackage");
const DailyIncomeTransaction = require("../models/dailyIncome");
const LevelIncomeTransaction = require("../models/levelIncome");
const GameIncomeTransaction = require("../models/gameIncome");
const WithdrawPaymentRequest = require("../models/withdrawPaymentRequest");
const ActivationTransaction = require("../models/activationTransaction");
const SalaryTransaction = require('../models/userBusiness.js')
// Payment Gateway API Details
const API_URL = "https://tejafinance.in/api/prod/merchant/pg/payment/initiate";
const TOKEN_URL = "https://tejafinance.in/api/prod/merchant/getToken";
const RESPONSE_URL = "https://tejafinance.in/pg/payment/{token}/response";

// Calculate Daily Referral Profits
exports.calculateDailyReferralProfits = async (userId) => {
  try {
    const user = await User.findById(userId);
    const referringUser = await User.findOne({ referralCode: user.referredBy });
    // console.log('user refer ==>',user);
    // console.log('user referring ==>',referringUser);

    if (!referringUser) {
      console.log(
        `Referring user not found for referral code: ${user.referredBy}`
      );
      return;
    }

    // Reset dailyReferralCount if it's a new day
    const today = new Date().setHours(0, 0, 0, 0);
    if (new Date(referringUser.lastReferralDate).setHours(0, 0, 0, 0) < today) {
      referringUser.dailyReferralCount = 0;
      referringUser.lastReferralDate = today;
    }

    // Get package details for the referred user and referring user
    const referredUserPackages = await Product.find({
      _id: { $in: user.packages },
    });
    const referringUserPackages = await Product.find({
      _id: { $in: referringUser.packages },
    });

    // console.log('referredUserPackages ==>',referredUserPackages);
    // console.log('referringUserPackages ==>',referringUserPackages);

    if (
      referredUserPackages.length === 0 ||
      referringUserPackages.length === 0
    ) {
      console.log(
        `No valid packages found for user: ${userId} or referring user: ${referringUser._id}`
      );
      return;
    }

    // Find the max package price for both referred user and referring user
    const referredUserMaxPackage = referredUserPackages.reduce((maxPkg, pkg) =>
      pkg.price > maxPkg.price ? pkg : maxPkg
    );
    const referringUserMaxPackage = referringUserPackages.reduce(
      (maxPkg, pkg) => (pkg.price > maxPkg.price ? pkg : maxPkg)
    );

    // console.log('referredUserMaxPackage ==>',referredUserMaxPackage);
    // console.log('referringUserMaxPackage ==>',referringUserMaxPackage);

    // Give profit only if referred user's max package price is >= referring user's max package price
    // if (referredUserMaxPackage.price >= referringUserMaxPackage.price) {
    referringUser.dailyReferralCount += 1;

    // Determine the profit level (1 to 3)
    const level = Math.min(referringUser.dailyReferralCount, 3);
    const profitMap = {
      1: {
        "A-1-540": 100,
        "B-2-1350": 120,
        "C-3-3150": 150,
        "D-4-6750": 200,
        "E-5-11250": 250,
        "F-6-29250": 300,
      },
      2: {
        "A-1-540": 120,
        "B-2-1350": 150,
        "C-3-3150": 200,
        "D-4-6750": 250,
        "E-5-11250": 300,
        "F-6-29250": 500,
      },
      3: {
        "A-1-540": 150,
        "B-2-1350": 200,
        "C-3-3150": 250,
        "D-4-6750": 300,
        "E-5-11250": 350,
        "F-6-29250": 500,
      },
    };

    // Get the profit amount for the referring user's max package
    const dailyProfit = profitMap[level][referredUserMaxPackage.name] || 0;

    referringUser.wallet += dailyProfit;
    referringUser.earningWallet += dailyProfit;
    referringUser.totalEarning += dailyProfit;
    referringUser.todayEarning += dailyProfit;
    referringUser.lastReferralDate = new Date(); // Update lastReferralDate to current time
    await referringUser.save();

    // console.log('referringUserUpdated ==>',referringUser);
    // console.log("user, amount, fromUser, package ===> ",referringUser._id,dailyProfit,userId,referringUserMaxPackage.name);

    const dailyReferralTransaction = new ReferralIncomeTransaction({
      user: referringUser._id,
      amount: dailyProfit,
      fromUser: user.referralCode,
      package: referredUserMaxPackage.name,
    });
    await dailyReferralTransaction.save();
    //  console.log('dailyReferralProfit ==>',dailyReferralTransaction);

    console.log(
      `Daily profit of ${dailyProfit} added to referring user: ${referringUser._id}`
    );
    // } else {
    //   console.log(`Referred user's package price ${referredUserMaxPackage.price} is less than referring user's package price ${referringUserMaxPackage.price}`);
    // }
  } catch (err) {
    console.error("Error calculating daily referral profits:", err);
  }
};

exports.myTeamMembers = async (req, res) => {
  const { id, level } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch users at the specified level
    const levelUsers = await getUsersAtLevel(
      user.referralCode,
      parseInt(level)
    );

    // Manually populate packages
    const levelUsersWithPackages = await Promise.all(
      levelUsers.map(async (teamMember) => {
        const packages = await Product.find({
          _id: { $in: teamMember.packages },
        });
        return { ...teamMember.toObject(), packages };
      })
    );

    console.log(
      `Users at level ${level} with populated packages:`,
      levelUsersWithPackages
    );

    res.status(200).json(levelUsersWithPackages);
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to get users at a specific level
const getUsersAtLevel = async (referralCode, level) => {
  let usersAtLevel = [];

  for (let i = 1; i <= level; i++) {
    if (i === 1) {
      usersAtLevel = await User.find({ referredBy: referralCode });
    } else {
      const previousLevelUsers = usersAtLevel.map((user) => user.referralCode);
      usersAtLevel = await User.find({
        referredBy: { $in: previousLevelUsers },
      });
    }
  }

  return usersAtLevel;
};

exports.myProjects = async (req, res) => {
  try {
    // console.log("req.params=>", req.params);

    const result = await User.find({ _id: req.params.id });
    // console.log("result users projects=>", result);

    const products = await Promise.all(
      result.map(async (user) => {
        return await Promise.all(
          user.packages.map(async (item) => {
            return await Product.findOne({ _id: item });
          })
        );
      })
    ).then((productArrays) => productArrays.flat());

    // console.log("products=>", products);

    res.status(200).send({ users: result, products });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAccountDetails = async (req, res) => {
  try {
    const result = await User.findOne({ _id: req.params.userId });
    console.log("reult", result);

    const { accountNumber, ifscCode, userName, wallet } = result;
    res.status(200).send({ accountNumber, ifscCode, userName, wallet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAccountDetails = async (req, res) => {
  try {
    const { accountNumber, ifscCode, userName } = req.body;

    if (!accountNumber || !ifscCode || !userName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    console.log("datfatat=>");

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { accountNumber, ifscCode, userName },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Account details updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSelfBonusList = async (req, res) => {
  // console.log(req.params.id);

  try {
    const result = await selfBonus.find({ user: req.params.id });
    // console.log("result",result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllSelfBonusList = async (req, res) => {
  // console.log(req.params.id);

  try {
    const result = await selfBonus.find();
    // console.log("result",result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDailyIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await DailyIncomeTransaction.find({ user: req.params.id });
    // console.log("result",result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.uptimeRobot = async () => {
  try {
    res.status(200).send("Hello Hype");
  } catch (error) {
    res.status(400).json({ error: err.message });
  }
};

exports.getGameIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await GameIncomeTransaction.find({ userId: req.params.id });
    console.log("result", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deductWalletOnGame = async (req, res) => {
  try {
    const { userId, amount, game, type } = req.body;
    const user = await User.findById(userId);
    if (user.wallet <= 0) {
      return;
    }
    user.wallet -= amount;
    // user.earningWallet -= amount;
    await user.save();

    const newPrize = new GameIncomeTransaction({
      userId,
      prize: amount,
      game,
      type,
    });

    await newPrize.save();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addGamePrize = async (req, res) => {
  try {
    const { prize, userId, game, type } = req.body;
    const user = await User.findById(userId);

    if (prize > 0) {
      const newPrize = new GameIncomeTransaction({
        userId,
        prize,
        game,
        type,
      });
      await newPrize.save();
      user.wallet += prize;
    }

    user.spinCount -= 1;
    user.earningWallet += prize;
    user.totalEarning += prize;
    user.todayEarning += prize;
    await user.save();

    res.status(200).json({ prize, message: "Prize added to wallet" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLevelIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await LevelIncomeTransaction.find({ user: req.params.id });
    console.log("result", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getReferralsIncomeList = async (req, res) => {
  console.log(req.params.id);

  try {
    const result = await ReferralIncomeTransaction.find({
      user: req.params.id,
    });
    console.log("result", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getWithdrawPaymentRequest = async (req, res) => {
  console.log("withdraw transaction called");

  const userId = req.params.id;
  try {
    const result = await WithdrawPaymentRequest.find({ userId });
    res.json(result);
  } catch (err) {
    console.log("Error while getting withdraw transactions:", err);
    res.status(500).send("Server Error");
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const result = await Payments.find({ userId: req.params.id });
    console.log("reult", result);

    res.status(200).send(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // Use req.params.id to get the user ID
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
    console.log("error");
  }
};

// Get Referral History

exports.getReferralHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    res.status(200).json(referredUsers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.buyPackage = async (req, res) => {
  try {
    const { packageId, userId } = req.body;
    console.log("body ==>", req.body);

    // Find the package by ID
    const packageData = await Product.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Find the user who is purchasing the package
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has enough balance in recharge wallet
    if (user.rechargeWallet < packageData.price) {
      return res
        .status(400)
        .json({ error: "Insufficient balance in recharge wallet." });
    }

    // Deduct the package price from user's recharge wallet
    user.rechargeWallet -= packageData.price;

    // Update user data
    user.active = true;
    user.spinCount += 1;
    user.packages.push(packageData._id); // Add package to user's purchased packages
    user.purchaseDate.push(Date.now());
    user.claimBonus.push(false);
    user.myRoi.push(0);

    // Save the updated user
    await user.save();
    console.log("user updated", user);

    // Save activation transaction
    const activation = new ActivationTransaction({
      user: user.referralCode,
      email: user.email,
      mobileNumber: user.mobileNumber,
      activateBy: "user",
      package: packageData.name,
      packagePrice:packageData.price,
      wallet: user.rechargeWallet,
    });
    await activation.save();

    // Calculate daily referral profits
    // await this.calculateDailyReferralProfits(user._id);

    // Return success response
    res
      .status(200)
      .json({
        message: "Package purchased successfully",
        package: packageData,
      });
    console.log(packageData);

    await updateUplineBuisness(userId, packageId);
    await checkBusiness();
  } catch (error) {
    console.log("error=>", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateUplineBuisness = async (userId, packageId) => {
  try {
    const userData = await User.findById(userId);
    const productDetails = await Product.findById(packageId);
    const upline = await User.findOne({ referralCode: userData.referredBy });

    if (upline && upline.active) {
      upline.business += productDetails.price;

      await upline.save();

      await updateUplineBuisness(upline, packageId);
    }
  } catch (error) {
    console.log("error=>", error);
    res.status(500).json({ error: error.message });
  }
};

// cron.schedule("*/5 * * * * *", () => {
//   console.log("Running Withdrawal status update...");
//   checkBusiness();
// });

const checkBusiness = async () => {
  try {
    const users = await User.find({ active: true });
    console.log("users ==>", users);

    for (const user of users) {
      const downlineUsers =
        (await User.find({ referredBy: user.referralCode })) || [];
      console.log("downline ===>", downlineUsers);

      let businessArray = [];
      let powerLeg = 0;
      let singleLeg = 0;
      let max = 0;

      for (let i = 0; i < downlineUsers.length; i++) {
        businessArray.push(downlineUsers[i].business);
      }

      let totalSum = businessArray.reduce((acc, num) => acc + num, 0);

      for (let num of businessArray) {
        let sumOfRemaining = totalSum - num;

        // Check if the current number is greater than the sum of the remaining numbers
        if (num > sumOfRemaining) {
          powerLeg = num;
          break; // Return the first number that satisfies the condition
        }
      }

      if (powerLeg == 0) {
        powerLeg = Math.max(...businessArray);
      }
      singleLeg = totalSum - powerLeg;

      await checkSalary(user._id, powerLeg, singleLeg);
      // const dailySalaryTransaction = new SalaryTransaction({
      //   user: user._id,
      //   netIncome: uplineProfit,
      //   fromUser: originalUser.referralCode, // Use the original user for fromUser
      //   amount: dailyProfit,
      //   level,
      //   package: product.name,
      // });
      // await dailySalaryTransaction.save();
    }
    // return array;
    // console.log('array ==>',businessArray);
  } catch (error) {
    //  return error
    console.log(error);
  }
};

const checkSalary = async (userId, powerLeg, singleLeg) => {
  try {
    const userDetail = await User.findById(userId);

    if (powerLeg >=  27750000 / 2 && singleLeg >=  27750000 / 2) {
      userDetail.weeklySalaryActivation[11] = true;
      userDetail.weeklySalaryStartDate[11] = Date.now();
    } 
    if (powerLeg >= 17750000 / 2 && singleLeg >= 17750000 / 2) {
      userDetail.weeklySalaryActivation[10] = true;
      userDetail.weeklySalaryStartDate[10] = Date.now();
    }

    if (powerLeg >= 10250000 / 2 && singleLeg >= 10250000 / 2) {
      userDetail.weeklySalaryActivation[9] = true;
      userDetail.weeklySalaryStartDate[9] = Date.now();
    }

    if (powerLeg >= 5250000 / 2 && singleLeg >= 5250000 / 2) {
      userDetail.weeklySalaryActivation[8] = true;
      userDetail.weeklySalaryStartDate[8] = Date.now();
    }

    if (powerLeg >= 2750000 / 2 && singleLeg >= 2750000 / 2) {
      userDetail.weeklySalaryActivation[7] = true;
      userDetail.weeklySalaryStartDate[7] = Date.now();
    }

    if (powerLeg >= 1750000 / 2 && singleLeg >= 1750000 / 2) {
      userDetail.weeklySalaryActivation[6] = true;
      userDetail.weeklySalaryStartDate[6] = Date.now();
    }

    if (powerLeg >= 1000000 / 2 && singleLeg >= 1000000 / 2) {
      userDetail.weeklySalaryActivation[5] = true;
      userDetail.weeklySalaryStartDate[5] = Date.now();
    }

    if (powerLeg >= 500000 / 2 && singleLeg >= 500000 / 2) {
      userDetail.weeklySalaryActivation[4] = true;
      userDetail.weeklySalaryStartDate[4] = Date.now();
    }

    if (powerLeg >= 250000 / 2 && singleLeg >= 250000 / 2) {
      userDetail.weeklySalaryActivation[3] = true;
      userDetail.weeklySalaryStartDate[3] = Date.now();
    }

    if (powerLeg >= 150000 / 2 && singleLeg >= 150000 / 2) {
      userDetail.weeklySalaryActivation[2] = true;
      userDetail.weeklySalaryStartDate[2] = Date.now();
    }

    if (powerLeg >= 75000 / 2 && singleLeg >= 75000 / 2) {
      userDetail.weeklySalaryActivation[1] = true;
      userDetail.weeklySalaryStartDate[1] = Date.now();
    }

    if (powerLeg >= 25000 / 2 && singleLeg >= 25000 / 2) {
      userDetail.weeklySalaryActivation[0] = true;
      userDetail.weeklySalaryStartDate[0] = Date.now();
    }


    await userDetail.save();
  } catch (error) {
    console.log(error);
  }
};

// Get User Activity
exports.getUserActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    const activeUsers = referredUsers.filter((user) => user.active);
    const unrechargedUsers = referredUsers.filter((user) => !user.active);

    res.status(200).json({ activeUsers, unrechargedUsers });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.claimDailyIncome = async (req, res) => {
  try {
    const { userId, amount, packageId } = req.body;
    const user = await User.findById(userId);
    const packageData = await Product.findById(packageId);
    // console.log('userClaim ==>',user);
    // console.log('packageClaim ==>',packageData);

    user.temporaryWallet -= packageData.income;
    // console.log('temp ==>',user.temporaryWallet);

    user.wallet += packageData.income;
    user.totalEarning += packageData.income;
    user.todayEarning += packageData.income;
    // console.log('wallet ==>',user.wallet);

    for (let i = 0; i < user.packages.length; i++) {
      const package = await Product.findById(user.packages[i]);
      if (user.packages[i]._id == packageId) {
        console.log("check status");

        user.claimBonus[i] = false;
        user.myRoi[i] += Number(package.income);
      }
    }
    await user.save();
    console.log("Updated user ==>", user);

    const dailyIncome = new DailyIncomeTransaction({
      user: user._id,
      amount: packageData.income,

      package: packageData.name,
    });
    await dailyIncome.save();

    res
      .status(200)
      .json({ user, message: "Income is successfully added to your wallet" });
  } catch (error) {
    console.log("error ==>", error);
  }
};

// Calculate Daily Profits
exports.calculateDailyProfits = async () => {
  try {
    const users = await User.find({ active: true });

    // Function to distribute profit to upline users
    const distributeProfitToUplines = async (
      originalUser,
      uplineUser,
      product,
      dailyProfit,
      level
    ) => {
      // Get current day of the week
      const currentDay = new Date().getDay();

      // Skip transaction creation on Saturday (6) and Sunday (0)
      if (currentDay === 0 || currentDay === 6) {
        console.log(`Skipping level income transaction for weekends.`);
        return;
      }

      if (!uplineUser.referredBy || level > 5) return; // Stop if no upline or beyond 5 levels

      const nextUplineUser = await User.findOne({
        referralCode: uplineUser.referredBy,
      });

      if (nextUplineUser) {
        // Define profit percentages for each level
        const profitPercentages = {
          1: 0.1, // 10% for direct referrals
          2: 0.05, // 5% for second-level referrals
          3: 0.03, // 3% for third-level referrals
        };

        const profitPercentage = profitPercentages[level] || 0;
        const uplineProfit = dailyProfit * profitPercentage;

        // Update upline user's wallet
        nextUplineUser.wallet += uplineProfit;
        nextUplineUser.teamIncome += uplineProfit;
        nextUplineUser.earningWallet += uplineProfit;
        nextUplineUser.totalEarning += uplineProfit;
        nextUplineUser.todayEarning += uplineProfit;
        await nextUplineUser.save();

        // Record the transaction only on weekdays
        const levelTransaction = new LevelIncomeTransaction({
          user: nextUplineUser._id,
          netIncome: uplineProfit,
          fromUser: originalUser.referralCode, // Use the original user for fromUser
          amount: dailyProfit,
          level,
          package: product.name,
        });
        await levelTransaction.save();

        // Recursively distribute profit to the next level
        await distributeProfitToUplines(
          originalUser,
          nextUplineUser,
          product,
          dailyProfit,
          level + 1
        );
      }
    };

    // Get current day of the week
    const currentDay = new Date().getDay();

    // Skip calculation on Saturday (6) and Sunday (0)
    // if (currentDay === 0 || currentDay === 6) {
    //   console.log("No profits calculated on weekends.");
    //   return;
    // }

    // Calculate daily profit for each user
    for (const user of users) {
      user.temporaryWallet = 0;
      user.todayEarning = 0;
      user.yesterdayWallet = user.wallet;
      user.withdrawlCount = 0;

      for (let i = 0; i < user.packages.length; i++) {
        let dailyProfit = 0;
        const packageId = user.packages[i];
        user.claimBonus[i] = true;
        const purchaseDate = user.purchaseDate[i]; // Get the corresponding purchase date

        const product = await Product.findById(packageId);
        if (product) {
          const daysSincePurchase = Math.floor(
            (Date.now() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24)
          );

          if (daysSincePurchase <= product.cycle) {
            dailyProfit += Number(product.income);
          }
        }

        user.temporaryWallet += dailyProfit;

        // Only set claimBonus if today is not Saturday or Sunday
        // if (currentDay !== 0 && currentDay !== 6) {
        //   user.claimBonus[i] = true;
        // }

        await user.save();

        if (dailyProfit > 0) {
          // Distribute profit to upline users
          await distributeProfitToUplines(user, user, product, dailyProfit, 1); // Pass the original user and the first upline user
        }
      }
    }

    console.log("Daily profits distributed");
  } catch (err) {
    console.error("Error calculating daily profits:", err);
  }
};



exports.updateDailySalaryForAllActiveUsers = async (req, res) => {
  try {
    // Fetch all active users
    const activeUsers = await User.find({ active: true });

    if (!activeUsers.length) {
      return res.status(404).json({ message: 'No active users found' });
    }

    let totalWalletUpdate = 0;
    let updatedUsersCount = 0;
    const currentDate = new Date();

    // Iterate over each active user
    for (let user of activeUsers) {
      let walletUpdate = 0;
      let shouldUpdate = false;

      // Iterate over weeklySalaryActivation array
      for (let i = 0; i < user.weeklySalaryActivation.length; i++) {
        if (user.weeklySalaryActivation[i]) {
          const startDate = new Date(user.weeklySalaryStartDate[i]);
          const salaryPrice = user.weeklySalaryPrice[i];

          // Calculate the number of days since the startDate
          let daysSinceStart = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));

          // Check if the user is within the 25-day window and not on a weekend (Saturday or Sunday)
          if (daysSinceStart < 25) {
            // Calculate the last salary claimed date
            let lastSalaryClaimedDate = new Date(startDate.getTime() + daysSinceStart * 24 * 60 * 60 * 1000);

            // Check if the salary is due (i.e., it's the right time for a new payment)
            if (currentDate >= lastSalaryClaimedDate && currentDate - lastSalaryClaimedDate >= 24 * 60 * 60 * 1000) {
              walletUpdate += salaryPrice;
              shouldUpdate = true;
            }
          } else {
            // If 25 days are completed, set weeklySalaryActivation[i] to false
            user.weeklySalaryActivation[i] = false;
          }
        }
      }

      // Update the user's wallet and save if required
      if (shouldUpdate || walletUpdate > 0) {
        user.wallet += walletUpdate;
        await user.save(); // Save the updated user details
        totalWalletUpdate += walletUpdate;
        updatedUsersCount++;
      }
    }

    // Send response indicating the number of users whose wallet was updated
    res.status(200).json({
      message: `${updatedUsersCount} users' wallets updated successfully`,
      totalWalletUpdate,
    });
  } catch (error) {
    console.error('Error updating daily salary for active users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
