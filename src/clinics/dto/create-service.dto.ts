import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional,MaxLength, IsNumber, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ 
    example: 'Consulta Veterinaria', 
    description: 'Nombre del servicio' 
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    example: 'Revisión general preventiva', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: 'Precio del servicio', 
    required: false 
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

}