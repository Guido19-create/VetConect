import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../auth/decorators/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { User } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('direct')
  @Roles('ADMIN', 'VETERINARIAN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    type: CreateAppointmentDto,
    description: 'Datos de la cita',
    examples: {},
  })
  @ApiOperation({
    summary: 'Agendar cita directa (RF-CI-01)',
    description:
      'Endpoint para que el veterinario registre una cita directamente seleccionando mascota y fecha.',
  })
  @ApiResponse({ status: 201, description: 'Cita agendada correctamente.' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para agendar citas.',
  })
  @ApiResponse({ status: 404, description: 'Mascota no encontrada.' })
  async createDirect(@Body() createAppointmentDto: CreateAppointmentDto) {
    return await this.appointmentsService.createDirect(createAppointmentDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar una cita médica',
    description:
      'Permite al dueño de la mascota o al personal de la clínica cancelar una cita. Valida que el personal pertenezca a la clínica de la cita.',
  })
  @ApiBody({
    type: CancelAppointmentDto,
    description: 'Datos necesarios para la cancelación',
  })
  @ApiResponse({
    status: 200,
    description: 'Cita cancelada exitosamente.',
    schema: {
      example: {
        message: 'Cita cancelada correctamente',
        appointment: {
          id: 1,
          states: 'cancelled',
          reason: 'Motivo original (CANCELADA: Motivo del cliente)',
          petName: 'Thor',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido: No tienes permisos en esta clínica.',
  })
  @ApiResponse({
    status: 404,
    description: 'No encontrado: La cita no existe.',
  })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelAppointmentDto: CancelAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentsService.cancel(id, cancelAppointmentDto, user);
  }

  @Patch(':id/reschedule')
  @ApiOperation({
    summary: 'Reprogramar una cita existente',
    description:
      'Permite cambiar la fecha y hora de una cita. Solo permitido para el dueño o personal de la clínica.',
  })
  @ApiBody({ type: RescheduleAppointmentDto })
  @ApiResponse({ status: 200, description: 'Cita reprogramada exitosamente.' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos o la cita no es editable.',
  })
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() rescheduleDto: RescheduleAppointmentDto,
    @GetUser() user: User,
  ) {
    return this.appointmentsService.reschedule(id, rescheduleDto, user);
  }

  @Get('clinic/:clinicId')
  @ApiOperation({
    summary: 'Ver agenda de la clínica',
    description:
      'Muestra todas las citas de una clínica. Se puede filtrar por fecha con el query param ?date=YYYY-MM-DD',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas obtenida correctamente.',
  })
  findAll(
    @Param('clinicId') clinicId: string,
    @Query('date') date: string,
    @GetUser() user: User,
  ) {
    return this.appointmentsService.findAllByClinic(clinicId, user, date);
  }

  @Get('pet/:petId/history')
  @ApiOperation({ 
    summary: 'Ver historial de citas de una mascota', 
    description: 'Retorna todas las citas pasadas y futuras de una mascota específica. Solo accesible para el dueño.' 
  })
  @ApiResponse({ status: 200, description: 'Historial obtenido correctamente.' })
  @ApiResponse({ status: 403, description: 'No eres el dueño de esta mascota.' })
  getHistory(
    @Param('petId') petId: string,
    @GetUser() user: User,
  ) {
    return this.appointmentsService.findHistoryByPet(petId, user);
  }
}
