import { Injectable } from '@nestjs/common';
import { NotificationStrategy } from '../interface/notification-strategy.interface'; 
import { EmailService } from '../../mail/mail.service';

@Injectable()
export class EmailStrategy implements NotificationStrategy {
  constructor(private readonly emailService: EmailService) {}

  async send(options: { to: string; subject: string; text: string; html?: string,attachments?: any[]}) {
    return await this.emailService.sendMail(
      options.to,
      options.subject,
      options.text,
      options.html,
      options.attachments
    );
  }
}