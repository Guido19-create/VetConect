import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { User } from '../users/entities/user.entity';
import { ReplyRatingDto } from './dto/reply-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
  ) {}

  async create(dto: CreateRatingDto, user: User) {
    const existingRating = await this.ratingRepository.findOne({
      where: {
        Usersid: user.id,
        Clinicsid: dto.clinicsId,
      },
    });

    if (existingRating) {
      throw new BadRequestException(
        'Ya has valorado a esta clínica anteriormente.',
      );
    }

    const newRating = this.ratingRepository.create({
      punctuation: dto.punctuation,
      comment: dto.comment,
      Clinicsid: dto.clinicsId,
      Usersid: user.id,
    });

    return await this.ratingRepository.save(newRating);
  }

  async getClinicPublicProfile(clinicId: string) {
    const stats = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.punctuation)', 'average')
      .addSelect('COUNT(rating.id)', 'total')
      .where('rating.Clinicsid = :clinicId', { clinicId })
      .getRawOne();

    const reviews = await this.ratingRepository.find({
      where: { Clinicsid: clinicId },
      relations: ['user'],
      select: {
        id: true,
        punctuation: true,
        comment: true,
        createAt: true,
        user: {
          name: true,
          avatarURl: true,
        },
      },
      order: { createAt: 'DESC' },
    });

    return {
      averagePunctuation: parseFloat(stats.average || 0).toFixed(1), // Ejemplo: "4.5"
      totalRatings: parseInt(stats.total || 0),
      reviews: reviews,
    };
  }

  async replyToRating(ratingId: number, dto: ReplyRatingDto, user: User) {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) throw new NotFoundException('Valoración no encontrada.');

    const isStaff = user.clinicRoles?.some(
      (role) => role.clinicId === rating.Clinicsid && role.isActive,
    );

    if (!isStaff) {
      throw new ForbiddenException(
        'No tienes permiso para responder en nombre de esta clínica.',
      );
    }

    rating.reply = dto.reply;
    rating.replyAt = new Date();

    return await this.ratingRepository.save(rating);
  }

  async getClinicRatingSummary(clinicId: string) {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.punctuation)', 'average')
      .addSelect('COUNT(rating.id)', 'count')
      .where('rating.Clinicsid = :clinicId', { clinicId })
      .getRawOne();

    const average = result.average ? parseFloat(result.average) : 0;
    const total = result.count ? parseInt(result.count) : 0;

    return {
      clinicId,
      averageScore: Number(average.toFixed(1)),
      totalRatings: total,
      starsLabel: `${average.toFixed(1)} / 5.0`,
    };
  }
}
