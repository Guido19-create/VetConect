import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ 
    example: 'guido@example.com', 
    description: 'Correo electrónico único del usuario' 
  })
  @IsEmail({}, { message: 'El formato del correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email: string;

  @ApiProperty({ 
    example: 'password123', 
    description: 'Contraseña de acceso (mínimo 8 caracteres)' 
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ 
    example: 'Guido Jose Garcia Fernandez', 
    description: 'Nombre completo del usuario' 
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ 
    example: '+123456789', 
    required: false, 
    description: 'Número de contacto opcional' 
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ 
    example: 'Canada', 
    required: false, 
    description: 'Ubicación geográfica del usuario' 
  })
  @IsString()
  @IsOptional()
  location?: string;
}