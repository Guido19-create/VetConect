import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { PetSex } from '../entities/pet.entity';

export class CreatePetDto {
  @ApiProperty({ example: 'Thor', description: 'Nombre de la mascota' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Perro', description: 'Especie del animal' })
  @IsString()
  @IsNotEmpty()
  species: string;

  @ApiProperty({ example: 'macho', enum: PetSex })
  @IsEnum(PetSex)
  sex: PetSex;

  @ApiProperty({ example: 'Golden Retriever', required: false })
  @IsString()
  @IsOptional()
  breed?: string;

  @ApiProperty({ example: 3, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  age?: number;

  @ApiProperty({ example: 13, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @ApiProperty({ 
    example: 'uuid-del-cliente', 
    description: 'ID del dueño real de la mascota',
    required: true 
  })
  @IsUUID()
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({ example: 'uuid-de-la-clinica', description: 'ID de la clínica donde se registra' })
  @IsUUID()
  @IsNotEmpty()
  clinicId: string;
}