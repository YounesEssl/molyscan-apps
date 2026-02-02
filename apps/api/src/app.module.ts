import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ScansModule } from './scans/scans.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExportsModule } from './exports/exports.module';
import { VoiceNotesModule } from './voice-notes/voice-notes.module';
import { OcrModule } from './ocr/ocr.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    ScansModule,
    WorkflowsModule,
    ChatModule,
    NotificationsModule,
    ExportsModule,
    VoiceNotesModule,
    OcrModule,
    StorageModule,
    HealthModule,
  ],
})
export class AppModule {}
