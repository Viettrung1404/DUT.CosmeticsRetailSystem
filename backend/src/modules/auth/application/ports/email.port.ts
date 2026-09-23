export const EMAIL_SERVICE = Symbol('IEmailService');

export interface IEmailService {
  /** Send account email verification */
  sendVerificationEmail(to: string, fullName: string, token: string): Promise<void>;

  /** Send welcome email after successful verification */
  sendWelcomeEmail(to: string, fullName: string): Promise<void>;

  /** Send password reset link email */
  sendPasswordResetEmail(to: string, fullName: string, token: string): Promise<void>;

  /** Send security notification that password has been changed */
  sendPasswordChangedEmail(to: string, fullName: string): Promise<void>;
}
