import { IsString, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({
    description:
      'El ID Token JWT proporcionado por Google o Apple después de la autenticación.',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({
    description: 'El proveedor de la autenticación social.',
    enum: ['google', 'apple'],
  })
  @IsString()
  @IsIn(['google', 'apple'], {
    message: 'El proveedor debe ser "google" o "apple".',
  })
  provider: 'google' | 'apple';
}
