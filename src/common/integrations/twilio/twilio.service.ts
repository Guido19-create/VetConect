import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;
  private readonly logger = new Logger(TwilioService.name);
  private readonly phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    
  }

  async sendSMS(to: string, body: string) {
    try {
      const message = await this.client.messages.create({
        body: body,
        from: this.phoneNumber,
        to: to,
      });
      this.logger.log(`SMS enviado: ${message.sid}`);
      return message;
    } catch (error: any) {
      this.logger.error(`Error SMS: ${error.message}`);
      throw new InternalServerErrorException('Error al enviar SMS');
    }
  }

  async sendWhatsApp(to: string, body: string) {
    try {
      const message = await this.client.messages.create({
        from: `whatsapp:${this.phoneNumber}`,
        to: `whatsapp:${to}`,
        body: body,
      });

      this.logger.log(`WhatsApp enviado: ${message.sid}`);
      return message;
    } catch (error: any) {
      this.logger.error(`Error WhatsApp: ${error.message}`);
      throw new InternalServerErrorException('Error al enviar WhatsApp');
    }
  }
}
