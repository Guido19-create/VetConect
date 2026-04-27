import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './processors/notification.processor';
import { TwilioModule } from '../common/integrations/twilio/twilio.module'; 
import { EmailStrategy } from './strategies/email.strategy';
import { TwilioStrategy } from './strategies/twilio.strategy';
import { TemplateService } from './template.service';
import { UsersModule } from '../users/users.module'; 
import { EmailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    TwilioModule,
    EmailModule,
    forwardRef(() => UsersModule),
  ],
  providers: [NotificationsService, NotificationProcessor,TwilioStrategy,EmailStrategy,TemplateService],
  exports: [NotificationsService,TemplateService],
})
export class NotificationsModule {}