import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor(private readonly configService: ConfigService) {
        this.initTransporter();
    }

    private initTransporter() {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT', 587);
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.logger.log(`Transporte SMTP configurado: ${host}:${port}`);
        } else {
            this.logger.warn(
                'Variables SMTP no configuradas — los códigos 2FA se imprimirán en consola',
            );
        }
    }

    /**
     * Envía el código 2FA por correo electrónico.
     * Si no hay SMTP configurado, imprime el código en consola (modo desarrollo).
     */
    async send2faCode(email: string, code: string): Promise<void> {
        const subject = 'TienditaCampus — Código de verificación';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 2px solid #1a1a1a; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #1a1a1a; color: #fff; padding: 8px 16px; font-weight: bold; font-size: 14px;">TC</div>
                    <span style="font-weight: bold; font-size: 18px; margin-left: 8px;">TienditaCampus</span>
                </div>
                <h2 style="text-align: center; color: #1a1a1a; margin-bottom: 16px;">Código de Verificación</h2>
                <p style="text-align: center; color: #555; font-size: 14px;">
                    Usa el siguiente código para completar tu inicio de sesión:
                </p>
                <div style="text-align: center; margin: 24px 0;">
                    <span style="display: inline-block; background: #f5f5f5; border: 2px solid #1a1a1a; padding: 16px 32px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 12px;">
                        ${code}
                    </span>
                </div>
                <p style="text-align: center; color: #888; font-size: 12px;">
                    Este código expira en <strong>10 minutos</strong>.<br/>
                    Si no solicitaste este código, ignora este mensaje.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="text-align: center; color: #aaa; font-size: 11px;">
                    TienditaCampus — Universidad Politécnica de Chiapas
                </p>
            </div>
        `;

        if (this.transporter) {
            try {
                const from = this.configService.get<string>(
                    'SMTP_FROM',
                    'TienditaCampus <noreply@tienditacampus.com>',
                );

                await this.transporter.sendMail({
                    from,
                    to: email,
                    subject,
                    html,
                });
                this.logger.log(`Código 2FA enviado a ${email}`);
            } catch (error) {
                this.logger.error(`Error al enviar email a ${email}: ${error.message}`);
                // Fallback: imprimir en consola
                this.logger.warn(`[FALLBACK] Código 2FA para ${email}: ${code}`);
            }
        } else {
            // Modo desarrollo: imprimir en consola
            this.logger.warn(`[DEV MODE] Código 2FA para ${email}: ${code}`);
        }
    }
}
