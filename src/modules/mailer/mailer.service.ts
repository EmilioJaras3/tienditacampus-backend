import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports (587)
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false, // Utilitario para despliegue
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}: ${error.message}`);
      return false;
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const subject = 'CÃ³digo de VerificaciÃ³n - TienditaCampus';
    const text = `Tu cÃ³digo de verificaciÃ³n es: ${code}. Expira en 10 minutos.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">VerificaciÃ³n de Seguridad</h2>
        <p>Has intentado iniciar sesiÃ³n en <strong>TienditaCampus</strong>.</p>
        <p>Usa el siguiente cÃ³digo para completar tu acceso:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #6b7280;">Este cÃ³digo expira en 10 minutos. Si no has sido tÃº, por favor ignora este mensaje.</p>
      </div>
    `;

    return this.sendMail(to, subject, text, html);
  }
}
