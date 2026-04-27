import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateOtpDto {
  @ApiProperty({
    enum: ['email', 'phone'],
    description: 'Método para el cual se genera el OTP.',
    default: 'email',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['email', 'phone'])
  method: 'email' | 'phone';

  @ApiProperty({
    description: 'Email del usuario si no está autenticado.',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'El telefono del usuario.', required: false })
  @IsOptional()
  phone?: string;
}
