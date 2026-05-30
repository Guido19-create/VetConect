import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clinic } from './entities/clinic.entity';
import { UserClinicRole } from './entities/user-clinic-role.entity';
import { RolesModule } from '../roles/roles.module';
import { ClinicInvitation } from './entities/invitations.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { MinioModule } from '../common/integrations/minio/minio.module';
import { Service } from './entities/service.entity';
import { ClinicSeedService } from './seeds/clinic.seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Clinic, UserClinicRole, ClinicInvitation,Service]),
    RolesModule,
    NotificationsModule,
    UsersModule,
    MinioModule
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService,ClinicSeedService],
  exports: [TypeOrmModule],
})
export class ClinicsModule {} 
