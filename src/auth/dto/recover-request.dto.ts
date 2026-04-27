// src/auth/dto/recover-request.dto.ts
import { IsEmail } from 'class-validator';

export class RecoverRequestDto {
  @IsEmail()
  email: string;
}
