import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Pet } from '../pets/entities/pet.entity';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { User } from '../users/entities/user.entity';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async createDirect(dto: CreateAppointmentDto) {
    const pet = await this.petRepository.findOneBy({ id: dto.petId });
    if (!pet) {
      throw new NotFoundException(`La mascota con ID ${dto.petId} no existe.`);
    }

    const appointmentDate = new Date(dto.date_time);
    const now = new Date();

    if (appointmentDate <= now) {
      throw new BadRequestException(
        'No se puede agendar una cita para una fecha o hora que ya ha pasado.',
      );
    }

    const appointment = this.appointmentRepository.create({
      date_time: appointmentDate,
      reason: dto.reason,
      petId: dto.petId,
      clinicId: dto.clinicId,
    });

    return await this.appointmentRepository.save(appointment);
  }

  async cancel(id: number, dto: CancelAppointmentDto, user: User) {
    // 1. Buscamos la cita cargando la mascota, sus dueños y la clínica vinculada
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['pet', 'pet.owners'],
    });

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada.`);
    }

    // 2. Validación de Acceso (Dueño o Staff de la clínica específica de la cita)
    const isOwner = appointment.pet.owners.some(
      (owner) => owner.id === user.id,
    );

    // Verificamos si el usuario es STAFF activo en la clínica donde es la cita
    const isStaffOfClinic = user.clinicRoles?.some(
      (ucr) =>
        ['ADMIN', 'VETERINARIAN', 'SUPERADMIN'].includes(ucr.role.type) &&
        ucr.isActive &&
        ucr.clinicId === appointment.clinicId, // Validación contra el nuevo campo clinicId
    );

    if (!isOwner && !isStaffOfClinic) {
      throw new ForbiddenException(
        'Acceso denegado. No tienes permisos en esta clínica para cancelar esta cita.',
      );
    }

    // 3. Aplicar cancelación (Actualización de estado)
    appointment.states = 'cancelled';

    if (dto.reason_cancellation) {
      // Concatenamos la razón al campo reason existente para mantener historial
      const cancellationText = `[CANCELADA: ${dto.reason_cancellation}]`;
      appointment.reason = appointment.reason
        ? `${appointment.reason} ${cancellationText}`
        : cancellationText;
    }

    const updatedAppointment =
      await this.appointmentRepository.save(appointment);

    return {
      message: 'Cita cancelada correctamente',
      appointment: {
        id: updatedAppointment.id,
        states: updatedAppointment.states,
        reason: updatedAppointment.reason,
        petName: appointment.pet.name,
      },
    };
  }

  async reschedule(id: number, dto: RescheduleAppointmentDto, user: User) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['pet', 'pet.owners'],
    });

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada.`);
    }

    const newDate = new Date(dto.new_date_time);
    const now = new Date();

    if (newDate <= now) {
      throw new BadRequestException(
        'La nueva fecha de la cita no puede ser anterior a la fecha y hora actual.',
      );
    }

    if (
      appointment.states === 'cancelled' ||
      appointment.states === 'completed'
    ) {
      throw new ForbiddenException(
        `No se puede reprogramar una cita que ya está ${appointment.states}.`,
      );
    }

    const isOwner = appointment.pet.owners.some(
      (owner) => owner.id === user.id,
    );
    const isStaffOfClinic = user.clinicRoles?.some(
      (ucr) =>
        ['ADMIN', 'VETERINARIAN', 'SUPERADMIN'].includes(ucr.role.type) &&
        ucr.isActive &&
        ucr.clinicId === appointment.clinicId,
    );

    if (!isOwner && !isStaffOfClinic) {
      throw new ForbiddenException(
        'No tienes permisos para reprogramar esta cita.',
      );
    }

    const oldDate = appointment.date_time.toLocaleString();
    appointment.date_time = newDate;

    const changeLog = `[Reprogramada de ${oldDate} a ${appointment.date_time.toLocaleString()}]`;

    if (dto.reschedule_reason) {
      appointment.reason = appointment.reason
        ? `${appointment.reason} ${changeLog}: ${dto.reschedule_reason}`
        : `${changeLog}: ${dto.reschedule_reason}`;
    } else {
      appointment.reason = appointment.reason
        ? `${appointment.reason} ${changeLog}`
        : changeLog;
    }

    return await this.appointmentRepository.save(appointment);
  }

  async findAllByClinic(clinicId: string, user: User, date?: string) {
    const isStaffOfClinic = user.clinicRoles?.some(
      (ucr) => ucr.clinicId === clinicId && ucr.isActive
    );

    if (!isStaffOfClinic) {
      throw new ForbiddenException('No tienes permiso para ver la agenda de esta clínica.');
    }

    const query = this.appointmentRepository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.pet', 'pet')
      .leftJoinAndSelect('pet.owners', 'owners')
      .where('appointment.clinicId = :clinicId', { clinicId });

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.andWhere('appointment.date_time BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    }

    query.orderBy('appointment.date_time', 'ASC');

    return await query.getMany();
  }

  async findHistoryByPet(petId: string, user: User) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['owners'],
    });

    if (!pet) {
      throw new NotFoundException(`La mascota con ID ${petId} no existe.`);
    }

    const isOwner = pet.owners.some((owner) => owner.id === user.id);
    
    const isStaff = user.clinicRoles?.some(ucr => ucr.isActive);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('No tienes permiso para ver el historial de esta mascota.');
    }

    return await this.appointmentRepository.find({
      where: { petId: petId },
      order: { date_time: 'DESC' }, 
      relations: ['pet'], 
    });
  }
  
}
