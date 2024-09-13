const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/admin.js');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const generateReferralCode = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
  return `EM${randomNumber}`;
};



exports.signup = async (req, res) => {
  try {
    const { mobileNumber,email, password, referredBy, answer } = req.body;

    // Generate a referral code
    const referralCode = generateReferralCode();

    // Create a new user with original password
    const newUser = new User({
      mobileNumber,
      email,
      password: password.trim(),  // Store the original password
      referralCode,
      referredBy,
      answer
    });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
    res.status(201).json({newUser, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { mobileNumber, email, password } = req.body;
    const user = await User.findOne(mobileNumber ? { mobileNumber } : { email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    // Validate password
    if (password.trim() !== user.password) {  // Compare original password
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    if (user.blocked) {
      return res.status(400).json({
        success: false,
        message: 'You Are Blocked By Admin. Contact Admin.',
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again later.',
    });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
   
    
    const admin = await Admin.findOne({ email });
    if (!admin || password !== admin.password) {  // Compare original password
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.forgotPasswordController = async (req, res) => {
  try {
    const { mobileNumber, answer, newPassword } = req.body;
    if (!mobileNumber) {
      return res.status(400).send({ message: "Phone is required" });
    }
    if (!answer) {
      return res.status(400).send({ message: "Answer is required" });
    }
    if (!newPassword) {
      return res.status(400).send({ message: "New password is required" });
    }

    const user = await User.findOne({ mobileNumber, answer });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong phone number or answer"
      });
    }

    // Update the password without hashing
    await User.findByIdAndUpdate(user._id, { password: newPassword.trim() });

    res.status(200).send({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error
    });
  }
};
