export const STAFF_MAILER = Symbol('IStaffMailer');

export interface IStaffMailer {
  sendActivationEmail(to: string, fullName: string, rawToken: string): Promise<void>;
}
