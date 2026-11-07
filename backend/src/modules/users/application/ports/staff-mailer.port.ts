export const STAFF_MAILER = Symbol('IStaffMailer');

export interface IStaffMailer {
  // false khi chưa cấu hình SMTP (thư không được gửi)
  sendActivationEmail(to: string, fullName: string, rawToken: string): Promise<boolean>;
}
