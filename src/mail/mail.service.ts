import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.ionos.com';
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const isSecure = this.configService.get<string>('SMTP_SECURE') === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {  
        rejectUnauthorized: false,
        ciphers: 'TLSv1.2',
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('❌ Fallo de conexión a SMTP. Revisa tus credenciales en el .env');
        this.logger.error(error.message);
      } else {
        this.logger.log('✅ Servidor SMTP listo en ' + host);
      }
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string, attachments?: any[]) {
    console.log('cb9uewv8ycwev8wugefu2gefp82ueb')
    try {
      const from = this.configService.get<string>('SMTP_FROM') || '"VetConnect" <support@tu-dominio.com>';
      

      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
        attachments,
      });

      

      this.logger.log(`📧 Correo enviado a ${to} - ID: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}:`, error);
      throw error;
    }
  }
}