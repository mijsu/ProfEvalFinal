import { NextResponse } from 'next/server';
import { sendEmailWithNodemailer } from '@/lib/nodemailer';

export async function POST(request: Request) {
  try {
    const { to, subject, html, text } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
    }

    const result = await sendEmailWithNodemailer({ to, subject, html, text });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      messageId: result.messageId,
      simulated: result.simulated || false,
    });
  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
