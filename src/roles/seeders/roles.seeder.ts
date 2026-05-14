import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RolesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(RolesSeeder.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onApplicationBootstrap() {
    await this.run();
  }

  async run() {
    const rolesToCreate = ['OWNER', 'ADMIN', 'VETERINARIAN', 'RECEPTIONIST','USER','SUPERADMIN'];

    this.logger.log('Iniciando el seeding de roles...');

    try {
      await Promise.all(
        rolesToCreate.map(async (type) => {
          const roleExists = await this.roleRepository.findOne({ where: { type } });
          
          if (!roleExists) {
            const role = this.roleRepository.create({ type });
            await this.roleRepository.save(role);
            this.logger.debug(`[SEED] Rol creado: ${type}`);
          }
        }),
      );

      this.logger.log('Seeding de roles finalizado correctamente.');
    } catch (error) {
      this.logger.error(`Error durante el seeding: ${error}`);
    }
  }
}