const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Doctor', 'Staff', 'Customer'], 
    default: 'Customer' 
  },
  phoneNumber: String,
  createdAt: { type: Date, default: Date.now }
});


const User = mongoose.model("users", userSchema);
module.exports = User;