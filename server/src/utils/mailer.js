const nodemailer = require('nodemailer');

// Sends email through SMTP (SMTP_HOST/PORT/USER/PASS, MAIL_FROM in .env).
// Without SMTP_HOST (local dev) the message is printed to the console instead.
// Never throws: callers (e.g. forgot-password) must respond the same way whether or not delivery works.
let transport;

async function sendMail({ to, subject, text }) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return false;
  }
  try {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport ||= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
  } catch (e) {
    console.error('Email send failed:', e.message);
    return false;
  }
}

module.exports = { sendMail };
