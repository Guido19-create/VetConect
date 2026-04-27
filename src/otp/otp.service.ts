import { OTPVerification } from './entities/otp.entity'; 
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OTPVerification)
    private readonly otpRepository: Repository<OTPVerification>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async generateOtp(dto: GenerateOtpDto, ip: string): Promise<string> {
    const { email, phone, method } = dto;
    const identifier = method === 'email' ? email : phone;

    if (!identifier) {
      throw new BadRequestException(
        `El ${method === 'email' ? 'email' : 'teléfono'} es obligatorio para este método.`,
      );
    }

    await this.expireExistingOtps(identifier, method);

    const EXPIRATION_TIME_SECONDS = 300;
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + EXPIRATION_TIME_SECONDS);

    const otpData: Partial<OTPVerification> = {
      email: method === 'email' ? identifier : undefined,
      phone: method === 'phone' ? identifier : undefined,
      code,
      expiresAt,
      method,
      isUsed: false,
    };

    const newOtp = this.otpRepository.create(otpData);

    await this.otpRepository.save(newOtp);

    if (method === 'email') {
      await this.notificationsService.sendEmail(
        identifier,
        'Tu código de verificación',
        code,
        '',
        [],
        ip,
      );
    } else {
      if (!phone)
        throw new BadRequestException('El número de teléfono es requerido');
      await this.notificationsService.sendSMS(
        identifier,
        `Tu código de verificación es: ${code}`,
        email,
        ip,
      );
    }

    return code;
  }

  private async expireExistingOtps(
    identifier: string,
    method: 'email' | 'phone',
  ): Promise<void> {
    const whereClause =
      method === 'email' ? { email: identifier } : { phone: identifier };
    await this.otpRepository.update(
      { ...whereClause, isUsed: false },
      { isUsed: true, usedAt: new Date() },
    );
  }

  async verifyOtp(dto: VerifyOtpDto, ip: string): Promise<boolean> {
    const { code, method } = dto;
    const identifier = method === 'email' ? dto.email : dto.phone;

    if (!identifier) throw new BadRequestException('Identificador faltante.');

    const whereClause =
      method === 'email' ? { email: identifier } : { phone: identifier };

    const verification = await this.otpRepository.findOne({
      where: { ...whereClause, code: code, isUsed: false, method },
      order: { createdAt: 'DESC' },
    });

    if (!verification) throw new BadRequestException('Código OTP inválido.');

    await this.otpRepository.update(verification.id, {
      isUsed: true,
      usedAt: new Date(),
    });

    return true;
  }
}
