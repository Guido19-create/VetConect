import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  twoFactorSecret?: string;

  @IsOptional()
  @IsBoolean()
  isMfaEnabled?: boolean;

  @IsOptional()
  @IsString()
  twoFactorIv?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}


export class UpdateAvatarDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo de imagen (jpg, png, jpeg)',
  })
  avatar: any;
}
