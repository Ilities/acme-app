import { config } from '../config.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Writes outgoing mail to the console instead of delivering it.
 * Messages are also kept in memory so tests can inspect them.
 */
export class DevMailer implements Mailer {
  readonly outbox: MailMessage[] = [];

  constructor(private readonly logToConsole = !config.isTest) {}

  async send(message: MailMessage): Promise<void> {
    this.outbox.push(message);
    if (this.logToConsole) {
      console.info(
        [`[mail] To: ${message.to}`, `[mail] Subject: ${message.subject}`, '', message.text, ''].join(
          '\n',
        ),
      );
    }
  }

  clear(): void {
    this.outbox.length = 0;
  }
}

export const mailer = new DevMailer();
