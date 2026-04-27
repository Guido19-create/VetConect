import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OTPVerification } from './entities/otp.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioModule } from '../common/integrations/twilio/twilio.module'; 
import { NotificationsModule } from '../notifications/notifications.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([OTPVerification]),
    TwilioModule,
    NotificationsModule,
  ],
  providers: [OtpService],
  exports: [OtpService,TypeOrmModule],
})
export class OtpModule {}
