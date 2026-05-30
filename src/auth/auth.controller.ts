import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpStatus,
  HttpCode,
  Delete,
  Req,
  Query,
  Res,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto';
import { GenerateOtpDto } from '../otp/dto/generate-otp.dto';
import { RecoverRequestDto } from './dto/recover-request.dto';
import { RecoverConfirmDto } from './dto/recover-confirm.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { User } from '../users/entities/user.entity';
import { GetUser } from './decorators/get-user.decorator';
import { LinkAccountDto } from './dto/link-account.dto';
import { OtpService } from '../otp/otp.service';
import { LoginDto, LoginInitDto } from './dto/login.dto';
import { VerifySecondFactorDto } from './dto/verify-second-factor.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginFinalResponseDto } from './dto/login-response.dto';
import { ClientIp } from '../common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { DeleteAccountDto } from '../users/dto/deleteAccount.dto';
import { JwtAuthGuard } from './decorators/jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Public()
  @Post('register/init')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar registro de usuario',
    description:
      'Crea el perfil de usuario en estado inactivo y envía un código OTP al correo electrónico proporcionado.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente y OTP enviado.',
    schema: {
      example: { message: 'Código enviado por email' },
    },
  })
  @ApiConflictResponse({
    description:
      'El correo electrónico ya se encuentra registrado en el sistema.',
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos (error de validación de campos).',
  })
  async registerInit(
    @Body() dto: CreateUserDto,
    @ClientIp() ipAddress: string,
  ) {
    return this.authService.registerInit(dto, ipAddress);
  }

  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar OTP y completar registro',
    description:
      'Comprueba que el código OTP enviado por el usuario coincide con el generado. Si es correcto, activa la cuenta del usuario.',
  })
  @ApiBody({ type: RegisterVerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario verificado y activado correctamente.',
    schema: {
      example: { message: 'Usuario verificado correctamente' },
    },
  })
  @ApiNotFoundResponse({
    description: 'No se encontró ningún usuario con el correo proporcionado.',
  })
  @ApiBadRequestResponse({
    description:
      'Código OTP incorrecto, expirado o formato de correo inválido.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno al intentar actualizar el estado del usuario.',
  })
  async registerVerify(
    @Body() dto: RegisterVerifyDto,
    @ClientIp() ipAddress: string,
  ) {
    const { otp, email } = dto;
    return this.authService.registerVerify(email, otp, ipAddress);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Primer paso del login: Verificación de identidad y MFA',
    description:
      'Identifica al usuario por su email y determina si el segundo factor de autenticación será mediante una App (TOTP) o mediante correo electrónico (EMAIL).',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Credenciales básicas para iniciar el proceso de login.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Desafío de seguridad generado. El cliente debe proceder según el "type" recibido.',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'El usuario no existe o los datos del formulario son inválidos.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno en el servidor al procesar la solicitud.',
  })
  async login(@Body() dto: LoginDto, @ClientIp() ipAddress: string) {
    return this.authService.login(dto, ipAddress);
  }

  @Public()
  @Post('login/init')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión (Paso 1: Credenciales)',
    description:
      'Valida el correo y la contraseña. Si son correctos, genera y envía un código OTP al correo electrónico del usuario.',
  })
  @ApiBody({ type: LoginInitDto })
  @ApiResponse({
    status: 200,
    description: 'Credenciales válidas. Código OTP enviado al correo.',
    schema: {
      example: {
        message: 'Se ha enviado un código al correo. Por favor revise.',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Credenciales inválidas o usuario sin contraseña configurada (ej. registro vía social login).',
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada con formato incorrecto.',
  })
  async loginInit(@Body() dto: LoginInitDto, @ClientIp() ipAddress: string) {
    return this.authService.verifyCredentialsLogin(dto, ipAddress);
  }

  @Public()
  @Post('login/verify-second-factor')
  @UseGuards(LoginThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paso Final: Verificar Segundo Factor y Generar Tokens',
    description:
      'Valida el código de seguridad (TOTP o Email). Si es válido, genera el Access Token, el Refresh Token y registra el inicio de sesión en la auditoría.',
  })
  @ApiBody({
    type: VerifySecondFactorDto,
    examples: {
      ejemploEmail: {
        summary: 'Ejemplo: Verificación por Email',
        value: {
          code: '717657',
          userId: 'f4147e29-1589-45e4-a4d4-519fd4843919',
          type: 'EMAIL',
        },
      },
      ejemploTOTP: {
        summary: 'Ejemplo: Verificación por Authenticator',
        value: {
          code: '123456',
          userId: 'f4147e29-1589-45e4-a4d4-519fd4843919',
          type: 'TOTP',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticación completada con éxito.',
    type: LoginFinalResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'El código proporcionado es incorrecto, ya fue usado o ha expirado.',
  })
  @ApiNotFoundResponse({
    description: 'El ID de usuario no existe en el sistema.',
  })
  @ApiBadRequestResponse({
    description:
      'Datos de entrada inválidos (ej. ID de usuario no es un UUID válido).',
  })
  async verifySecondFactor(
    @Body() verifyDto: VerifySecondFactorDto,
    @ClientIp() ipAddress: string,
  ) {
    return this.authService.verifySecondFactor(
      verifyDto.userId,
      verifyDto.code,
      verifyDto.type,
      ipAddress,
    );
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Cierra la sesión del usuario. El cliente debe eliminar el token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso',
    examples: {
      success: {
        summary: 'Logout completado',
        value: {
          message: 'Logout exitoso. Elimina el token del cliente.',
          timestamp: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o faltante',
    examples: {
      unauthorized: {
        summary: 'Error de autenticación',
        value: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      },
    },
  })
  async logout(
    @Headers('Authorization') access_token: string,
    @ClientIp() ipAddress: string,
  ) {
    return this.authService.logout(access_token, ipAddress);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar el token de acceso',
    description:
      'Recibe un refresh token válido y devuelve un nuevo access token. No requiere autenticación previa.',
  })
  @ApiBody({
    description: 'Refresh token emitido durante el login',
    required: true,
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Nuevo token de acceso generado correctamente.',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        expires_in: { type: 'number', example: 3600 },
        expires_at: { type: 'string', example: '2025-11-10T18:05:32.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado.',
  })
  async refresh(
    @Body('refresh_token') refresh_token: string,
    @ClientIp() ipAddress,
  ) {
    return this.authService.refreshToken(refresh_token, ipAddress);
  }

  @Public()
  @Post('generate-otp')
  @ApiOperation({ summary: 'Genera un código OTP de 6 dígitos para MFA.' })
  @ApiResponse({
    status: 200,
    description: 'OTP generado y enviado (expira en 5 minutos).',
  })
  async generateOtp(
    @Body() dto: GenerateOtpDto,
    @ClientIp() ipAddress: string,
  ): Promise<{ message: string }> {
    await this.otpService.generateOtp(dto, ipAddress);
    return {
      message: `Código OTP enviado a su ${dto.method}. Expira en 30 minutos.`,
    };
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Valida el código OTP e invalida el código.' })
  @ApiResponse({ status: 200, description: 'OTP validado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado.' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @ClientIp() ipAddress: string,
  ): Promise<{ message: string }> {
    await this.otpService.verifyOtp(dto, ipAddress);
    return { message: 'OTP validado exitosamente. Puede continuar.' };
  }

  @Public()
  @Post('recover-request')
  @ApiOperation({
    summary: 'Solicitar Token de Recuperación',
    description:
      'Genera un token de reseteo (JWT) con 30 minutos de expiración y lo envía al email del usuario mediante IONOS. Invalida tokens anteriores no utilizados.',
  })
  @ApiBody({
    type: RecoverRequestDto,
    examples: {
      ejemplo: {
        value: { email: 'guidogarciafernandez2@gmail.com' },
        summary: 'Correo del usuario registrado',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Proceso de recuperación iniciado. Se envía correo si la cuenta existe.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Recuperación procesada correctamente. Revisa tu bandeja de entrada.',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno al intentar enviar el correo (Fallo de SMTP/IONOS).',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example:
            'No se pudo enviar el correo de recuperación. Por favor, inténtelo más tarde.',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async recoverRequest(@Body() dto: RecoverRequestDto) {
    return this.authService.requestPasswordRecovery(dto.email);
  }

  @Public() 
  @Get('redirect-recovery')
  @ApiOperation({
    summary: 'Redirección intermedia para el Deep Linking en desarrollo',
  })
  async redirectRecovery(@Query('token') token: string, @Res() res: any) {
    const expoUrl = `${process.env.EXPO_URL_FORGOT_PASSWORD}${token}`;
    res.send(`
    <html>
      <head>
        <title>Redireccionando a VetConnect...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; color: #333; }
          .btn { display: inline-block; padding: 12px 24px; background: #2b6777; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h2>Abriendo VetConnect...</h2>
        <p>Si la aplicación no se abre automáticamente, haz clic en el botón de abajo.</p>
        <a class="btn" href="${expoUrl}">Abrir Aplicación</a>
        <script>
          // Intenta abrir Expo Go automáticamente al cargar la página
          window.location.href = "${expoUrl}";
        </script>
      </body>
    </html>
  `);
  }

  @Public()
  @Post('recover-confirm')
  @ApiOperation({
    summary: 'Confirmar Recuperación de Contraseña',
    description:
      'Paso final: Valida el token JWT enviado por correo, verifica que no haya sido usado y actualiza la contraseña del usuario en la base de datos.',
  })
  @ApiBody({ type: RecoverConfirmDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contraseña restablecida exitosamente.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido, expirado, ya utilizado o alterado.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Token inválido o ya utilizado.',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'El usuario asociado al token ya no existe.',
  })
  async recoverConfirm(@Body() dto: RecoverConfirmDto) {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword);
    return { message: 'Contraseña restablecida exitosamente.' };
  }

  @Public()
  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login o Registro Social (Google/Apple)',
    description:
      'Recibe un ID Token JWT de Google o Apple, valida la firma, y autentica o registra al usuario.',
  })
  @ApiBody({ type: SocialLoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Autenticación exitosa. Retorna tokens JWT y datos del usuario.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token social inválido o expirado.',
  })
  async socialLogin(
    @Body() dto: SocialLoginDto,
    @ClientIp() ipAddress: string,
  ) {
    return this.authService.socialLogin(dto, ipAddress);
  }

  @Post('link-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vincular cuenta social (Google/Apple)',
    description:
      'Asocia una cuenta social al usuario autenticado, verificando que el email del token coincida con el usuario actual.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta social vinculada exitosamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token social inválido o email no coincidente.',
  })
  async linkAccount(
    @GetUser() user: User,
    @Body() dto: LinkAccountDto,
    @ClientIp() ipAddress: string,
  ): Promise<{ message: string; provider: string }> {
    await this.authService.linkSocialAccount(
      user.id,
      user.email,
      dto,
      ipAddress,
    );
    return {
      message: `Cuenta con ${dto.provider} vinculada exitosamente.`,
      provider: dto.provider,
    };
  }

  @Delete('unlink-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desvincular cuenta social (Google/Apple)',
    description:
      'Revoca la asociación de una cuenta social. No permite la desvinculación si es el único método de login.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta social desvinculada exitosamente.',
  })
  @ApiResponse({
    status: 403,
    description:
      'La cuenta no puede desvincularse (es el único método de login).',
  })
  async unlinkAccount(
    @GetUser() user: User,
    @Body('provider') provider: 'google' | 'apple',
    @ClientIp() ipAddress: string,
  ): Promise<{ message: string; provider: string }> {
    await this.authService.unlinkSocialAccount(user.id, provider, ipAddress);
    return {
      message: `Cuenta con ${provider} desvinculada exitosamente.`,
      provider: provider,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar cuenta de usuario',
    description:
      'Elimina permanentemente la cuenta del usuario autenticado. REQUIERE confirmación de contraseña. ADVERTENCIA: Esta acción es irreversible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta eliminada exitosamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Contraseña incorrecta o sesión inválida.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: 400,
    description:
      'El usuario no tiene contraseña configurada (cuenta social sin password).',
  })
  async deleteAccount(
    @Req() req: any,
    @Body() deleteAccountDto: DeleteAccountDto,
  ) {
    return await this.authService.deleteAccount(
      req.user.id,
      deleteAccountDto.password,
    );
  }
}
