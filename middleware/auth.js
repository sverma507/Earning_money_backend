const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/admin');

exports.protect = async (req, res, next) => {
  // console.log("user token =>",req.headers);
  
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized' });
  }
};

exports.adminProtect = async (req, res, next) => {
  // console.log("header token =>",req.headers);
  
  let token;
  if (req.headers.authorization) {
    token = req.headers.authorization;
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized' });
  }
};


exports.loginMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from the Bearer scheme
    if (!token) return res.status(401).send({ ok: false, message: "No token provided" });

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).send({ ok: false, message: "Invalid or expired token" });
  }
};
