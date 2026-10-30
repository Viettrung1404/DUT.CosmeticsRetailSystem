import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IStaffMailer } from '../../application/ports/staff-mailer.port';

// Dùng cùng biến SMTP với module auth; không dùng lại NodemailerEmailService vì nội dung thư đặt lại mật khẩu ghi hạn 30 phút
@Injectable()
export class StaffMailerService implements IStaffMailer {
  private readonly logger = new Logger(StaffMailerService.name);
  private readonly transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const port = config.get<number>('SMTP_PORT', 587);
    this.from = config.get<string>('SMTP_FROM', 'GlowUp <noreply@glowup.vn>');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendActivationEmail(to: string, fullName: string, rawToken: string): Promise<boolean> {
    const url = `${this.frontendUrl}/auth/reset-password?token=${rawToken}`;
    const subject = 'Kích hoạt tài khoản nhân viên GlowUp';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff69b4;">Xin chào ${escapeHtml(fullName)},</h2>
        <p>Tài khoản nhân viên GlowUp của bạn đã được tạo. Bấm nút bên dưới để đặt mật khẩu và bắt đầu đăng nhập:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background-color: #ff69b4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Đặt mật khẩu</a>
        </div>
        <p>Hoặc truy cập: <a href="${url}">${url}</a></p>
        <p>Liên kết có hiệu lực trong 72 giờ.</p>
      </div>
    `;

    if (!this.transporter) {
      // Không có SMTP ở môi trường dev: in link để vẫn kích hoạt được tài khoản
      const detail = this.isProduction ? '' : ` | Link: ${url}`;
      this.logger.warn(`[EMAIL LOG] Chưa cấu hình SMTP, không gửi thư. To: ${to}${detail}`);
      return false;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
    return true;
  }
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
