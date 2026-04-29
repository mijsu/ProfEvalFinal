import nodemailer from 'nodemailer';

// SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true for port 465, false for others
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'CNSC Evaluation System';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'noreply@cnsc.edu.ph';

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify transporter connection on startup (only in non-development or when credentials exist)
if (SMTP_USER && SMTP_PASS) {
  transporter.verify().then(() => {
    console.log('[Nodemailer] SMTP server is ready to send emails');
  }).catch((error) => {
    console.error('[Nodemailer] SMTP connection error:', error.message);
  });
} else {
  console.log('[Nodemailer] SMTP credentials not configured. Email sending will be simulated.');
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
  simulated?: boolean;
}

/**
 * Send an email using Nodemailer.
 * If SMTP credentials are not configured, the email is simulated (logged to console).
 */
export async function sendEmailWithNodemailer(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, from } = options;

  if (!to || !subject || !html) {
    return {
      success: false,
      error: 'Missing required fields: to, subject, html',
    };
  }

  // If SMTP credentials are not configured, simulate email sending
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('=== EMAIL SIMULATED (No SMTP credentials) ===');
    console.log('From:', from || `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text || '(no plain text version)');
    console.log('==============================================');
    return {
      success: true,
      message: 'Email simulated (SMTP not configured). Check server logs.',
      simulated: true,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: from || `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || undefined,
    });

    console.log('[Nodemailer] Email sent:', info.messageId);

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Nodemailer] Failed to send email:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send email via SMTP',
    };
  }
}

export default transporter;
