import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Pet } from '../pets/entities/pet.entity';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { User } from '../users/entities/user.entity';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { Notification } from '../notifications/entities/notification.entity';
import { ChatGateway } from '../conversations/chat.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  private async createAndSendNotification(userId: string, message: string) {
    const newNotification = this.notificationRepository.create({
      usersId: userId,
      information: message,
      date: new Date(),
    });
    await this.notificationRepository.save(newNotification);

    this.chatGateway.sendMessage(userId, {
      type: 'NEW_NOTIFICATION',
      id: newNotification.id,
      message: newNotification.information,
      date: newNotification.date,
    });
  }

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
        ucr.clinicId === appointment.clinicId,
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

    const updatedAppointment = await this.appointmentRepository.save(appointment);

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
      relations: ['pet', 'pet.owners', 'clinic.name'],
    });

    console.log(appointment)

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

    const oldDate = appointment.date_time.toLocaleString('es-ES');
    appointment.date_time = newDate;

    const changeLog = `[Reprogramada de ${oldDate} a ${appointment.date_time.toLocaleString('es-ES')}]`;

    if (dto.reschedule_reason) {
      appointment.reason = appointment.reason
        ? `${appointment.reason} ${changeLog}: ${dto.reschedule_reason}`
        : `${changeLog}: ${dto.reschedule_reason}`;
    } else {
      appointment.reason = appointment.reason
        ? `${appointment.reason} ${changeLog}`
        : changeLog;
    }

    const savedAppointment = await this.appointmentRepository.save(appointment);

    const msg = `La cita de la mascota ${appointment.pet.name} en la clínica ${appointment.clinic?.name || 'Veterinaria'} ha sido modificada para el ${newDate.toLocaleString('es-ES')}.`;

    if (isOwner) {
      if (appointment.clinic?.ownerId) {
        await this.createAndSendNotification(appointment.clinic.ownerId, msg);
      }
    } else if (isStaffOfClinic) {
      for (const owner of appointment.pet.owners) {
        await this.createAndSendNotification(owner.id, msg);
      }
    }

    return savedAppointment;
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

  /**
   * RF-NT-01: Recordatorios automáticos de proximidad (24h y 1h antes)
   * Se ejecuta cada 5 minutos buscando citas activas en las ventanas de tiempo.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAppointmentReminders() {
    const now = new Date();

    // Ventanas de tiempo con margen de 5 minutos para que el Cron capture la cita con precisión
    const start24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end24h = new Date(start24h.getTime() + 5 * 60 * 1000);

    const start1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const end1h = new Date(start1h.getTime() + 5 * 60 * 1000);

    const appointmentsToRemind = await this.appointmentRepository.find({
      where: [
        { states: 'scheduled', date_time: Between(start24h, end24h) },
        { states: 'scheduled', date_time: Between(start1h, end1h) }
      ],
      relations: ['pet', 'pet.owners', 'clinic'],
    });

    for (const appointment of appointmentsToRemind) {
      const msDifference = appointment.date_time.getTime() - now.getTime();
      const hoursLeft = Math.round(msDifference / (1000 * 60 * 60));

      const msg = `Recordatorio de cita: Faltan aproximadamente ${hoursLeft} ${hoursLeft === 1 ? 'hora' : 'horas'} para la cita de ${appointment.pet.name} en la clínica ${appointment.clinic?.name || 'Veterinaria'}.`;

      // En proximidad de cita, se le guarda y envía a AMBOS obligatoriamente
      
      // 1. A los dueños de la mascota
      for (const owner of appointment.pet.owners) {
        await this.createAndSendNotification(owner.id, msg);
      }

      // 2. Al administrador/dueño de la clínica
      if (appointment.clinic?.ownerId) {
        await this.createAndSendNotification(appointment.clinic.ownerId, msg);
      }
    }
  }

  /**
   * AUTO-LIMPIEZA DE BASE DE DATOS (TTL de 3 días)
   * Se ejecuta todas las noches a las 12:00 AM para purgar datos antiguos.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOldNotifications() {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 3); // Fecha de corte: exactamente hace 3 días

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('created_at <= :limitDate', { limitDate })
      .execute();

    console.log(`[CONSERJERÍA] Limpieza completada. Se eliminaron ${result.affected || 0} notificaciones con más de 3 días de antigüedad.`);
  }
}