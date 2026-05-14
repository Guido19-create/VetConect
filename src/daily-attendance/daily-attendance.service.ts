import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Raw, Repository } from 'typeorm';
import { DailyAttendance } from './entities/daily-attendance.entity';
import { User } from '../users/entities/user.entity';
import { CreateDailyAttendanceDto } from './dto/create-daily-attendance.dto';

@Injectable()
export class DailyAttentionService {
  constructor(
    @InjectRepository(DailyAttendance)
    private readonly attendanceRepository: Repository<DailyAttendance>,
  ) {}

  async create(dto: CreateDailyAttendanceDto, user: User) {
    const hasAccess = user.clinicRoles?.some(
      (role) => role.clinicId === dto.clinicsId && role.isActive === true,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'No tienes permisos activos en esta clínica para registrar atenciones.',
      );
    }

    const newAttention = this.attendanceRepository.create({
      patient_name: dto.patient_name,
      owner_name: dto.owner_name,
      sex: dto.sex,
      species: dto.species,
      observations: dto.observations,
      address: dto.address,
      date: dto.date ? new Date(dto.date) : new Date(),
      Clinicsid: dto.clinicsId,
      Usersid: user.id,
    });

    return await this.attendanceRepository.save(newAttention);
  }

  async findAllByClinic(clinicId: string) {
    return await this.attendanceRepository.find({
      where: { Clinicsid: clinicId },
      order: { date: 'DESC' },
    });
  }

  async findByDate(clinicId: string, date: string) {
    const attentions = await this.attendanceRepository.find({
      where: {
        Clinicsid: clinicId,
        date: Raw((alias) => `CAST(${alias} AS DATE) = :date`, { date }),
      },
      select: ['id', 'patient_name', 'owner_name', 'species', 'date'],
      order: { id: 'DESC' },
    });

    if (attentions.length === 0) {
      throw new NotFoundException(
        `No se encontraron atenciones registradas para la fecha: ${date}`,
      );
    }

    return attentions;
  }

  async findOne(id: number, user: User) {
    const attention = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['clinic'],
    });

    if (!attention) throw new NotFoundException('Atención no encontrada');

    const hasAccess = user.clinicRoles?.some(
      (r) => r.clinicId === attention.Clinicsid,
    );
    if (!hasAccess)
      throw new ForbiddenException('No tienes permiso para ver este detalle');

    return attention;
  }

  async update(id: number, dto: Partial<CreateDailyAttendanceDto>, user: User) {
    const attention = await this.findOne(id, user);

    const updatedAttention = this.attendanceRepository.merge(attention, {
      ...dto,
      date: dto.date ? new Date(dto.date) : attention.date,
    });

    return await this.attendanceRepository.save(updatedAttention);
  }

  async remove(id: number, user: User) {
    const attention = await this.findOne(id, user); 
    
    await this.attendanceRepository.remove(attention);
    return { message: `Registro de atención #${id} eliminado correctamente.` };
  }

  async search(clinicId: string, filters: {
    patient_name?: string;
    owner_name?: string;
    species?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const { patient_name, owner_name, species, fromDate, toDate } = filters;
    
    const where: any = { Clinicsid: clinicId };

    if (patient_name) where.patient_name = ILike(`%${patient_name}%`);
    if (owner_name) where.owner_name = ILike(`%${owner_name}%`);
    if (species) where.species = ILike(`%${species}%`);
    
    if (fromDate && toDate) {
      where.date = Between(new Date(fromDate), new Date(toDate));
    }

    const results = await this.attendanceRepository.find({
      where,
      order: { date: 'DESC' }
    });

    if (results.length === 0) {
      throw new NotFoundException('No se encontraron atenciones con los filtros aplicados.');
    }

    return results;
  }
}
