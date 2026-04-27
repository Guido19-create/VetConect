import { ApiProperty } from '@nestjs/swagger';

export class MfaRequiredDto {
  @ApiProperty({ description: 'Indica que se requiere verificación MFA.' })
  mfaRequired: true;

  @ApiProperty({ description: 'Mensaje sobre el envío del OTP.' })
  message: string;
}
