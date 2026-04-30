import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Clinic, ClinicPrivacy } from './entities/clinic.entity';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UserClinicRole } from './entities/user-clinic-role.entity';
import { Role } from '../roles/entities/role.entity';
import { ClinicInvitation } from './entities/invitations.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { MinioService } from '../common/integrations/minio/minio.service';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(ClinicInvitation)
    private readonly invitationRepository: Repository<ClinicInvitation>,
    @InjectRepository(UserClinicRole)
    private readonly userClinicRoleRepository: Repository<UserClinicRole>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

  async create(createClinicDto: CreateClinicDto, ownerId: string) {
    const existingClinic = await this.clinicRepository.findOne({
      where: { name: createClinicDto.name },
    });

    if (existingClinic) {
      throw new ConflictException('El nombre de la clínica ya está en uso.');
    }

    const ownerRole = await this.roleRepository.findOne({
      where: { type: 'OWNER' },
    });

    if (!ownerRole) {
      throw new InternalServerErrorException(
        'Error de configuración: El rol OWNER no existe en la base de datos.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const clinic = queryRunner.manager.create(Clinic, {
        ...createClinicDto,
        ownerId,
      });
      const savedClinic = await queryRunner.manager.save(clinic);

      const userClinicRole = queryRunner.manager.create(UserClinicRole, {
        user: { id: ownerId },
        clinic: savedClinic,
        role: ownerRole,
      });
      await queryRunner.manager.save(userClinicRole);

      await queryRunner.commitTransaction();

      return savedClinic;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'No se pudo crear la clínica y asignar el rol. Intente más tarde.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async inviteMember(
    clinicId: string,
    roleId: string,
    userId: string,
    ip: string,
  ) {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
    });
    if (!clinic) throw new NotFoundException('Clínica no encontrada');

    const user = await this.usersService.findById(userId);

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role)
      throw new NotFoundException('No se ha encontrado un ROl con ese id');

    const invitationToken = uuidv4();
    const invitation = this.invitationRepository.create({
      token: invitationToken,
      type: 'CLINIC_JOIN',
      status: 'PENDING',
      clinic: { id: clinicId },
      role: { id: roleId },
      user: { id: userId },
    });
    await this.invitationRepository.save(invitation);

    const frontendUrl = process.env.FRONTEND_URL;
    const inviteLink = `${frontendUrl}/accept-invite?token=${invitationToken}`;

    await this.notificationsService.sendEmail(
      user!.email,
      `Invitación de la clínica ${clinic.name}`,
      `Has sido invitado a unirte a ${clinic.name}. Haz clic aquí: ${inviteLink}`,
      undefined,
      [],
      ip,
      {
        type: 'clinic-invitation',
        clinicName: clinic.name,
        inviteLink: inviteLink,
        userName: user?.name,
      },
      userId,
    );

    return { message: 'Invitación enviada correctamente' };
  }

  async acceptInvitation(token: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { token, status: 'PENDING' },
      relations: ['clinic', 'role', 'user'],
    });

    if (!invitation) {
      throw new NotFoundException(
        'La invitación no es válida, ya fue usada o ha expirado.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      invitation.status = 'ACCEPTED';
      invitation.responsiveAt = new Date();
      await queryRunner.manager.save(invitation);

      const newMember = queryRunner.manager.create(UserClinicRole, {
        user: invitation.user,
        clinic: invitation.clinic,
        role: invitation.role,
      });
      await queryRunner.manager.save(newMember);

      await queryRunner.commitTransaction();

      return {
        message: 'Invitación aceptada con éxito',
        clinic: invitation.clinic.name,
        role: invitation.role.type,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Error al procesar la aceptación de la invitación.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateMemberRole(clinicId: string, userId: string, newRoleId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: newRoleId },
    });
    if (!role) {
      throw new NotFoundException('El rol especificado no existe.');
    }

    const membership = await this.userClinicRoleRepository.findOne({
      where: {
        clinic: { id: clinicId },
        user: { id: userId },
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new NotFoundException('El usuario no es miembro de esta clínica.');
    }
    if (membership.role.type === 'OWNER' && role.type !== 'OWNER') {
      throw new ConflictException(
        'No se puede cambiar el rol del dueño de la clínica desde este apartado.',
      );
    }

    membership.role = role;
    await this.userClinicRoleRepository.save(membership);

    return {
      message: `Rol actualizado correctamente a: ${role.type}`,
      userId,
      newRole: role.type,
    };
  }

  async removeMember(clinicId: string, userId: string) {
    const membership = await this.userClinicRoleRepository.findOne({
      where: {
        clinic: { id: clinicId },
        user: { id: userId },
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new NotFoundException('El usuario no pertenece a esta clínica.');
    }

    if (membership.role.type === 'OWNER') {
      throw new ConflictException(
        'No se puede eliminar al dueño de la clínica. Debe transferir la propiedad primero o eliminar la clínica.',
      );
    }

    await this.userClinicRoleRepository.remove(membership);

    return {
      message: 'Miembro eliminado exitosamente. El acceso ha sido revocado.',
      clinicId,
      removedUserId: userId,
    };
  }

  async toggleClinicStatus(clinicId: string, status: boolean) {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException('La clínica no existe.');
    }
    clinic.isActive = status;
    await this.clinicRepository.save(clinic);

    const action = status ? 'reabierta' : 'cerrada temporalmente';

    return {
      message: `La clínica ha sido ${action} con éxito.`,
      clinicId: clinic.id,
      isActive: clinic.isActive,
    };
  }

  async deleteClinic(clinicId: string, ownerId: string, password: string) {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
    });
    if (!clinic) throw new NotFoundException('La clínica no existe.');

    if (clinic.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Solo el dueño puede eliminar permanentemente la clínica.',
      );
    }

    const isPasswordValid = await this.usersService.validatePassword(
      ownerId,
      password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Contraseña incorrecta. No se pudo confirmar la eliminación.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.remove(clinic);

      await queryRunner.commitTransaction();
      return {
        message:
          'Clínica y todos sus datos asociados han sido eliminados permanentemente.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('ERROR REAL DE TYPEORM:', error);

      throw new InternalServerErrorException(
        `Error al eliminar la clínica: ${error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getClinicDetails(id: string) {
    const clinic = await this.clinicRepository.findOne({
      where: { id, isActive: true },
      relations: ['owner'],
      select: {
        id: true,
        name: true,
        logoURL: true,
        description: true,
        privacy: true,
        workingHours: true,
        isActive: true,
        createdAt: true,
        owner: {
          name: true,
          avatarURl: true,
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('La clínica no existe o está inactiva.');
    }

    return clinic;
  }

  async uploadLogo(clinicId: string, file: Express.Multer.File) {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
    });
    if (!clinic) throw new NotFoundException('Clínica no encontrada');

    if (clinic.logoURL) {
      await this.minioService.deleteFile(clinic.logoURL);
    }

    const logoURL = await this.minioService.uploadFile(file, 'logos');

    clinic.logoURL = logoURL;
    await this.clinicRepository.save(clinic);

    return {
      message: 'Logo actualizado con éxito',
      logoURL,
    };
  }

  async updateWorkingHours(
    clinicId: string,
    newHours: UpdateWorkingHoursDto,
    ownerId: string,
  ) {
    const clinic = await this.clinicRepository.findOne({
      where: {
        id: clinicId,
        ownerId,
      },
    });

    if (!clinic) throw new NotFoundException('Clínica no encontrada');

    clinic.workingHours = {
      ...(clinic.workingHours || {}),
      ...newHours,
    };

    await this.clinicRepository.save(clinic);

    return {
      message: 'Horarios actualizados parcialmente con éxito',
      workingHours: clinic.workingHours,
    };
  }

  async addService(clinicId: string, owner: any, dto: CreateServiceDto) {
    const ownerId = typeof owner === 'object' ? owner.id : owner;

    const clinic = await this.clinicRepository.findOne({
      where: {
        id: clinicId,
        ownerId: ownerId,
      },
    });

    if (!clinic) {
      throw new NotFoundException(
        'Clínica no encontrada o no tienes permisos.',
      );
    }

    const newService = this.serviceRepository.create({
      ...dto,
      clinicId,
    });

    return await this.serviceRepository.save(newService);
  }

  async uploadServiceIcon(
    serviceId: string,
    owner: any,
    icon: Express.Multer.File,
  ) {
    const ownerId = typeof owner === 'object' ? owner.id : owner;

    const service = await this.serviceRepository.findOne({
      where: {
        id: serviceId,
        clinic: { ownerId: ownerId },
      },
      relations: ['clinic'],
    });

    if (!service) {
      throw new NotFoundException(
        'Servicio no encontrado o no tienes permisos.',
      );
    }

    if (service.icon_URL) {
      await this.minioService.deleteFile(service.icon_URL);
    }

    const iconURL = await this.minioService.uploadFile(icon, 'services');

    service.icon_URL = iconURL;
    await this.serviceRepository.save(service);

    return {
      message: 'Ícono del servicio actualizado con éxito',
      iconURL,
    };
  }

  async updatePrivacy(clinicId: string, owner: any, privacy: ClinicPrivacy) {
    const ownerId = typeof owner === 'object' ? owner.id : owner;

    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId, ownerId },
    });

    if (!clinic) {
      throw new NotFoundException(
        'Clínica no encontrada o no tienes permisos.',
      );
    }

    clinic.privacy = privacy;
    await this.clinicRepository.save(clinic);

    return {
      message: `La clínica ahora es ${privacy === ClinicPrivacy.PUBLIC ? 'Pública' : 'Privada'}`,
      privacy: clinic.privacy,
    };
  }

}
