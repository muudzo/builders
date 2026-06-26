import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  // Security headers. crossOriginResourcePolicy relaxed so the Vite dev client can reach the API.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // CORS allowlist — credentials enabled for the httpOnly refresh cookie.
  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173',
    credentials: true,
  });

  // Reject unknown / invalid input at the boundary; never trust the client.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(config.get('PORT') ?? 3001);
  await app.listen(port);
  Logger.log(`Vaka API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
