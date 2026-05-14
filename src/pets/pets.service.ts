import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { User } from '../users/entities/user.entity';
import { MinioService } from '../common/integrations/minio/minio.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { MedicalRecord } from './entities/medical-record.entity';
import { Vaccination } from './entities/vaccination.entity';
import { Deworming } from './entities/deworming.entity';
import { AddVaccinationDto } from './dto/add-vaccination.dto';
import { AddDewormingDto } from './dto/add-deworming.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRecordRepository: Repository<MedicalRecord>,
    @InjectRepository(Vaccination)
    private readonly vaccinationRepository: Repository<Vaccination>,
    @InjectRepository(Deworming)
    private readonly dewormingRepository: Repository<Deworming>,
    private readonly minioService: MinioService,
  ) {}

  async create(createPetDto: CreatePetDto, currentUser: User) {
    const { ownerId, clinicId, ...petData } = createPetDto;
    let ownerToAssign: User | null = null;

    // 1. Validar acceso a la clínica
    const hasAccessToClinic = currentUser.clinicRoles?.some(
      (role) => role.clinicId === clinicId && role.isActive,
    );

    if (!hasAccessToClinic && ownerId !== currentUser.id) {
      throw new ForbiddenException(
        'No tienes permiso para registrar mascotas en esta clínica.',
      );
    }

    // 2. Asignar dueño
    if (ownerId) {
      ownerToAssign = await this.userRepository.findOneBy({ id: ownerId });
      if (!ownerToAssign) throw new NotFoundException('El cliente no existe.');
    } else {
      ownerToAssign = currentUser;
    }

    const newPet = this.petRepository.create({
      ...petData,
      clinicId, 
      owners: [ownerToAssign],
    });

    const savedPet = await this.petRepository.save(newPet);

    return {
      ...savedPet,
      owners: savedPet.owners.map((o) => ({ id: o.id, name: o.name })),
    };
  }

  async uploadPetPhoto(petId: string, user: User, photo: Express.Multer.File) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['owners'],
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada.');
    }

    const isOwner = pet.owners.some((owner) => owner.id === user.id);

    const isStaff = user.clinicRoles && user.clinicRoles.length > 0;

    if (!isOwner && !isStaff) {
      throw new ForbiddenException(
        'No tienes permisos para modificar la foto de esta mascota. Debes ser el dueño o personal de la clínica.',
      );
    }

    if (pet.photoURL) {
      try {
        await this.minioService.deleteFile(pet.photoURL);
      } catch (error) {
        console.error('Error al borrar archivo antiguo:', error);
      }
    }

    const photoURL = await this.minioService.uploadFile(photo, 'pets');

    pet.photoURL = photoURL;
    const updatedPet = await this.petRepository.save(pet);

    return {
      ...updatedPet,
      owners: updatedPet.owners.map((owner) => owner.id),
    };
  }

  async createMedicalRecord(dto: CreateMedicalRecordDto, user: User) {
    const pet = await this.petRepository.findOne({
      where: { id: dto.petId },
      relations: ['medicalRecord'],
    });

    if (!pet) throw new NotFoundException('Mascota no encontrada.');

    const authorizedRoles = ['ADMIN', 'VETERINARIAN', 'SUPERADMIN'];

    const isAuthorized = user.clinicRoles?.some(
      (ucr) => authorizedRoles.includes(ucr.role.type) && ucr.isActive,
    );

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Acceso denegado. Solo personal médico o administrativo puede crear historias clínicas.',
      );
    }

    let record = pet.medicalRecord;

    if (!record) {
      record = this.medicalRecordRepository.create({
        pet: pet,
        diseasesSuffered: dto.diagnosis,
        veterinaryCare: dto.treatment,
        otherInformation: dto.observations,
      });
    } else {
      record.diseasesSuffered = dto.diagnosis;
      record.veterinaryCare = dto.treatment;
      record.otherInformation = dto.observations;
    }

    return await this.medicalRecordRepository.save(record);
  }

  async addVaccination(
    dto: AddVaccinationDto,
    file: Express.Multer.File,
    user: User,
  ) {
    const pet = await this.petRepository.findOne({
      where: { id: dto.petId },
      relations: ['medicalRecord'],
    });

    if (!pet || !pet.medicalRecord) {
      throw new NotFoundException(
        'La mascota no tiene una historia clínica inicializada.',
      );
    }

    const tagPhotoUrl = await this.minioService.uploadFile(file, 'vaccines');

    const vaccination = this.vaccinationRepository.create({
      date: new Date(dto.date),
      nextDate: dto.nextDate ? new Date(dto.nextDate) : null,
      tagPhoto: tagPhotoUrl,
      medicalRecord: pet.medicalRecord,
    });

    return await this.vaccinationRepository.save(vaccination);
  }

  async addDeworming(dto: AddDewormingDto) {
    const pet = await this.petRepository.findOne({
      where: { id: dto.petId },
      relations: ['medicalRecord'],
    });

    if (!pet) throw new NotFoundException('Mascota no encontrada.');
    if (!pet.medicalRecord) {
      throw new BadRequestException(
        'La mascota debe tener una historia clínica creada primero.',
      );
    }

    const deworming = this.dewormingRepository.create({
      date: new Date(dto.date),
      medication: dto.medication,
      dose: dto.dose,
      nextDate: dto.nextDate ? new Date(dto.nextDate) : null,
      medicalRecord: pet.medicalRecord,
    });

    return await this.dewormingRepository.save(deworming);
  }

  async getFullMedicalHistory(petId: string, user: User) {
    // 1. Cargamos la mascota con sus relaciones necesarias
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: [
        'owners',
        'medicalRecord',
        'medicalRecord.vaccinations',
        'medicalRecord.dewormings',
      ],
      order: {
        medicalRecord: {
          vaccinations: { date: 'DESC' },
          dewormings: { date: 'DESC' },
        },
      },
    });

    if (!pet) throw new NotFoundException('Mascota no encontrada.');

    // 2. Validación de Acceso simplificada
    // Si el usuario es STAFF (validado por el Guard), entra directo.
    // Si no, verificamos si es el dueño.
    const isStaff = user.clinicRoles?.some(
      (ucr) =>
        ['ADMIN', 'VETERINARIAN', 'SUPERADMIN'].includes(ucr.role.type) &&
        ucr.isActive,
    );

    const isOwner = pet.owners.some((owner) => owner.id === user.id);

    if (!isStaff && !isOwner) {
      throw new ForbiddenException(
        'Acceso denegado. No eres el propietario de esta mascota.',
      );
    }

    if (!pet.medicalRecord) {
      throw new NotFoundException(
        'Esta mascota no tiene una historia clínica inicializada.',
      );
    }

    // 3. Respuesta limpia: solo ID y Name de los propietarios
    return {
      ...pet,
      owners: pet.owners.map((owner) => ({
        id: owner.id,
        name: owner.name,
      })),
    };
  }

  async updateMedicalRecord(
    petId: string,
    dto: UpdateMedicalRecordDto,
    user: User,
  ) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['medicalRecord'],
    });

    if (!pet || !pet.medicalRecord) {
      throw new NotFoundException(
        'No se encontró la historia clínica para esta mascota.',
      );
    }

    const record = pet.medicalRecord;
    record.diseasesSuffered = dto.diagnosis ?? record.diseasesSuffered;
    record.veterinaryCare = dto.treatment ?? record.veterinaryCare;
    record.otherInformation = dto.observations ?? record.otherInformation;

    record.lastModifiedBy = `Vet: ${user.name}`;

    return await this.medicalRecordRepository.save(record);
  }
}
