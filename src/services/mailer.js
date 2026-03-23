const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Mailer service using Nodemailer.
 *
 * In development: uses Ethereal (fake SMTP inbox) — no real emails sent.
 *   Set USE_ETHEREAL=true in .env to auto-create a test account.
 *
 * In production: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.
 *
 * Ethereal preview URL is logged to console after each send.
 */

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.USE_ETHEREAL === 'true' || process.env.NODE_ENV !== 'production') {
    // Auto-create a disposable Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(
      `[mailer] Using Ethereal — inbox: https://ethereal.email/login (${testAccount.user})`
    );
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

/**
 * Send a price drop alert email.
 *
 * @param {object} opts
 * @param {string} opts.to          - recipient email
 * @param {string} opts.productName
 * @param {string} opts.productUrl
 * @param {number} opts.targetPrice
 * @param {number} opts.currentPrice
 */
async function sendAlertEmail({ to, productName, productUrl, targetPrice, currentPrice }) {
  const t = await getTransporter();

  const dropAmount = (targetPrice - currentPrice).toFixed(2);
  const dropPct = (((targetPrice - currentPrice) / targetPrice) * 100).toFixed(1);

  const info = await t.sendMail({
    from: process.env.MAIL_FROM || '"PriceTracker" <alerts@pricetracker.dev>',
    to,
    subject: `🔔 Price Drop: ${productName} is now ₹${currentPrice}`,
    html: `
      <h2>Price drop alert!</h2>
      <p><strong>${productName}</strong> has dropped below your target price.</p>
      <table>
        <tr><td>Your target</td><td><strong>₹${targetPrice}</strong></td></tr>
        <tr><td>Current price</td><td><strong>₹${currentPrice}</strong></td></tr>
        <tr><td>You save</td><td><strong>₹${dropAmount} (${dropPct}%)</strong></td></tr>
      </table>
      <br>
      <a href="${productUrl}" style="background:#ff9900;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
        Buy Now
      </a>
      <p style="color:#888;font-size:12px;margin-top:20px;">
        You received this because you set a price alert. 
        To stop alerts, delete your alert via the API.
      </p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`[mailer] Email sent — preview: ${previewUrl}`);
  } else {
    logger.info(`[mailer] Email sent to ${to} (messageId: ${info.messageId})`);
  }

  return info;
}

module.exports = { sendAlertEmail };
