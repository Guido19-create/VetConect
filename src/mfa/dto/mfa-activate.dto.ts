
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class MfaActivateDto {
  @ApiProperty({
    example: '123456',
    description: 'Código de 6 dígitos generado por la App de Autenticación',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class MfaActivateResponseDto {
  @ApiProperty({ example: 'MFA activado exitosamente' })
  message: string;
}
