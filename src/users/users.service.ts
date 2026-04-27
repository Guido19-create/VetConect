import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto'; 
import { LoginUserDto } from './dto/login-user.dto'; 
import { VerifiedSocialUser } from '../auth/social-auth.service';
import { UpdateProfileDto } from './dto/updatePrfile.dto'; 
import { OtpService } from '../otp/otp.service'; 
import { MinioService } from '../common/integrations/minio/minio.service'; 

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly otpService: OtpService,
    private readonly minioService: MinioService,
  ) {}

  async findOrCreateSocialUser(socialData: VerifiedSocialUser): Promise<User> {
    const user = await this.userRepository.findOneBy({
      email: socialData.email,
    });

    if (user) {
      if (
        user.socialProvider !== socialData.provider ||
        !user.socialProviderId
      ) {
        user.socialProvider = socialData.provider;
        user.socialProviderId = socialData.socialProviderId;
        user.avatarURl = socialData.avatarUrl ?? user.avatarURl;

        await this.userRepository.save(user);
      }

      return user;
    } else {
      const newUser = this.userRepository.create({
        email: socialData.email,
        name: socialData.firstName || 'Usuario',
        avatarURl: socialData.avatarUrl,
        socialProvider: socialData.provider,
        socialProviderId: socialData.socialProviderId,
      });

      return this.userRepository.save(newUser);
    }
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    const { email, name, password, location, phone } = createUserDto;
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      email,
      name,
      location,
      phone,
      password: hashedPassword
    });

    return this.userRepository.save(newUser);
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, name, password, location, phone } = createUserDto;
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      email,
      name,
      location,
      phone,
      password: hashedPassword,
    });

    return this.userRepository.save(newUser);
  }

  async validateUser(loginDto: LoginUserDto): Promise<User> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  async findOneByEmailOrPhone(identifier: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: [{ email: identifier }, { phone: identifier }],
    });
  }


  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    const updatedUser = await this.userRepository.save(user);
    //await this.notificationsService.sendProfileUpdate(updatedUser, dto);
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async validatePassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findOne(userId);
    return bcrypt.compare(password, user.password);
  }

  async updateUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user;
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async linkSocialAccount(
    userId: string,
    expectedEmail: string,
    socialData: VerifiedSocialUser,
  ): Promise<User> {
    if (socialData.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new BadRequestException(
        'El email del token social no coincide con el email de la cuenta actual.',
      );
    }

    const existingLink = await this.userRepository.findOneBy({
      socialProviderId: socialData.socialProviderId,
    });

    if (existingLink && existingLink.id !== userId) {
      throw new BadRequestException(
        'Esta cuenta social ya está vinculada a otro usuario.',
      );
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    user.socialProvider = socialData.provider;
    user.socialProviderId = socialData.socialProviderId;
    user.avatarURl = socialData.avatarUrl ?? user.avatarURl;

    return this.userRepository.save(user);
  }

  async unlinkSocialAccount(
    userId: string,
    provider: 'google' | 'apple',
  ): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (!user.password && user.socialProvider === provider) {
      throw new ForbiddenException(
        'No puede desvincular esta cuenta. Es su único método de inicio de sesión. Establezca una contraseña primero.',
      );
    }

    if (user.socialProvider === provider) {
      user.socialProvider = null;
      user.socialProviderId = null;
    }

    return this.userRepository.save(user);
  }

  async uploadAvatar(avatar: Express.Multer.File, userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) throw new NotFoundException('El usuario no existe');

    if (user.avatarURl) {
      await this.minioService.deleteFile(user.avatarURl);
    }

    const newAvatarUrl = await this.minioService.uploadFile(
      avatar,
      `users/${userId}/avatar`,
    );

    await this.userRepository.update(userId, { avatarURl: newAvatarUrl });

    return {
      url: newAvatarUrl,
      message: 'Foto de perfil actualizada correctemente',
    };
  }

  async getInfoProfile(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ip: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('Usuario no registrado');

    if (dto.username) user.name = dto.username;
    if (dto.location) user.location = dto.location;

    if (dto.phone && dto.phone !== user.phone) {
      if (!dto.otpCode) {
        await this.userRepository.save(user);

        await this.otpService.generateOtp(
          {
            phone: user.phone,
            method: 'phone',
          },
          ip,
        );

        return {
          status: 'pending_verification',
          message:
            'Perfil actualizado. Confirma el código enviado a tu teléfono antiguo para cambiar el número.',
        };
      }

      const isValid = await this.otpService.verifyOtp(
        {
          phone: user.phone,
          code: dto.otpCode,
          method: 'phone',
        },
        ip,
      );

      if (!isValid) throw new BadRequestException('Código OTP incorrecto');

      user.phone = dto.phone;
    }

    return await this.userRepository.save(user);
  }
}
