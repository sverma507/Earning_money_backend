const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const upiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});




module.exports = mongoose.model('UpiUpdate', upiSchema);