import { IsInt, IsString, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRatingDto {
  @ApiProperty({ example: 5, description: 'Puntuación del 1 al 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  punctuation: number;

  @ApiProperty({ example: 'Excelente atención', required: false })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ example: 'uuid-de-la-clinica' })
  @IsUUID()
  clinicsId: string;
}