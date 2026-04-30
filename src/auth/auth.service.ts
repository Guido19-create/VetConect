import { OtpService } from '../otp/otp.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthRepository } from './repository/auth.repository';
import { v4 as uuid } from 'uuid';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { RecoveryToken } from './entities/recovery-token.entity';
import * as bcrypt from 'bcryptjs';
import { SocialAuthService, VerifiedSocialUser } from './social-auth.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { LinkAccountDto } from './dto/link-account.dto';
import { GenerateOtpDto } from '../otp/dto/generate-otp.dto';
import { LoginDto, LoginInitDto } from './dto/login.dto';
import { MfaService } from '../mfa/mfa.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RecoveryToken)
    private readonly recoveryTokenRepository: Repository<RecoveryToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    private readonly notificationsService: NotificationsService,
    private readonly socialAuthService: SocialAuthService,
    private readonly otpService: OtpService,
    private readonly mfaService: MfaService,
  ) {}

  async registerInit(dto: CreateUserDto, ip: string) {
    const email = dto.email;
    const existing = await this.usersService.findByEmail(email);

    if (existing) throw new ConflictException('El usuario ya está registrado');

    await this.usersService.register(dto);

    const otpDto: GenerateOtpDto = { email: dto.email, method: 'email' };

    await this.otpService.generateOtp(otpDto, ip);

    return { message: `Código enviado por email` };
  }

  async registerVerify(email: string, otp: string, ip: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.otpService.verifyOtp({ email, code: otp, method: 'email' }, ip);

    await this.usersService.update(user.id, { isActive: true });

    try {
      await this.notificationsService.sendEmail(
        user.email,
        '¡Bienvenido a VetConnect! - Cuenta Activada',
        `Hola ${user.name}, tu registro en la plataforma veterinaria se ha completado.`,
        `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50;">¡Bienvenido a VetConnect, ${user.name}!</h1>
        <p>Tu cuenta ha sido verificada con éxito.</p>
        <p>Ya puedes comenzar a gestionar tus clínicas, profesionales y pacientes desde nuestra plataforma.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 0.9em; color: #7f8c8d;">Saludos,<br>El equipo de soporte de VetConnect</p>
      </div>
      `,
        [],
        ip,
      );
    } catch (error) {
      console.error('Error enviando email de bienvenida:', error);
    }

    return { message: 'Usuario verificado correctamente' };
  }

  async login(loginDto: LoginDto, ip: string) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new BadRequestException('Usuario no encontrado');

    if (user.isMfaEnabled) {
      return {
        type: 'TOTP',
        userId: user.id,
        message: 'Introduzca el código de su aplicación Authenticator',
      };
    }
    return {
      type: 'EMAIL',
      userId: user.id,
      message: 'Se ha enviado un código a su correo',
    };
  }

  async verifyCredentialsLogin(loginDto: LoginInitDto, ip: string) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) throw new UnauthorizedException('Creedenciales invalidas');

    if (!user.password)
      throw new UnauthorizedException(
        'Este usuario no tiene una contraseña configurada',
      );
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Creedenciales invalidas');

    await this.otpService.generateOtp(
      { email: user.email, method: 'email' },
      ip,
    );

    return { message: 'Se ha enviado un código al correo. Por favor revise.' };
  }

  async verifySecondFactor(
    userId: string,
    code: string,
    type: 'TOTP' | 'EMAIL',
    ip: string,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (type === 'TOTP') {
      const isValid = await this.mfaService.verifyMfaCode(user.id, code);

      if (!isValid)
        throw new UnauthorizedException('Código incorrecto o expirado');
    } else {
      const isOtpValid = await this.otpService.verifyOtp(
        { email: user.email, code: code, method: 'email' },
        ip,
      );
      if (!isOtpValid)
        throw new UnauthorizedException(
          'Código de email incorrecto o expirado',
        );
    }
    const tokensInfo = await this.generateTokens({ user });

    await this.authRepository.createRefreshToken({
      refreshToken: tokensInfo.refresh_token,
      userId: user.id,
      divice_id: tokensInfo.divice_id,
      expiresAt: tokensInfo.refreshTokenExpiresAt,
    });

    const { password, ...safeUser } = user;

    return {
      access_token: tokensInfo.access_token,
      refresh_token: tokensInfo.refresh_token,
      expires_in: tokensInfo.accessTokenExpiresIn,
      expires_at: new Date(
        Date.now() + tokensInfo.accessTokenExpiresIn * 1000,
      ).toISOString(),
      user: safeUser,
    };
  }

  async validateUser(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('Token inválido');
    return user;
  }

  async logout(token: string, ip) {
    try {
      const access_token = token.substring(7);

      const payload = await this.jwtService.verifyAsync(access_token, {
        secret: process.env.JWT_SECRET || '4fG7!mQ9zR2xWv8L',
      });

      await this.authRepository.deleteRefreshToken(payload.divice_id);

      return {
        message: 'Logout exitoso. Sesión cerrada correctamente.',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido o sesión ya cerrada');
    }
  }

  async refreshToken(token: string, ip: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'myRefreshSecretKey123!',
      });

      const user = await this.usersService.findOne(payload.sub);

      if (!user) throw new UnauthorizedException('Usuario no encontrado');

      const storedToken = await this.authRepository.findRefreshToken(
        token,
        payload.divice_id,
      );

      if (!storedToken || !storedToken.isValid()) {
        throw new UnauthorizedException('Refresh token inválido o expirado');
      }
      const {
        access_token,
        accessTokenExpiresIn,
        refresh_token,
        refreshTokenExpiresAt,
        divice_id,
      } = await this.generateTokens({ user });

      await this.authRepository.updateRefreshToken({
        newRefreshToken: refresh_token,
        oldRefreshToken: token,
        newDiviceId: divice_id,
        oldDeviceId: payload.divice_id,
        expiresAt: refreshTokenExpiresAt,
      });

      return {
        access_token,
        refresh_token,
        expires_in: accessTokenExpiresIn,
        expires_at: refreshTokenExpiresAt.toISOString(),
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  private async generateTokens(dataToken: { user: User }) {
    const accessTokenExpiresIn = 3600;
    const refreshTokenExpiresIn = 60 * 60 * 24 * 7;
    const divice_id = uuid();
    const payload = {
      sub: dataToken.user.id,
      email: dataToken.user.email,
      divice_id,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: accessTokenExpiresIn,
      secret: process.env.JWT_SECRET || '4fG7!mQ9zR2xWv8L',
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: refreshTokenExpiresIn,
      secret: process.env.JWT_REFRESH_SECRET || 'myRefreshSecretKey123!',
    });

    return {
      access_token,
      accessTokenExpiresIn,
      refresh_token,
      refreshTokenExpiresAt: new Date(
        Date.now() + refreshTokenExpiresIn * 1000,
      ),
      userId: dataToken.user.id,
      divice_id,
    };
  }

  async requestPasswordRecovery(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) return 'Recuperación procesada.';

    await this.recoveryTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    const expires = 30 * 60;
    const token = this.jwtService.sign(
      { sub: user.id, purpose: 'password-reset' },
      { expiresIn: expires },
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires);

    await this.recoveryTokenRepository.save({
      token,
      userId: user.id,
      expiresAt,
      isUsed: false,
    });

    const resetUrl = `${process.env.URL_FORGOT_PASSWORD}?token=${token}`;

    try {
      const subject = 'Restablecer contraseña - VetConnect'; // Asunto corregido
      const text = `Hola, has solicitado restablecer tu contraseña en VetConnect. Haz clic en el siguiente enlace: ${resetUrl}`;
      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <h2 style="color: #2c3e50;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>VetConnect</strong>.</p>
        <p>Haz clic en el botón de abajo para elegir una nueva contraseña. Este enlace expira en 30 minutos:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer mi contraseña</a>
        </div>
        <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <p>Saludos,<br>Soporte Técnico de VetConnect</p>
      </div>
    `;

      await this.notificationsService.sendEmail(email, subject, text, html);
    } catch (error) {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación.',
      );
    }
    return 'Recuperación procesada.';
  }

  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (e) {
      throw new UnauthorizedException('Token inválido.');
    }
    const userId = payload.sub;

    const tokenRecord = await this.recoveryTokenRepository.findOne({
      where: { token, userId, isUsed: false },
    });

    if (!tokenRecord)
      throw new UnauthorizedException('Token inválido o ya utilizado.');

    if (new Date() > tokenRecord.expiresAt)
      throw new UnauthorizedException('El token ha expirado.');

    const user = await this.usersService.findById(userId);

    if (!user) throw new NotFoundException('Usuario no encontrado.');

    user.password = await bcrypt.hash(newPassword, 10);

    await this.usersService.save(user);

    tokenRecord.isUsed = true;
    tokenRecord.usedAt = new Date();

    await this.recoveryTokenRepository.save(tokenRecord);
  }

  async socialLogin(dto: SocialLoginDto, ip: string) {
    let socialData: VerifiedSocialUser;

    if (dto.provider === 'google')
      socialData = await this.socialAuthService.validateGoogleIdToken(
        dto.idToken,
      );
    else if (dto.provider === 'apple')
      socialData = await this.socialAuthService.validateAppleIdToken(
        dto.idToken,
      );
    else throw new UnauthorizedException('Proveedor no válido.');

    const user = await this.usersService.findOrCreateSocialUser(socialData);

    const tokens = await this.generateTokens({ user });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.name,
        avatarUrl: user.avatarURl,
      },
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  async linkSocialAccount(
    userId: string,
    email: string,
    dto: LinkAccountDto,
    ip: string,
  ): Promise<void> {
    let socialData: VerifiedSocialUser;

    if (dto.provider === 'google')
      socialData = await this.socialAuthService.validateGoogleIdToken(
        dto.idToken,
      );
    else if (dto.provider === 'apple')
      socialData = await this.socialAuthService.validateAppleIdToken(
        dto.idToken,
      );
    else throw new BadRequestException('Proveedor no soportado.');

    await this.usersService.linkSocialAccount(userId, email, socialData);
  }

  async unlinkSocialAccount(
    userId: string,
    provider: 'google' | 'apple',
    ip: string,
  ): Promise<void> {
    await this.usersService.unlinkSocialAccount(userId, provider);
  }

  async deleteAccount(
    userId: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.password) {
      throw new BadRequestException(
        'Para eliminar una cuenta social, primero debe configurar una contraseña de seguridad.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'La contraseña proporcionada es incorrecta. No se puede eliminar la cuenta.',
      );
    }

    await this.usersService.remove(userId);

    return {
      message:
        'Cuenta eliminada permanentemente. Todos los datos asociados han sido borrados de forma irreversible.',
    };
  }
}
