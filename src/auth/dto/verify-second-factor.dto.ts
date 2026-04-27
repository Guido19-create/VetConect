import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum MfaType {
  TOTP = 'TOTP',
  EMAIL = 'EMAIL',
}

export class VerifySecondFactorDto {
  @ApiProperty({
    description: 'ID del usuario obtenido en el primer paso del login',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Código de 6 dígitos (App o Email)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: MfaType, description: 'Tipo de verificación requerida' })
  @IsEnum(MfaType)
  @IsNotEmpty()
  type: MfaType;
}
