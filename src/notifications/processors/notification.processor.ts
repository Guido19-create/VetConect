import {
  Process,
  Processor,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EmailStrategy } from '../strategies/email.strategy';
import { TwilioStrategy } from '../strategies/twilio.strategy';
import { TemplateService } from '../template.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly emailStrategy: EmailStrategy,
    private readonly twilioStrategy: TwilioStrategy,
    private readonly templateService: TemplateService,
  ) {}

  @Process('email')
  async handleEmail(job: Job) {
    const { to, subject, text, metadata, ip, attachments, userId } = job.data;

    const fecha = new Date().toLocaleString('es-ES', {
      timeZone: 'America/Havana',
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const codeMatch = text ? String(text).match(/\d{6}/) : null;
    const code = codeMatch ? codeMatch[0] : null;

    let finalHtml = job.data.html;

    if (!finalHtml) {
      if (metadata?.type) {
        const templateData = {
          ...metadata,
          ip,
          fecha,
        };
        finalHtml = this.templateService.compile(metadata.type, templateData);
      } else if (code) {
        finalHtml = this.templateService.compile('mfa-code', {
          code,
          ip,
          fecha,
        });
      }
    }

    const processedAttachments = (attachments || []).map((att) => {
      if (
        att.content &&
        typeof att.content === 'object' &&
        att.content.type === 'Buffer'
      ) {
        return {
          ...att,
          content: Buffer.from(att.content.data),
        };
      }
      return att;
    });

    try {
      return await this.emailStrategy.send({
        to,
        subject: subject || 'Notificación de VetConnect',
        text,
        html: finalHtml || text,
        attachments: processedAttachments,
      });
    } catch (error) {
      this.logger.error(
        `Error procesando envío de correo para ${to}: ${error}`,
      );
      throw error;
    }
  }

  @Process('sms')
  async handleSMS(job: Job) {
    const { to, message } = job.data;
    return await this.twilioStrategy.send({ to, message });
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} de tipo ${job.name} completado con éxito.`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} falló: ${err.message}`);
  }
}
