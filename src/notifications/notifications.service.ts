import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(@InjectQueue('notifications') private readonly queue: Queue) {}

  async sendSMS(
    to: string,
    message: string,
    email?: string,
    ip?: string,
    userId?: string,
  ) {
    const jobId = `sms-${to}-${message.replace(/\s/g, '').substring(0, 10)}`;

    await this.queue.add(
      'sms',
      {
        to,
        message,
        email,
        ip,
        userId,
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        timeout: 15000,
        removeOnComplete: true,
      },
    );
  }

  async sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: any[],
  ip?: string,
  metadata?: any,
  userId?: string,
) {
  try {
    const uniqueId = Date.now();

    const jobId = `mail:${to}:${uniqueId}`;

    return await this.queue.add(
      'email',
      { to, subject, text, html, attachments, ip, metadata, userId },
      {
        jobId, 
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        timeout: 15000,
        removeOnComplete: true, 
        removeOnFail: false,   
      },
    );
  } catch (error) {
    this.logger.error('Error agregando correo a la cola Bull:', error);
  }
}
}
