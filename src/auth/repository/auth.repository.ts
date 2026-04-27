import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity'; 

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async createRefreshToken(data: {
    refreshToken: string;
    userId: string;
    divice_id: string;
    expiresAt: Date;
    ipAddress?: string;
  }): Promise<RefreshToken> {
    const token = this.refreshTokenRepo.create(data);
    return this.refreshTokenRepo.save(token);
  }

  async findRefreshToken(
    refreshToken: string,
    deviceId: string,
  ): Promise<RefreshToken | null> {
    const datos = await this.refreshTokenRepo.findOne({
      where: {
        refreshToken: refreshToken,
        divice_id: deviceId,
      },
      relations: ['user'],
    });
    return datos;
  }

  async findTokenById(id: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async updateRefreshToken(data: {
    oldDeviceId: string;
    newDiviceId: string;
    newRefreshToken: string;
    oldRefreshToken: string;
    expiresAt: Date;
    ipAddress?: string;
  }): Promise<void> {
    await this.refreshTokenRepo.update(
      {
        divice_id: data.oldDeviceId,
        refreshToken: data.oldRefreshToken,
      },
      {
        refreshToken: data.newRefreshToken,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        divice_id: data.newDiviceId,
      },
    );
  }

  async deleteRefreshToken(divice_id: string): Promise<boolean> {
    try {
      const result = await this.refreshTokenRepo.delete({
        divice_id: divice_id,
      });

      if (result.affected === undefined || result.affected === null) {
        return false;
      }

      return result.affected > 0;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error interno al eliminar el token de refresco',
      );
    }
  }
}
