import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsAlpha } from 'class-validator';
import { Type } from 'class-transformer';

export class GetClinicsFilterDto {
  @ApiPropertyOptional({
    description: 'Filtra las clínicas cuyo nombre contenga este texto.',
    example: 'Huellitas',
  })
  @IsOptional()
  @IsString()
  @IsAlpha()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filtra las clínicas cuya dirección contenga este texto.',
    example: 'La Habana',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Número de página (empezando desde 1).',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number) // Convierte el query string a Number
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página.',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}