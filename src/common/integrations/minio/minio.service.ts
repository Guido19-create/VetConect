import {
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);

  private readonly bucketName: string = process.env.MINIO_BUCKET || 'tuapostille-uploads';
  private readonly publicUrl: string = process.env.MINIO_PUBLIC_URL || 'https://s3-dev.tuapostille.com';

  constructor() {
    if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ROOT_USER) {
      this.logger.error(
        'ATENCIÓN: Faltan variables de entorno para configurar MinIO',
      );
    }

    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || '',
      port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ROOT_USER || '',
      secretKey: process.env.MINIO_ROOT_PASSWORD || '',
    });
  }

  async onModuleInit() {
    await this.ensureBucketConfigured();
  }

  private async ensureBucketConfigured() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Bucket "${this.bucketName}" creado exitosamente.`);
      }

      await this.setBucketPublic(this.bucketName);
    } catch (error) {
      this.logger.error(`Error configurando bucket MinIO: ${error.message}`);
    }
  }

  async setBucketPublic(bucketName: string) {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetBucketLocation', 's3:ListBucket'],
          Resource: [`arn:aws:s3:::${bucketName}`],
        },
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };
    await this.minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const cleanFileName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    const filePath = `${folder}/${uuid()}-${cleanFileName}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        filePath,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      return `${this.publicUrl}/${this.bucketName}/${filePath}`;
    } catch (error) {
      this.logger.error(`Error subiendo archivo a MinIO: ${error.message}`);
      throw new InternalServerErrorException(
        'No se pudo completar la carga del archivo.',
      );
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const searchPattern = `${this.bucketName}/`;
      const urlParts = fileUrl.split(searchPattern);

      if (urlParts.length < 2) return;

      const filePath = urlParts[1];
      await this.minioClient.removeObject(this.bucketName, filePath);
      this.logger.log(`Archivo eliminado de MinIO: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error al eliminar archivo de MinIO: ${error.message}`);
    }
  }
}
