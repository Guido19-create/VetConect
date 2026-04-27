import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from '@otplib/preset-default';
import * as QRCode from 'qrcode';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { encrypt, decrypt } from '../common/utils/encryption.util';

@Injectable()
export class MfaService {
  private readonly encryptionKey: string;

  constructor(
    private readonly usersService: UsersService,
  ) {
    const key = process.env.MFA_ENCRYPTION_KEY;

    if (!key || key.length !== 32) {
      throw new Error(
        'MFA_ENCRYPTION_KEY debe tener exactamente 32 caracteres en el .env',
      );
    }

    this.encryptionKey = key;

    authenticator.options = {
      window: 0,
    };
  }
  async generateMfaSecret(user: User, ip: string) {
    const rawSecret = authenticator.generateSecret();

    const { iv, encryptedData } = encrypt(rawSecret, this.encryptionKey);

    await this.usersService.update(user.id, {
      twoFactorSecret: encryptedData,
      twoFactorIv: iv,
    });

    const otpauthUrl = authenticator.keyuri(
      user.email,
      'VetConect',
      rawSecret,
    );
    return QRCode.toDataURL(otpauthUrl);
  }

  async verifyMfaCode(userId: string, code: string) {
    const user = await this.usersService.findOne(userId);

    if (!user.twoFactorSecret || !user.twoFactorIv) {
      throw new BadRequestException('MFA no configurado');
    }

    const secret = decrypt(
      user.twoFactorSecret,
      user.twoFactorIv,
      this.encryptionKey,
    );

    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) throw new UnauthorizedException('Código inválido');
    return true;
  }

  async activateMfa(userId: string, code: string, ip: string) {
    await this.verifyMfaCode(userId, code);

    await this.usersService.update(userId, {
      isMfaEnabled: true,
    });
    return { message: 'MFA activado exitosamente' };
  }

  async deactivateMfa(userId: string, ip: string) {
    await this.usersService.update(userId, {
      isMfaEnabled: false,
      twoFactorSecret: undefined,
      twoFactorIv: undefined,
    });
    
    return { message: 'MFA desactivado exitosamente' };
  }
}
