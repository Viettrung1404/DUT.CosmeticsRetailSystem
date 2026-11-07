export const OUTBOX_MAILER = Symbol('OUTBOX_MAILER');

export interface OutboxMailer {
  send(
    recipient: string,
    subject: string,
    text: string,
    messageId: string,
  ): Promise<void>;
}
