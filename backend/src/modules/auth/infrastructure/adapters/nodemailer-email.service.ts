import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailService } from '../../application/ports/email.port';

@Injectable()
export class NodemailerEmailService implements IEmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from = this.configService.get<string>('SMTP_FROM', 'GlowUp <noreply@glowup.vn>');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP credentials not configured. Emails will be logged to console.');
    }
  }

  async sendVerificationEmail(to: string, fullName: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    const subject = 'Xác thực tài khoản GlowUp của bạn';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff69b4;">Chào mừng ${fullName} đến với GlowUp!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng bấm vào nút bên dưới để xác thực email của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #ff69b4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Xác thực tài khoản</a>
        </div>
        <p>Hoặc truy cập liên kết: <a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Liên kết này có hiệu lực trong 24 giờ.</p>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendWelcomeEmail(to: string, fullName: string): Promise<void> {
    const subject = 'Chào mừng bạn đã trở thành thành viên GlowUp!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff69b4;">Xin chào ${fullName},</h2>
        <p>Tài khoản của bạn đã được xác thực thành công. Hãy bắt đầu khám phá hàng ngàn sản phẩm mỹ phẩm chính hãng tại GlowUp ngay hôm nay!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.frontendUrl}" style="background-color: #ff69b4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Mua sắm ngay</a>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, fullName: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    const subject = 'Yêu cầu đặt lại mật khẩu - GlowUp';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff69b4;">Xin chào ${fullName},</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại GlowUp.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #ff69b4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Đặt lại mật khẩu</a>
        </div>
        <p>Hoặc truy cập: <a href="${resetUrl}">${resetUrl}</a></p>
        <p>Liên kết này có hiệu lực trong 30 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendPasswordChangedEmail(to: string, fullName: string): Promise<void> {
    const subject = 'Mật khẩu của bạn đã được thay đổi - GlowUp';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff69b4;">Xin chào ${fullName},</h2>
        <p>Mật khẩu cho tài khoản GlowUp của bạn vừa được thay đổi thành công.</p>
        <p>Nếu bạn không thực hiện thay đổi này, hãy liên hệ ngay với bộ phận hỗ trợ của chúng tôi để bảo vệ tài khoản.</p>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL LOG] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      // Suppress error to avoid crashing the business flow
    }
  }
}
