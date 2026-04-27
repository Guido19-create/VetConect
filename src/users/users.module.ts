import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { OtpModule } from '../otp/otp.module';
import { MinioModule } from '../common/integrations/minio/minio.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), OtpModule, MinioModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
