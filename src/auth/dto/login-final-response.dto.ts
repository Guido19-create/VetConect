// login-final-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRegistrationDataDto } from './register-verify.dto'; // Importa el que ya hicimos

export class LoginFinalResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de acceso para endpoints protegidos',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token para renovar el access_token',
  })
  refresh_token: string;

  @ApiProperty({
    example: 3600,
    description: 'Segundos que faltan para que expire',
  })
  expires_in: number;

  @ApiProperty({
    example: '2025-12-19T20:33:48.651Z',
    description: 'Fecha exacta de expiración',
  })
  expires_at: string;

  @ApiProperty({ type: UserRegistrationDataDto })
  user: UserRegistrationDataDto;
}
