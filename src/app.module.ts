import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ReportDao } from './dao/report.dao';
import { GlobalExceptionHandler } from './common/GlobalExceptionHandler';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ReportDao,
    { provide: APP_FILTER, useClass: GlobalExceptionHandler },
  ],
})
export class AppModule {}
