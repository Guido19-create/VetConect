import {
  IsEmail,
  IsString,
  Length,
  IsOptional,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Código OTP de 6 dígitos.', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener 6 caracteres' })
  code: string;

  @ApiProperty({
    enum: ['email', 'phone'],
    description: 'Método para el cual se envió el OTP (opcional).',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['email', 'phone'])
  method?: 'email' | 'phone';
}
