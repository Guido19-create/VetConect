import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAvatarDto, UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard'; 
import { Roles } from '../auth/decorators/roles.decorator'; 
import { JwtAuthGuard } from '../auth/decorators/jwt.guard'; 
import { FileInterceptor } from '@nestjs/platform-express';
import { imageUploadConfig } from '../common/utils/fileFilter.util'; 
import { UserResponseDto } from './dto/user-response.dto'; 
import { UpdateProfileDto } from './dto/updatePrfile.dto';
import { ClientIp } from '../common';

@ApiTags('Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado correctamente',
    type: User,
  })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return { message: 'Usuario registrado correctamente', user };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener informacion actualizada sobre el perfil del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Informacion sobre el usuario obtenida',
    type: UserResponseDto,
  })
  getInfoUser(@Req() req) {
    const userId = req.user.id;
    return this.usersService.getInfoProfile(userId);
  }


  @Patch('update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar perfil de usuario',
    description:
      'Actualiza nombre y ubicacion. Si se cambia el teléfono, se envía un OTP al telefono antiguo y el estado cambia a pendiente hasta recibir el otpCode.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado con éxito o verificación requerida.',
    content: {
      'application/json': {
        examples: {
          verificacion_requerida: {
            summary: 'Cambio de teléfono detectado',
            value: {
              status: 'pending_verification',
              message: 'Se ha enviado un código a tu antiguo teléfono',
            },
          },
          actualizacion_exitosa: {
            summary: 'Perfil actualizado correctamente',
            value: {
              id: 'uuid-generado',
              username: 'Guido Garcia',
              phone: '+5358324187',
              country: 'Cuba',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o código OTP incorrecto.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
    @ClientIp() ip: string,
  ) {
    const userId = req.user.id;
    return await this.usersService.updateProfile(userId, updateProfileDto, ip);
  }

  @Roles('admin')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado', type: User })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles('admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Usuario actualizado', type: User })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('uploadAvatar')
  @UseInterceptors(FileInterceptor('avatar', imageUploadConfig))
  @ApiOperation({
    summary: 'Actualizar foto de perfil',
    description:
      'Sube una imagen a MinIO, elimina la anterior si existe y actualiza la URL en la base de datos.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Imagen de perfil del usuario',
    type: UpdateAvatarDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Foto actualizada correctamente.',
    schema: {
      example: {
        url: 'http://localhost:9000/VetConect/users/uuid/avatar/archivo.jpg',
        message: 'Foto de perfil actualizada correctamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'El archivo no es una imagen válida o es muy pesado.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  uploadProfilePhoto(@UploadedFile() avatar: Express.Multer.File, @Req() req) {
    const userId = req.user.id;
    return this.usersService.uploadAvatar(avatar, userId);
  }
}
