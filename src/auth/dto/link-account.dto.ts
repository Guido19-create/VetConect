import { IsString, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkAccountDto {
  @ApiProperty({
    description: 'El ID Token JWT del proveedor social (Google o Apple).',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({
    enum: ['google', 'apple'],
    description: 'El proveedor social a vincular.',
  })
  @IsString()
  @IsIn(['google', 'apple'])
  provider: 'google' | 'apple';
}
