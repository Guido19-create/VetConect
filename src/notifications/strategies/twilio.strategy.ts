import { Injectable } from "@nestjs/common";
import { NotificationStrategy } from "../interface/notification-strategy.interface";
import { TwilioService } from "../../common/integrations/twilio/twilio.service"; 

@Injectable()
export class TwilioStrategy implements NotificationStrategy { 
  constructor(private readonly twilioService: TwilioService) {}

  async send(options: { to: string; message: string }): Promise<any> {
    return await this.twilioService.sendSMS(options.to, options.message);
  }
}