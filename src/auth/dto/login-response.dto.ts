// login-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    example: 'EMAIL',
    enum: ['EMAIL', 'TOTP'],
    description: 'Método de verificación requerido',
  })
  type: string;

  @ApiProperty({
    example: 'f4147e29-1589-45e4-a4d4-519fd4843919',
    description: 'ID del usuario para el siguiente paso',
  })
  userId: string;

  @ApiProperty({
    example: 'Se ha enviado un código a su correo',
    description: 'Mensaje informativo para el usuario',
  })
  message: string;
}

export class LoginFinalResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 'd7a8f9...' })
  refresh_token: string;

  @ApiProperty({ example: 3600, description: 'Segundos de validez' })
  expires_in: number;

  @ApiProperty({ example: '2025-12-22T06:45:00.000Z' })
  expires_at: string;

  @ApiProperty({
    example: { id: 'uuid', email: 'user@example.com', username: 'juan_perez' },
    description: 'Datos del usuario (sin password)',
  })
  user: any;
}
