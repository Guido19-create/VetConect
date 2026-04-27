import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginInitDto {
  @ApiProperty({ example: 'guido@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'gQOY612RE' })
  @IsString()
  password: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'guidogarciafernandez2@gmail.com',
    description: 'Correo electrónico del usuario que intenta iniciar sesión',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
