import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { RecoveryToken } from './entities/recovery-token.entity';
import { ConfigModule } from '@nestjs/config';
import { TwilioModule } from '../common/integrations/twilio/twilio.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OtpModule } from '../otp/otp.module';
import { JwtModule } from '@nestjs/jwt';
import { MfaModule } from '../mfa/mfa.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthRepository } from './repository/auth.repository';
import { SocialAuthService } from './social-auth.service';
import { OtpService } from '../otp/otp.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, RecoveryToken]),
    UsersModule,
    ConfigModule,
    TwilioModule,
    NotificationsModule,
    OtpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || '4fG7!mQ9zR2xWv8L',
      signOptions: { expiresIn: '1h' },
    }),
    MfaModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    AuthRepository,
    SocialAuthService,
    OtpService,
  ],

  controllers: [AuthController],
  exports: [AuthService, JwtModule, OtpService, TypeOrmModule],
})
export class AuthModule {}
