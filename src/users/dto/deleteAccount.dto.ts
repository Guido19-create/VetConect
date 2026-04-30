import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario para confirmar la eliminación',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}