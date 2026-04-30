import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '57ef8e44-fba5-44e4-9960-38998e93ad75',
    description: 'ID único del usuario',
  })
  id: string;

  @ApiProperty({
    example: 'guidogarciafernandez2@gmail.com',
    description: 'Correo electrónico del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'Guido Jose Garcia Fernandez',
    description: 'Nombre completo del usuario',
  })
  username: string;

  @ApiProperty({
    example: '+53 58324187',
    description: 'Número de teléfono',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: null,
    description: 'URL del avatar del usuario',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({
    example: 'user',
    description: 'Rol del usuario',
    enum: ['user', 'admin', 'moderator'],
  })
  role: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el usuario está activo',
  })
  isActive: boolean;

  @ApiProperty({
    example: 'Cuba',
    description: 'País del usuario',
  })
  country: string;

  @ApiProperty({
    example: null,
    description: 'Secreto para autenticación de dos factores',
    nullable: true,
  })
  twoFactorSecret: string | null;

  @ApiProperty({
    example: false,
    description: 'Indica si la autenticación de dos factores está habilitada',
  })
  isMfaEnabled: boolean;

  @ApiProperty({
    example: null,
    description: 'Vector de inicialización para 2FA',
    nullable: true,
  })
  twoFactorIv: string | null;

  @ApiProperty({
    example: null,
    description: 'ID del proveedor social (Google, Facebook, etc)',
    nullable: true,
  })
  socialProviderId: string | null;

  @ApiProperty({
    example: 'local',
    description: 'Proveedor de autenticación',
    enum: ['local', 'google', 'facebook', 'github'],
  })
  socialProvider: string;

  @ApiProperty({
    example: '2026-01-29T06:54:14.893Z',
    description: 'Fecha de creación del usuario',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-29T06:58:01.055Z',
    description: 'Fecha de última actualización',
  })
  updatedAt: Date;
}