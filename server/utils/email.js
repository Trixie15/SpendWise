const nodemailer = require('nodemailer');

const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // TLS-encrypted connection
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

const PURPOSE_TEXT = {
  login: 'to finish logging in',
  setup: 'to turn on email two-factor authentication',
  disable: 'to turn off two-factor authentication',
};

// Hides most of the address, e.g. "ke***@gmail.com"
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};

const sendOtpEmail = async (to, name, code, purpose) => {
  const action = PURPOSE_TEXT[purpose] || 'to continue';

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured');
    // Development only: lets you test without setting up email
    console.log(`\n📧 [DEV] Email not configured. Code for ${maskEmail(to)} (${purpose}): ${code}\n`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `${code} is your SpendWise verification code`,
    text: `Hi ${name},\n\nYour SpendWise code ${action} is: ${code}\n\nIt expires in 5 minutes and can only be used once. Never share this code with anyone. SpendWise will never ask for it.\n\nIf you didn't request this, someone may know your password. Please change it right away.`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;color:#17312b">
        <h2 style="margin:0 0 8px">SpendWise</h2>
        <p>Hi ${name.replace(/[<>&"']/g, '')},</p>
        <p>Your code ${action} is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f3f6f4;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</p>
        <p style="color:#52665f;font-size:14px">It expires in <b>5 minutes</b> and can only be used once. Never share this code with anyone. SpendWise will never ask for it.</p>
        <p style="color:#52665f;font-size:14px">If you didn't request this, someone may know your password. Please change it right away.</p>
      </div>`,
  });
};

module.exports = { isEmailConfigured, sendOtpEmail, maskEmail };
