import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/security/jwt-auth.guard';
import { RolesGuard } from './common/security/roles.guard';

// Feature modules (built by Agent A) — wired in during integration:
import { PermitsModule } from './permits/permits.module';
import { PaymentsModule } from './payments/payments.module';
import { InspectionsModule } from './inspections/inspections.module';
import { RegistryModule } from './registry/registry.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CertificatesModule } from './certificates/certificates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    PermitsModule,
    PaymentsModule,
    InspectionsModule,
    RegistryModule,
    DashboardModule,
    CertificatesModule,
  ],
  providers: [
    // Order matters: throttle first, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
