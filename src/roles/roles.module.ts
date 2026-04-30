import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RolesSeeder } from './seeders/roles.seeder';

@Module({
  imports:[TypeOrmModule.forFeature([Role])],
  controllers: [RolesController],
  providers: [RolesService,RolesSeeder],
  exports:[TypeOrmModule]
})
export class RolesModule {}
