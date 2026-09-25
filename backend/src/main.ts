import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Le CORS ne peut pas se limiter a une liste fixe d'origines : chaque
// cabinet est servi sur son propre sous-domaine (multi-tenant), genere
// dynamiquement a la creation du cabinet. On autorise donc :
//   - les origines listees explicitement dans CORS_ORIGIN (ex: le portail
//     Super Admin, un domaine racine sans sous-domaine)
//   - tout sous-domaine se terminant par un des suffixes listes dans
//     CORS_ALLOWED_SUFFIXES (ex: .localhost:5173 en dev, .loginet-huissiers.com en prod)
// Sans configuration (dev sans .env complet), on retombe sur origin: true
// avec un avertissement, pour ne jamais bloquer silencieusement le devloppement.
function buildCorsOrigin() {
  const listeExacte = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const suffixes = (process.env.CORS_ALLOWED_SUFFIXES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (listeExacte.length === 0 && suffixes.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      'ATTENTION : CORS_ORIGIN et CORS_ALLOWED_SUFFIXES ne sont pas definis - ' +
        'toutes les origines sont acceptees. A corriger avant la mise en production.',
    );
    return true;
  }

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Requetes sans en-tete Origin (ex: appels serveur a serveur, curl,
    // certains clients mobiles) : on les laisse passer, elles ne sont de
    // toute facon pas soumises a la politique CORS du navigateur.
    if (!origin) return callback(null, true);

    if (listeExacte.includes(origin)) return callback(null, true);
    if (suffixes.some((suffixe) => origin.endsWith(suffixe))) return callback(null, true);

    callback(new Error(`Origine non autorisee par CORS : ${origin}`), false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: buildCorsOrigin(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`LOGINET Huissiers API demarree sur le port ${port}`);
}
bootstrap();
