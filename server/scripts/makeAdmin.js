// Promote an existing user to admin. Usage:  npm run make-admin -- someone@email.com
// Roles can't be set through the API sign-up, so the first admin is created here.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: npm run make-admin -- someone@email.com');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { role: 'admin', $inc: { tokenVersion: 1 } },
    { new: true }
  );
  console.log(user ? `✅ ${user.email} is now an admin. Log in again to see the Admin page.` : `❌ No user found with email ${email}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
