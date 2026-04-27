import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterVerifyDto {
  @ApiProperty({
    example: '237581',
    description: 'Código de 6 dígitos enviado al correo',
  })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty({
    example: 'garcia@gmail.com',
    description: 'Este es el correo gmail',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class UserRegistrationDataDto {
  @ApiProperty({ example: 'c083afeb-7719-46e2-9c29-5d0408f69f9d' })
  id: string;

  @ApiProperty({ example: 'guidogarciafernandez2@gmail.com' })
  email: string;

  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiProperty({ example: '+53 55346798' })
  phone: string;

  @ApiProperty({ example: null, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'user' })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'Georgia' })
  country: string;

  @ApiProperty({ example: null, nullable: true })
  twoFactorSecret: string | null;

  @ApiProperty({ example: false })
  isMfaEnabled: boolean;

  @ApiProperty({ example: null, nullable: true })
  twoFactorIv: string | null;

  @ApiProperty({ example: null, nullable: true })
  socialProviderId: string | null;

  @ApiProperty({ example: 'local' })
  socialProvider: string;

  @ApiProperty({ example: '2025-12-19T20:03:22.837Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-12-19T20:03:22.837Z' })
  updatedAt: string;
}

export class RegisterVerifyResponseDto {
  @ApiProperty({ example: 'Usuario registrado correctamente' })
  message: string;

  @ApiProperty({ type: UserRegistrationDataDto })
  user: UserRegistrationDataDto;
}
