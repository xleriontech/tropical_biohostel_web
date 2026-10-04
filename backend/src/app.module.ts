import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { AdsModule } from './ads/ads.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule as SiteConfigModule } from './config/config.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReservasModule } from './reservas/reservas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { CalendarioModule } from './calendario/calendario.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { ChatModule } from './chat/chat.module';
import { RagModule } from './rag/rag.module';
import { DonacionesModule } from './donaciones/donaciones.module';
import { RepoModule } from './repo/repo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    PropertiesModule,
    SearchModule,
    AiModule,
    UploadModule,
    AdminModule,
    AdsModule,
    SiteConfigModule,
    ReviewsModule,
    ReservasModule,
    NotificacionesModule,
    IngestionModule,
    CalendarioModule,
    IntegracionesModule,
    ChatModule,
    RagModule,
    DonacionesModule,
    RepoModule,
  ],
})
export class AppModule {}
