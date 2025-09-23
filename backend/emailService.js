// backend/emailService.js - Servicio de notificaciones por email
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Configuración para Gmail (gratis hasta 500 emails/día)
        this.transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // tu-email@gmail.com
                pass: process.env.EMAIL_PASS  // contraseña de aplicación
            }
        });
    }

    // Enviar notificación cuando encuentren mascota
    async sendPetFoundNotification(petData, scanData) {
        try {
            const { pet, owner } = petData;
            const { latitude, longitude, address, finder_phone } = scanData;

            const mapUrl = latitude && longitude 
                ? `https://maps.google.com/maps?q=${latitude},${longitude}`
                : null;

            const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🎉 ¡${pet.name} ha sido encontrado!</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333;">📍 Información del hallazgo:</h2>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p><strong>🕐 Fecha y hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
                            
                            ${address ? `<p><strong>📍 Ubicación:</strong> ${address}</p>` : ''}
                            
                            ${mapUrl ? `
                                <p><strong>🗺️ Ver en mapa:</strong> 
                                    <a href="${mapUrl}" style="color: #667eea;">Abrir en Google Maps</a>
                                </p>
                            ` : ''}
                            
                            ${finder_phone ? `
                                <p><strong>📞 Teléfono del rescatista:</strong> 
                                    <a href="tel:${finder_phone}" style="color: #667eea;">${finder_phone}</a>
                                </p>
                            ` : ''}
                        </div>

                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333;">🐕 Información de ${pet.name}:</h3>
                            <p><strong>Especie:</strong> ${pet.species === 'dog' ? '🐕 Perro' : '🐱 Gato'}</p>
                            <p><strong>Color:</strong> ${pet.color}</p>
                            <p><strong>Sexo:</strong> ${pet.sex}</p>
                            ${pet.breed ? `<p><strong>Raza:</strong> ${pet.breed}</p>` : ''}
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <p style="font-size: 18px; color: #333;">
                                🙏 <strong>¡Contacta al rescatista lo antes posible!</strong>
                            </p>
                            
                            ${finder_phone ? `
                                <a href="tel:${finder_phone}" 
                                   style="background: #28a745; color: white; padding: 15px 30px; 
                                          text-decoration: none; border-radius: 25px; display: inline-block; 
                                          margin: 10px;">
                                    📞 Llamar ahora: ${finder_phone}
                                </a>
                            ` : ''}
                        </div>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <p style="color: #666; font-size: 14px;">
                                Powered by <strong>Pet Registry System</strong><br>
                                Esta notificación se envió automáticamente cuando alguien escaneó el código QR de ${pet.name}.
                            </p>
                        </div>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: owner.email,
                subject: `🎉 ¡${pet.name} ha sido encontrado! - Pet Registry`,
                html: emailContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email enviado:', info.messageId);
            
            return {
                success: true,
                messageId: info.messageId
            };

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Enviar email de bienvenida al registrar mascota
    async sendWelcomeEmail(userData) {
        try {
            const { owner, pet, qr_url } = userData;

            const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🐕 ¡Bienvenido a Pet Registry!</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333;">¡Hola ${owner.name}!</h2>
                        
                        <p>¡Gracias por registrar a <strong>${pet.name}</strong> en nuestro sistema!</p>

                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333;">📋 Resumen del registro:</h3>
                            <p><strong>Mascota:</strong> ${pet.name}</p>
                            <p><strong>Especie:</strong> ${pet.species === 'dog' ? '🐕 Perro' : '🐱 Gato'}</p>
                            <p><strong>Color:</strong> ${pet.color}</p>
                            <p><strong>Código QR:</strong> ${pet.qr_code}</p>
                        </div>

                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333;">📱 Próximos pasos:</h3>
                            <ol>
                                <li>Descarga e imprime el código QR desde tu cuenta</li>
                                <li>Colócalo en el collar de ${pet.name}</li>
                                <li>¡Listo! Ahora ${pet.name} está protegido</li>
                            </ol>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${qr_url}" 
                               style="background: #667eea; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 25px; display: inline-block;">
                                🔗 Ver perfil de ${pet.name}
                            </a>
                        </div>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <p style="color: #666; font-size: 14px;">
                                Si tienes alguna duda, responde a este email.<br>
                                <strong>Pet Registry System</strong> - Protegiendo a las mascotas con tecnología
                            </p>
                        </div>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: owner.email,
                subject: `🎉 ¡${pet.name} registrado exitosamente! - Pet Registry`,
                html: emailContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de bienvenida enviado:', info.messageId);
            
            return {
                success: true,
                messageId: info.messageId
            };

        } catch (error) {
            console.error('❌ Error enviando email de bienvenida:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verificar configuración del servicio
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Servicio de email configurado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error en configuración de email:', error.message);
            return false;
        }
    }
}

module.exports = EmailService;