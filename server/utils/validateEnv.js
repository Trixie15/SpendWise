// Stops the server early with a clear message if secrets are missing or weak
module.exports = () => {
  const errors = [];
  if (!process.env.MONGO_URI) errors.push('MONGO_URI is missing');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY || '')) {
    errors.push('ENCRYPTION_KEY must be exactly 64 hex characters');
  }
  if (errors.length) {
    console.error('\n❌ Invalid .env configuration:');
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error('\nSee .env.example for how to generate these values.\n');
    process.exit(1);
  }
};
