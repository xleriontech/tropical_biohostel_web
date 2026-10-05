import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Archivos subidos desde el PC (cuando R2 no está configurado)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.setGlobalPrefix('api');

  // Orígenes permitidos: lista configurable (separada por comas) +
  // localhost, red local (192.168.x.x, 10.x, 172.16-31.x) y túneles
  // de Cloudflare. Así el sitio funciona por localhost, IP LAN y URL pública.
  const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true); // curl, Postman, server-to-server
      if (configuredOrigins.includes(origin)) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      if (/^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return callback(null, true);
      // Frontends oficiales (Cloudflare Pages producción y previews, Netlify)
      if (/^https:\/\/([a-z0-9-]+\.)?tropicalbiohostel\.pages\.dev$/.test(origin)) return callback(null, true);
      if (/^https:\/\/([a-z0-9-]+\.)?tropicalbiohostel\.netlify\.app$/.test(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Plataforma Inteligente de Turismo')
    .setDescription('API para búsqueda inteligente de alojamientos turísticos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
