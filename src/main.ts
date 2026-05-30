import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './redis-io.adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('VetConnect-Main');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService   );

  // 1. EL PREFIJO VA PRIMERO
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // 2. CONFIGURACIÓN DE VALIDACIÓN
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. CONFIGURACIÓN DE SWAGGER
  const config = new DocumentBuilder()
    .setTitle('VetConnect API')
    .setDescription('Documentación de la plataforma veterinaria')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa el token JWT',
        in: 'header',
      },
      'Bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API corriendo en: http://localhost:${port}/${globalPrefix}`);
  logger.log(
    `📝 Swagger disponible en: http://localhost:${port}/${globalPrefix}/docs`,
  );
}
bootstrap();
