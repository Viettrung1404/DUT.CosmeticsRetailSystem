import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { OutboxMailer } from '../../application/ports/outbox-mailer.port';

@Injectable()
export class SmtpOutboxMailer implements OutboxMailer {
  async send(
    recipient: string,
    subject: string,
    text: string,
    messageId: string,
  ) {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    )
      throw new Error('SMTP not configured');
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 10000,
    });
    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race([
        transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: recipient,
          subject,
          text,
          messageId,
        }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('SMTP delivery deadline exceeded')),
            10000,
          );
        }),
      ]);
      if (!result.accepted?.length || result.rejected?.length)
        throw new Error('SMTP did not accept recipient');
    } finally {
      if (timer) clearTimeout(timer);
      transporter.close();
    }
  }
}
