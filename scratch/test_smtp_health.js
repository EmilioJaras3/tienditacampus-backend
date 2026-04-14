const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde el backend
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSMTP() {
    console.log('--- Iniciando Prueba de Salud SMTP ---');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Verificando conexión...');
        await transporter.verify();
        console.log('✅ Conexión SMTP exitosa');

        const mailOptions = {
            from: process.env.SMTP_FROM || 'TienditaCampus <noreply@tienditacampus.com>',
            to: process.env.SMTP_USER, // Enviarse un correo a sí mismo
            subject: 'Prueba de Salud SMTP — TienditaCampus',
            text: 'Si recibes este correo, la configuración SMTP es correcta.',
            html: '<b>✅ Prueba exitosa:</b> El sistema puede enviar correos correctamente.'
        };

        console.log('Enviando correo de prueba...');
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado: ${info.messageId}`);
        console.log('--- Prueba Finalizada con ÉXITO ---');
    } catch (error) {
        console.error('❌ Error en la prueba SMTP:', error);
    }
}

testSMTP();
