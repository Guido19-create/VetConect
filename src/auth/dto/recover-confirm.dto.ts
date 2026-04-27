import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
export class RecoverConfirmDto {
  @ApiProperty({
    description: 'Token JWT recibido por correo electrónico',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'La nueva contraseña para el usuario',
    example: 'NuevaContraseña123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
