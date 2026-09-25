import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import * as Handlebars from 'handlebars';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;

  async onModuleInit() {
    await this.demarrerNavigateur();
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => undefined);
  }

  private async demarrerNavigateur(): Promise<Browser> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    browser.on('disconnected', () => {
      this.logger.warn(
        'Instance Chromium deconnectee (fermeture inattendue) — sera relancee automatiquement a la prochaine generation.',
      );
      if (this.browser === browser) this.browser = null;
    });
    this.browser = browser;
    this.logger.log('Instance Chromium (Puppeteer) demarree pour la generation de PDF.');
    return browser;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    return this.demarrerNavigateur();
  }

  // Fusionne le gabarit HTML (Handlebars) avec les donnees de l'acte, puis
  // convertit le resultat en PDF A4 imprimable.
  async genererPdf(templateHtml: string, data: Record<string, unknown>): Promise<Buffer> {
    const compiled = Handlebars.compile(templateHtml, { noEscape: false });
    const html = compiled(data);
    return this.genererPdfDepuisHtml(html);
  }

  // Convertit un HTML DEJA RENDU (aucune fusion Handlebars) en PDF -
  // utilise pour les actes valides depuis le workflow de validation, ou le
  // corps a deja ete edite librement par l'utilisateur et ne doit plus
  // etre repasse dans le moteur de gabarit.
  async genererPdfDepuisHtml(html: string): Promise<Buffer> {
    let derniereErreur: unknown;
    for (let tentative = 1; tentative <= 2; tentative++) {
      const browser = await this.getBrowser();
      try {
        const page = await browser.newPage();
        try {
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
          });
          return Buffer.from(buffer);
        } finally {
          await page.close().catch(() => undefined);
        }
      } catch (err) {
        derniereErreur = err;
        this.browser = null;
        if (tentative < 2) {
          this.logger.warn(
            `Echec de generation PDF (tentative ${tentative}/2), nouvel essai avec Chromium relance : ${(err as Error).message}`,
          );
        }
      }
    }
    throw derniereErreur;
  }
}
