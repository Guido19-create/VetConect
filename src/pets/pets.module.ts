import { Module } from '@nestjs/common';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pet } from './entities/pet.entity';
import { UsersModule } from '../users/users.module';
import { MinioModule } from '../common/integrations/minio/minio.module';
import { MedicalRecord } from './entities/medical-record.entity';
import { Vaccination } from './entities/vaccination.entity';
import { Deworming } from './entities/deworming.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pet, MedicalRecord, Vaccination, Deworming]),
    UsersModule,
    MinioModule,
  ],
  controllers: [PetsController],
  providers: [PetsService],
  exports:[TypeOrmModule]
})
export class PetsModule {}
