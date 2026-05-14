import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpStatus,
  Patch,
  Query,
  Delete,
} from '@nestjs/common';
import { DailyAttentionService } from './daily-attendance.service';
import { CreateDailyAttendanceDto } from './dto/create-daily-attendance.dto';
import { JwtAuthGuard } from '../auth/decorators/jwt.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DailyAttendance } from './entities/daily-attendance.entity';

@ApiTags('Atención Diaria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('daily-attention')
export class DailyAttentionController {
  constructor(private readonly dailyAttentionService: DailyAttentionService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar atención diaria (RF-AD-01)',
    description:
      'Permite a un veterinario registrar la visita de un paciente. Valida que el usuario tenga un rol activo en la clínica.',
  })
  @ApiBody({ type: CreateDailyAttendanceDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Atención diaria guardada correctamente.',
    type: DailyAttendance,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario no tiene permisos en la clínica especificada.',
  })
  create(@Body() createDto: CreateDailyAttendanceDto, @GetUser() user: User) {
    return this.dailyAttentionService.create(createDto, user);
  }

  @Get('clinic/:clinicId')
  @ApiOperation({
    summary: 'Obtener todas las atenciones de una clínica específica',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listado de atenciones diarias.',
  })
  findAll(@Param('clinicId') clinicId: string) {
    return this.dailyAttentionService.findAllByClinic(clinicId);
  }

  @Get('clinic/:clinicId/date/:date')
  @ApiOperation({
    summary: 'Listar atenciones por fecha específica (RF-AD-02)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de atenciones filtrada por fecha.',
  })
  findByDate(@Param('clinicId') clinicId: string, @Param('date') date: string) {
    return this.dailyAttentionService.findByDate(clinicId, date);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver detalle de una atención específica (RF-AD-03)',
  })
  @ApiResponse({ status: 200, description: 'Detalle completo de la atención.' })
  findOne(@Param('id') id: number, @GetUser() user: User) {
    return this.dailyAttentionService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una atención diaria (RF-AD-04)' })
  @ApiBody({ type: CreateDailyAttendanceDto })
  @ApiResponse({
    status: 200,
    description: 'Atención actualizada correctamente.',
  })
  update(
    @Param('id') id: number,
    @Body() updateDto: Partial<CreateDailyAttendanceDto>,
    @GetUser() user: User,
  ) {
    return this.dailyAttentionService.update(id, updateDto, user);
  }


  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar atención diaria (RF-AD-05)',
    description: 'Elimina permanentemente un registro de atención diaria del sistema. Nota: Esta acción es irreversible y debe ser confirmada por el usuario en la interfaz.' 
  })
  @ApiParam({ name: 'id', description: 'ID numérico del registro de atención', example: 1 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'El registro ha sido eliminado exitosamente.',
    schema: { example: { message: 'Registro de atención #1 eliminado correctamente.' } }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No se encontró la atención con el ID proporcionado.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'No tienes permisos para eliminar registros de esta clínica.' })
  remove(@Param('id') id: number, @GetUser() user: User) {
    return this.dailyAttentionService.remove(id, user);
  }

  @Get('clinic/:clinicId/search')
  @ApiOperation({ 
    summary: 'Buscar atenciones con filtros (RF-AD-06)',
    description: 'Permite filtrar el historial de atenciones de una clínica mediante múltiples criterios opcionales.' 
  })
  @ApiParam({ name: 'clinicId', description: 'UUID de la clínica', example: '347929fb-0440-4550-9095-a878be38736c' })
  @ApiQuery({ name: 'patient_name', required: false, description: 'Nombre de la mascota (búsqueda parcial)' })
  @ApiQuery({ name: 'owner_name', required: false, description: 'Nombre del propietario' })
  @ApiQuery({ name: 'species', required: false, description: 'Especie (ej: Canino, Felino)' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Fecha inicial del rango (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Fecha final del rango (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Búsqueda realizada con éxito.',
    schema: {
      example: [{
        id: 1,
        date: '2026-05-13',
        patient_name: 'Thor',
        owner_name: 'Guido Garcia',
        species: 'Canino',
        observations: 'Chequeo general'
      }]
    }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No se encontraron resultados para los filtros aplicados.' })
  search(
    @Param('clinicId') clinicId: string,
    @Query('patient_name') patient_name?: string,
    @Query('owner_name') owner_name?: string,
    @Query('species') species?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.dailyAttentionService.search(clinicId, {
      patient_name,
      owner_name,
      species,
      fromDate,
      toDate,
    });
  }
}
