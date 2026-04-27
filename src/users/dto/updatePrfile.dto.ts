import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString()
  username?: string;

  @IsOptional() @IsString()
  location?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Formato de teléfono inválido' })
  phone?: string;

  @IsOptional() @IsString()
  otpCode?: string;
}