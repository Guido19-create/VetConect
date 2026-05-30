import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Clinic } from '../entities/clinic.entity'; 
import { Role } from '../../roles/entities/role.entity'; 
import { UserClinicRole } from '../entities/user-clinic-role.entity'; 

@Injectable()
export class ClinicSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ClinicSeedService.name);

  constructor(
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    await this.seedClinics();
  }

  private async seedClinics() {
    this.logger.log('Comprobando base de datos para el seed de clínicas...');

    const alreadySeeded = await this.clinicRepository.findOne({
      where: { name: 'Clínica Veterinaria San Roque 1' },
    });

    if (alreadySeeded) {
      this.logger.log('Las clínicas de prueba ya fueron creadas anteriormente. Seed omitido.');
      return;
    }

    const ownerRole = await this.roleRepository.findOne({
      where: { type: 'ADMIN' },
    });

    if (!ownerRole) {
      this.logger.error('Seed abortado: El rol ADMIN no existe en la base de datos.');
      return;
    }

    // ⚠️ Recuerda cambiar este string por un ID real existente en tu tabla de usuarios de PostgreSQL
    const DEFAULT_OWNER_ID ="cbc0ad7d-ac9a-477e-8a84-1972a4e0ef34";

    this.logger.log('Iniciando la creación de 50 clínicas...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 1; i <= 50; i++) {
        // 🛠️ CORRECCIÓN: Pasamos los valores del enum en minúsculas ('public' / 'private')
        const clinicData = {
          name: `Clínica Veterinaria San Roque ${i}`,
          address: `Calle Falsa ${100 + i}, Ciudad Médica, Bloque ${i}`,
          description: `Centro médico veterinario automatizado número ${i}. Especialistas en salud animal integral y urgencias 24/7.`,
          privacy: i % 2 === 0 ? 'public' : 'private', 
          isActive: true,
          ownerId: DEFAULT_OWNER_ID,
        } as any;

        const clinic = queryRunner.manager.create(Clinic, clinicData);
        const savedClinic = await queryRunner.manager.save(clinic);

        const userClinicRole = queryRunner.manager.create(UserClinicRole, {
          user: { id: DEFAULT_OWNER_ID } as any, 
          clinic: savedClinic,
          role: ownerRole,
        });
        await queryRunner.manager.save(userClinicRole);
      }

      await queryRunner.commitTransaction();
      this.logger.log('🎉 ¡Se han creado exitosamente 50 clínicas!');

    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('❌ Error ejecutando el seed de clínicas:', error?.message || error);
    } finally {
      await queryRunner.release();
    }
  }
}