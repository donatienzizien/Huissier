import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
    return this.transporter;
  }

  // N'échoue jamais bruyamment : un email qui ne part pas ne doit jamais
  // faire échouer l'action métier qui l'a déclenché (création de relance,
  // rappel d'agenda, envoi d'acte...). L'erreur est journalisée pour
  // investigation.
  async envoyer(
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    if (!process.env.SMTP_HOST) {
      this.logger.warn(
        `SMTP non configuré — email à ${to} ("${subject}") non envoyé (voir backend/.env : SMTP_HOST).`,
      );
      return false;
    }
    try {
      await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        html,
        attachments,
      });
      return true;
    } catch (err) {
      this.logger.error(`Échec d'envoi email à ${to} : ${(err as Error).message}`);
      return false;
    }
  }
}
