import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class AddDewormingDto {
  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 'Total P', description: 'Nombre del medicamento' })
  @IsString()
  @IsNotEmpty()
  medication: string;

  @ApiProperty({ example: 5, description: 'Dosis en ml o mg' })
  @IsNumber()
  @IsNotEmpty()
  dose: number;

  @ApiProperty({ example: '2026-08-01', required: false })
  @IsDateString()
  @IsOptional()
  nextDate?: string;

  @IsUUID()
  @IsNotEmpty()
  petId: string;
}