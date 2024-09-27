// models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filePath: { type: String, required: true },
  fileType: { type: String, required: true }, // e.g., image/jpeg, application/pdf
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QrUpdate', fileSchema);
