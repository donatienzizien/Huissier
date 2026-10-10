import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { AuthModule } from './auth/auth.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { UsersModule } from './users/users.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { ClientsModule } from './clients/clients.module';
import { PdfModule } from './pdf/pdf.module';
import { ModelesActesModule } from './modeles-actes/modeles-actes.module';
import { ActesModule } from './actes/actes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertesModule } from './alertes/alertes.module';
import { FacturationModule } from './facturation/facturation.module';
import { AgendaModule } from './agenda/agenda.module';
import { RapportsModule } from './rapports/rapports.module';
import { PiecesJointesModule } from './pieces-jointes/pieces-jointes.module';
import { PortailClientModule } from './portail-client/portail-client.module';
import { RecouvrementModule } from './recouvrement/recouvrement.module';
import { AgendaNotificationsModule } from './agenda-notifications/agenda-notifications.module';
import { RelancesAutomatiquesModule } from './relances-automatiques/relances-automatiques.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    TenantModule,
    AuthModule,
    CabinetsModule,
    UsersModule,
    DossiersModule,
    ClientsModule,
    PdfModule,
    ModelesActesModule,
    ActesModule,
    NotificationsModule,
    AlertesModule,
    FacturationModule,
    AgendaModule,
    RapportsModule,
    PiecesJointesModule,
    PortailClientModule,
    RecouvrementModule,
    AgendaNotificationsModule,
    RelancesAutomatiquesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}