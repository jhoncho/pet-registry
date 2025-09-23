// ===========================================
// SERVIDOR COMPLETO PARA IDENTIFICACIÓN DE MASCOTAS
// ===========================================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// CONFIGURACIÓN DE MIDDLEWARE
// ===========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===========================================
// CONFIGURACIÓN DE BASE DE DATOS
// ===========================================
const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
        initializeDatabase();
    }
});

// Inicializar tablas
function initializeDatabase() {
    // Verificar tabla de mascotas existente
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='pets'", (err, row) => {
        if (err) {
            console.error('Error verificando tabla pets:', err);
        } else if (row) {
            console.log('Tabla pets encontrada');
        } else {
            console.log('Tabla pets no existe');
        }
    });

    // Tabla para ubicaciones de mascotas encontradas
    db.run(`
        CREATE TABLE IF NOT EXISTS pet_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy REAL,
            found_timestamp TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets (id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creando tabla pet_locations:', err);
        } else {
            console.log('Tabla pet_locations verificada/creada');
        }
    });

    // Tabla para notificaciones al propietario
    db.run(`
        CREATE TABLE IF NOT EXISTS pet_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            finder_name TEXT NOT NULL,
            finder_phone TEXT NOT NULL,
            finder_message TEXT,
            location_lat REAL,
            location_lng REAL,
            location_accuracy REAL,
            found_timestamp TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets (id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creando tabla pet_notifications:', err);
        } else {
            console.log('Tabla pet_notifications verificada/creada');
        }
    });

// Agregar columna pet_code si no existe
db.run('ALTER TABLE pets ADD COLUMN pet_code VARCHAR(20)', (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Columna pet_code ya existe');
        } else {
            console.error('Error agregando columna pet_code:', err);
        }
    } else {
        console.log('Columna pet_code agregada exitosamente');
    }
});
}

// ===========================================
// RUTA PRINCIPAL - PÁGINA DE REGISTRO
// ===========================================
app.get('/', (req, res) => {
    const registrationHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registro de Mascotas - Sistema de Identificación</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(45deg, #4ecdc4, #26d0ce);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 16px;
            opacity: 0.9;
        }

        .content {
            padding: 40px 30px;
        }

        .form-section {
            margin-bottom: 30px;
        }

        .form-section h2 {
            color: #495057;
            margin-bottom: 20px;
            font-size: 20px;
            border-bottom: 2px solid #4ecdc4;
            padding-bottom: 10px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
            font-size: 14px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
            background: white;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #4ecdc4;
            box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .submit-btn {
            background: linear-gradient(45deg, #4ecdc4, #26d0ce);
            color: white;
            border: none;
            padding: 18px 30px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(78, 205, 196, 0.4);
        }

        .submit-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4ecdc4;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .result {
            display: none;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            text-align: center;
        }

        .qr-container {
            margin: 20px 0;
            text-align: center;
        }

        .qr-code {
            max-width: 200px;
            height: auto;
            border: 3px solid #4ecdc4;
            border-radius: 10px;
            padding: 10px;
            background: white;
        }

        .pet-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #4ecdc4;
        }

        .download-links {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
            flex-wrap: wrap;
        }

        .download-btn {
            background: #007bff;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            transition: background 0.3s ease;
        }

        .download-btn:hover {
            background: #0056b3;
        }

        .info-box {
            background: #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 4px solid #6c757d;
        }

        .info-box h3 {
            color: #495057;
            margin-bottom: 10px;
        }

        .info-box ul {
            margin-left: 20px;
            color: #6c757d;
        }

        .info-box li {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Registro de Mascotas</h1>
            <p>Sistema de Identificación con QR y GPS</p>
        </div>

        <div class="content">
            <div class="info-box">
                <h3>Como funciona</h3>
                <ul>
                    <li>Registra los datos de tu mascota</li>
                    <li>Obtén un código QR único</li>
                    <li>Colócalo en el collar de tu mascota</li>
                    <li>Cualquier persona puede escanearlo</li>
                    <li>Recibes la ubicación GPS en tiempo real</li>
                    <li>Te contactan directamente</li>
                </ul>
            </div>

            <form id="petForm">
                <div class="form-section">
                    <h2>Información de la Mascota</h2>
                    
                    <div class="form-group">
                        <label for="name">Nombre de la Mascota *</label>
                        <input type="text" id="name" name="name" required placeholder="Ej: Buddy, Luna, Max">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="species">Especie *</label>
                            <select id="species" name="species" required>
                                <option value="">Selecciona la especie</option>
                                <option value="Perro">Perro</option>
                                <option value="Gato">Gato</option>
                                <option value="Conejo">Conejo</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="sex">Sexo *</label>
                            <select id="sex" name="sex" required>
                                <option value="">Selecciona el sexo</option>
                                <option value="Macho">Macho</option>
                                <option value="Hembra">Hembra</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="breed">Raza</label>
                            <select id="breed" name="breed">
                                <option value="">Primero selecciona una especie</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="color">Color *</label>
                            <input type="text" id="color" name="color" required placeholder="Ej: Dorado, Negro">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="age_years">Edad (Años)</label>
                            <input type="number" id="age_years" name="age_years" min="0" max="30" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label for="age_months">Edad (Meses)</label>
                            <input type="number" id="age_months" name="age_months" min="0" max="11" placeholder="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="sterilization_code">Código de Esterilización</label>
                        <input type="text" id="sterilization_code" name="sterilization_code" placeholder="Si está esterilizado, ingresa el código">
                    </div>
                </div>

                <div class="form-section">
                    <h2>Configuración de Alertas</h2>
                    
                    <div class="form-group">
                        <label for="whatsapp_number">Número de WhatsApp</label>
                        <input type="tel" id="whatsapp_number" name="whatsapp_number" placeholder="+591 XXXXXXXX">
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-weight: normal;">
                            <input type="checkbox" id="gps_alerts" name="gps_alerts" checked>
                            Alertas GPS
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-weight: normal;">
                            <input type="checkbox" id="alert_email" name="alert_email" checked>
                            Alertas por Email
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-weight: normal;">
                            <input type="checkbox" id="alert_whatsapp" name="alert_whatsapp" checked>
                            Alertas por WhatsApp
                        </label>
                    </div>
                </div>

                <button type="submit" class="submit-btn" id="submitBtn">
                    Registrar Mascota y Generar QR
                </button>
            </form>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Generando código QR único para tu mascota...</p>
            </div>

            <div class="result" id="result">
                <!-- Los resultados se mostrarán aquí -->
            </div>
        </div>
    </div>
   

    <script>

   // Función para cargar razas según especie
async function loadBreeds(species) {
    const breedContainer = document.querySelector('.form-group:has(#breed)');
    
    if (!species) {
        breedContainer.innerHTML = '<label for="breed">Raza</label><select id="breed" name="breed"><option value="">Primero selecciona una especie</option></select>';
        return;
    }
    
    if (species === 'Otro') {
        // Para "Otro", convertir a input text
        breedContainer.innerHTML = '<label for="breed">Raza</label><input type="text" id="breed" name="breed" placeholder="Ingresa la raza del animal">';
        return;
    }
    
    try {
        breedContainer.innerHTML = '<label for="breed">Raza</label><select id="breed" name="breed"><option value="">Cargando razas...</option></select>';
        
        const response = await fetch('/api/breeds/' + species);
        const data = await response.json();
        
        if (data.success) {
            let options = '<option value="">Selecciona una raza</option>';
            data.breeds.forEach(breed => {
                options += '<option value="' + breed.name + '">' + breed.name + '</option>';
            });
            breedContainer.innerHTML = '<label for="breed">Raza</label><select id="breed" name="breed">' + options + '</select>';
        } else {
            breedContainer.innerHTML = '<label for="breed">Raza</label><select id="breed" name="breed"><option value="">Error cargando razas</option></select>';
        }
    } catch (error) {
        console.error('Error cargando razas:', error);
        breedContainer.innerHTML = '<label for="breed">Raza</label><select id="breed" name="breed"><option value="">Error cargando razas</option></select>';
    }
}
        
        // Escuchar cambios en el campo especie
        document.getElementById('species').addEventListener('change', function() {
            loadBreeds(this.value);
        });

        document.getElementById('petForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            // Convertir checkboxes a booleanos
            data.gps_alerts = document.getElementById('gps_alerts').checked;
            data.alert_email = document.getElementById('alert_email').checked;
            data.alert_whatsapp = document.getElementById('alert_whatsapp').checked;
            
            // Mostrar loading
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('loading').style.display = 'block';
            document.getElementById('result').style.display = 'none';
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showResult(result);
                    this.reset(); // Limpiar formulario
                } else {
                    alert('Error: ' + result.error);
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión. Por favor, inténtalo nuevamente.');
            } finally {
                document.getElementById('submitBtn').disabled = false;
                document.getElementById('loading').style.display = 'none';
            }
        });
        
        function showResult(data) {
            const resultDiv = document.getElementById('result');
            const currentUrl = window.location.origin;
            const petUrl = \`\${currentUrl}/pet/\${data.petId}\`;
            
            resultDiv.innerHTML = \`
                <h3>¡Registro Exitoso!</h3>
                
                <div class="pet-info">
                    <h4>Información Registrada:</h4>
                    <p><strong>ID:</strong> \${data.petId}</p>
                    <p><strong>Mascota:</strong> \${data.pet.name} (\${data.pet.species})</p>
                    <p><strong>Sexo:</strong> \${data.pet.sex}</p>
                    <p><strong>Color:</strong> \${data.pet.color}</p>
                    <p><strong>URL Pública:</strong> <a href="\${petUrl}" target="_blank">\${petUrl}</a></p>
                </div>
                
                <div class="qr-container">
                    <h4>Tu Código QR:</h4>
                    <img src="\${data.qrCode}" alt="Código QR" class="qr-code">
                    <p style="font-size: 14px; color: #6c757d; margin-top: 10px;">
                        Coloca este QR en el collar de tu mascota
                    </p>
                </div>
                
                <div class="download-links">
                    <a href="\${data.qrCode}" download="qr-\${data.petId}.png" class="download-btn">
                        Descargar QR
                    </a>
                    <a href="\${petUrl}" target="_blank" class="download-btn">
                        Ver Página
                    </a>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4>Importante:</h4>
                    <ul style="margin-left: 20px; color: #856404;">
                        <li>Guarda el código QR en un lugar seguro</li>
                        <li>Imprímelo en material resistente al agua</li>
                        <li>Asegúralo bien al collar de tu mascota</li>
                        <li>Prueba escaneando el QR para verificar que funcione</li>
                    </ul>
                </div>
            \`;
            
            resultDiv.style.display = 'block';
            
            // Scroll hacia el resultado
            resultDiv.scrollIntoView({ behavior: 'smooth' });
        }
    </script>
</body>
</html>
    `;
    
    res.send(registrationHTML);
});
// ===========================================
// FUNCIÓN PARA GENERAR CÓDIGO ALEATORIO
// ===========================================
function generateRandomCode() {
    const prefix = 'PET_';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return prefix + code;
}
// ===========================================
// RUTA PARA REGISTRAR MASCOTA
// ===========================================
app.post('/api/register', async (req, res) => {
    try {
        console.log('POST /api/register recibido');
        console.log('Body completo:', JSON.stringify(req.body, null, 2));
        
        const { 
    name, species, sex, color, breed, 
    age_years, age_months, sterilization_code, whatsapp_number,
    gps_alerts, alert_email, alert_whatsapp 
} = req.body;
        
        // Generar código único si no hay microchip
        const petCode = generateRandomCode(); // Siempre generar código aleatorio

        console.log('Campos extraídos:');
        console.log('   name:', name);
        console.log('   species:', species);
        console.log('   sex:', sex);
        console.log('   color:', color);
        
        // Verificar campos obligatorios
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!species) missingFields.push('species');
        if (!sex) missingFields.push('sex');
        if (!color) missingFields.push('color');
        
        if (missingFields.length > 0) {
            console.log('Faltan campos obligatorios:', missingFields);
            return res.status(400).json({
                success: false,
                error: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
                missingFields: missingFields
            });
        }
        
        // URL de la página pública (necesitamos el ID de la base de datos)
        const petUrl = `${req.protocol}://${req.get('host')}/pet/TEMP_ID`;
        
        // Generar código QR temporal
        console.log('Generando código QR...');
        const qrCodeDataURL = await QRCode.toDataURL(petUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        console.log('QR generado exitosamente');
        
        // Guardar en base de datos
        console.log('Guardando en base de datos...');
        const insertQuery = `
           INSERT INTO pets (
                user_id, name, species, sex, color, breed,
                age_years, age_months, sterilization_code, pet_code, qr_code,
                is_active, gps_alerts, alert_email, alert_whatsapp,
                whatsapp_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertQuery, [
            1, // user_id temporal
            name, species, sex, color, breed || null,
            age_years || null, age_months || null, sterilization_code || null, petCode, qrCodeDataURL,
            true, // is_active
            gps_alerts || false, alert_email || false, alert_whatsapp || false,
            whatsapp_number || null
        ], function(err) {
            if (err) {
                console.error('Error guardando mascota en BD:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Error guardando en base de datos: ' + err.message
                });
            }
            
            const petId = this.lastID;
            const finalPetUrl = `${req.protocol}://${req.get('host')}/pet/${petCode}`;
            
            // Actualizar QR con ID real
            const finalQrCode = QRCode.toDataURL(finalPetUrl, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            }).then(finalQrCodeDataURL => {
                // Actualizar el QR en la base de datos
                db.run('UPDATE pets SET qr_code = ? WHERE id = ?', [finalQrCodeDataURL, petId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error actualizando QR:', updateErr);
                    }
                });
                
                console.log(`Mascota registrada exitosamente con ID: ${petId}`);
                
                res.json({
                    success: true,
                    petId: petCode,
                    qrCode: finalQrCodeDataURL,
                    petUrl: finalPetUrl,
                    pet: {
                        name,
                        species,
                        sex,
                        color,
                        breed: breed || 'No especificada'
                    }
                });
            }).catch(qrErr => {
                console.error('Error generando QR final:', qrErr);
                res.json({
                    success: true,
                    petId: petCode,
                    qrCode: qrCodeDataURL,
                    petUrl: finalPetUrl,
                    pet: { name, species, sex, color, breed: breed || 'No especificada' }
                });
            });
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// ===========================================
// RUTA PARA PÁGINA DE MASCOTA ENCONTRADA
// ===========================================
app.get('/pet/:code', async (req, res) => {
    try {
        const petCode = req.params.code;
        console.log(`Buscando mascota con código: ${petCode}`);

        // Buscar mascota en la base de datos usando el ID numérico
       const query = `
         SELECT 
            id, name, species, sex, color, breed,
            age_years, age_months, sterilization_code, pet_code, whatsapp_number, created_at
        FROM pets 
        WHERE pet_code = ? AND is_active = 1`;

        db.get(query, [petCode], (err, pet) => {
            if (err) {
                console.error('Error consultando mascota:', err);
                return res.status(500).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Error</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .error { color: #dc3545; font-size: 18px; }
                        </style>
                    </head>
                    <body>
                        <h1>Error del Servidor</h1>
                        <p class="error">No se pudo cargar la información de la mascota.</p>
                        <p>Por favor, inténtalo nuevamente más tarde.</p>
                    </body>
                    </html>
                `);
            }

            if (!pet) {
                console.log(`Mascota no encontrada: ${petCode}`);
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Mascota No Encontrada</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                text-align: center; 
                                padding: 50px;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                min-height: 100vh;
                                margin: 0;
                            }
                            .container {
                                background: white;
                                color: #333;
                                padding: 40px;
                                border-radius: 20px;
                                max-width: 500px;
                                margin: 0 auto;
                                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            }
                            .warning { color: #ffc107; font-size: 48px; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="warning">⚠️</div>
                            <h1>Mascota No Encontrada</h1>
                            <p>No se encontró información para el código: <strong>${petCode}</strong></p>
                            <p>Verifica que el código QR sea correcto o contacta al propietario directamente.</p>
                        </div>
                    </body>
                    </html>
                `);
            }

            console.log(`Mascota encontrada: ${pet.name} (${pet.species})`);

            // Formatear edad
            let ageText = '';
            if (pet.age_years || pet.age_months) {
                if (pet.age_years) ageText += `${pet.age_years} años`;
                if (pet.age_months) {
                    if (ageText) ageText += ' y ';
                    ageText += `${pet.age_months} meses`;
                }
            } else {
                ageText = 'No especificada';
            }

            // Renderizar página de mascota
            const petPageHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pet.name} - Mascota Encontrada</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }

        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }

        .content {
            padding: 30px 20px;
        }

        .pet-info {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 25px;
            border-left: 5px solid #4ecdc4;
        }

        .pet-info h2 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 20px;
        }

        .pet-info p {
            margin-bottom: 8px;
            color: #6c757d;
            font-size: 16px;
        }

        .pet-info strong {
            color: #495057;
        }

        .location-section {
            text-align: center;
            margin: 30px 0;
        }

        .gps-button {
            background: linear-gradient(45deg, #4ecdc4, #26d0ce);
            color: white;
            border: none;
            padding: 18px 30px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 0 auto;
            min-width: 280px;
        }

        .gps-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(78, 205, 196, 0.4);
        }

        .gps-button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .status-message {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            font-weight: 500;
        }

        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }

        .warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .location-details {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            border-left: 4px solid #28a745;
        }

        .permission-help {
            background: #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            border-left: 4px solid #ffc107;
        }

        .permission-help h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
        }

        .permission-help ol {
            margin-left: 20px;
            color: #6c757d;
        }

        .permission-help li {
            margin-bottom: 8px;
            line-height: 1.5;
        }

        .maps-links {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        }

        .map-link {
            background: #007bff;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .map-link:hover {
            background: #0056b3;
            transform: translateY(-1px);
        }

        .contact-form {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin-top: 30px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #4ecdc4;
        }

        .submit-btn {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Mascota Encontrada!</h1>
            <p>Ayúdanos a reunir a esta mascota con su familia</p>
        </div>

        <div class="content">
            <div class="pet-info">
                <h2>Información de la Mascota</h2>
                <p><strong>Nombre:</strong> ${pet.name}</p>
                <p><strong>Especie:</strong> ${pet.species}</p>
                <p><strong>Sexo:</strong> ${pet.sex}</p>
                <p><strong>Color:</strong> ${pet.color}</p>
                ${pet.breed ? `<p><strong>Raza:</strong> ${pet.breed}</p>` : ''}
                <p><strong>Edad:</strong> ${ageText}</p>
                ${pet.sterilization_code ? `<p><strong>Código de Esterilización:</strong> ${pet.sterilization_code}</p>` : ''}
            </div>

            <div class="location-section">
                <h3>Compartir Ubicación Actual</h3>
                <p style="color: #6c757d; margin-bottom: 20px;">
                    Esto nos ayudará a saber exactamente dónde fue encontrada la mascota
                </p>
                
                <button id="shareLocationBtn" class="gps-button" onclick="shareLocation()">
                    <span id="buttonIcon">📍</span>
                    <span id="buttonText">Compartir Mi Ubicación</span>
                </button>

                <div id="statusMessage" class="status-message" style="display: none;"></div>
                <div id="locationDetails" class="location-details" style="display: none;"></div>
                <div id="permissionHelp" class="permission-help" style="display: none;"></div>
            </div>

            <div class="contact-form">
                <h3>Información de Contacto</h3>
                <form id="contactForm">
                    <div class="form-group">
                        <label for="finderName">Tu Nombre:</label>
                        <input type="text" id="finderName" name="finderName" required>
                    </div>
                    <div class="form-group">
                        <label for="finderPhone">Tu Teléfono:</label>
                        <input type="tel" id="finderPhone" name="finderPhone" required>
                    </div>
                    ${pet.whatsapp_number ? `
                    <div class="form-group">
                        <p style="background: #d4edda; padding: 10px; border-radius: 5px; color: #155724;">
                            <strong>WhatsApp del propietario:</strong> ${pet.whatsapp_number}
                        </p>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label for="message">Mensaje Adicional:</label>
                        <textarea id="message" name="message" rows="3" placeholder="Describe dónde y cómo encontraste a la mascota..."></textarea>
                    </div>
                    <button type="submit" class="submit-btn">
                        Notificar al Propietario
                    </button>
                </form>
            </div>
        </div>
    </div>

    <script>
        const petCode = '${pet.pet_code}';  // ← Interpolación directa en el template
        let currentLocation = null;

        function showMessage(message, type) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.innerHTML = message;
            statusDiv.className = \`status-message \${type}\`;
            statusDiv.style.display = 'block';
        }

        function showPermissionHelp() {
            const helpDiv = document.getElementById('permissionHelp');
            const userAgent = navigator.userAgent;
            let instructions = '';

            if (userAgent.includes('Chrome') && userAgent.includes('Android')) {
                instructions = \`
                    <h3>Activar Ubicación en Chrome (Android)</h3>
                    <ol>
                        <li>Toca el <strong>icono del candado</strong> en la barra de dirección</li>
                        <li>Selecciona <strong>"Configuración del sitio"</strong></li>
                        <li>En <strong>"Ubicación"</strong> selecciona <strong>"Permitir"</strong></li>
                        <li>Actualiza la página y vuelve a intentar</li>
                    </ol>
                \`;
            } else if (userAgent.includes('Safari') && userAgent.includes('iPhone')) {
                instructions = \`
                    <h3>Activar Ubicación en Safari (iPhone)</h3>
                    <ol>
                        <li>Ve a <strong>Ajustes</strong> del iPhone</li>
                        <li><strong>Privacidad y Seguridad</strong> → <strong>Servicios de ubicación</strong></li>
                        <li>Activa <strong>"Servicios de ubicación"</strong></li>
                        <li>Busca <strong>"Safari"</strong> → <strong>"Mientras se usa la app"</strong></li>
                        <li>Vuelve al navegador y actualiza la página</li>
                    </ol>
                \`;
            } else {
                instructions = \`
                    <h3>Activar Ubicación en tu Navegador</h3>
                    <ol>
                        <li>Busca el <strong>ícono de ubicación</strong> en la barra de dirección</li>
                        <li>Selecciona <strong>"Permitir"</strong> o <strong>"Allow"</strong></li>
                        <li>Si no aparece, ve a configuración del navegador</li>
                        <li>Busca <strong>"Permisos"</strong> o <strong>"Sitios web"</strong></li>
                        <li>Agrega este sitio y permite la ubicación</li>
                    </ol>
                \`;
            }

            helpDiv.innerHTML = instructions;
            helpDiv.style.display = 'block';
        }

        function updateButton(icon, text, disabled = false) {
            document.getElementById('buttonIcon').textContent = icon;
            document.getElementById('buttonText').textContent = text;
            document.getElementById('shareLocationBtn').disabled = disabled;
        }

        async function shareLocation() {
            console.log('Iniciando proceso de geolocalización...');
            
            if (!navigator.geolocation) {
                showMessage('Tu navegador no soporta geolocalización', 'error');
                return;
            }

            updateButton('⏳', 'Obteniendo ubicación...', true);
            showMessage('Solicitando permisos de ubicación...', 'info');

            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        reject,
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 60000
                        }
                    );
                });

                console.log('Ubicación obtenida:', position);
                
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                currentLocation = { lat, lng, accuracy };

                showMessage('¡Ubicación obtenida exitosamente!', 'success');
                updateButton('✅', 'Ubicación Compartida', false);

                await reverseGeocode(lat, lng, accuracy);
                await sendLocationToServer(lat, lng, accuracy);

            } catch (error) {
                console.error('Error de geolocalización:', error);
                handleGeolocationError(error);
            }
        }

        function handleGeolocationError(error) {
            updateButton('📍', 'Intentar Nuevamente', false);
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    showMessage('Permisos de ubicación denegados. Por favor, actívalos manualmente.', 'error');
                    showPermissionHelp();
                    break;
                case error.POSITION_UNAVAILABLE:
                    showMessage('No se pudo obtener la ubicación. Verifica tu conexión GPS/WiFi.', 'error');
                    break;
                case error.TIMEOUT:
                    showMessage('Tiempo de espera agotado. Inténtalo nuevamente.', 'warning');
                    break;
                default:
                    showMessage('Error desconocido al obtener la ubicación.', 'error');
                    break;
            }
        }

        async function reverseGeocode(lat, lng, accuracy) {
            try {
                console.log('Iniciando reverse geocoding...');
                
                const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&addressdetails=1\`, {
                    headers: {
                        'User-Agent': 'PetIdentificationApp/1.0'
                    }
                });
                
                const data = await response.json();
                console.log('Respuesta de geocoding:', data);
                
                if (data && data.display_name) {
                    displayLocationDetails(lat, lng, accuracy, data.display_name);
                } else {
                    displayLocationDetails(lat, lng, accuracy, 'Dirección no disponible');
                }
                
            } catch (error) {
                console.error('Error en reverse geocoding:', error);
                displayLocationDetails(lat, lng, accuracy, 'No se pudo obtener la dirección');
            }
        }

        function displayLocationDetails(lat, lng, accuracy, address) {
            const detailsDiv = document.getElementById('locationDetails');
            
            detailsDiv.innerHTML = \`
                <h4>Ubicación Registrada</h4>
                <p><strong>Dirección:</strong> \${address}</p>
                <p><strong>Coordenadas:</strong> \${lat.toFixed(6)}, \${lng.toFixed(6)}</p>
                <p><strong>Precisión:</strong> ±\${accuracy.toFixed(0)} metros</p>
                
                <div class="maps-links">
                    <a href="https://www.google.com/maps?q=\${lat},\${lng}" target="_blank" class="map-link">
                        Ver en Google Maps
                    </a>
                    <a href="https://waze.com/ul?ll=\${lat},\${lng}" target="_blank" class="map-link">
                        Abrir en Waze
                    </a>
                </div>
            \`;
            
            detailsDiv.style.display = 'block';
        }

        async function sendLocationToServer(lat, lng, accuracy) {
            try {
                console.log('Enviando ubicación al servidor...');
                
                const response = await fetch('/api/found-location', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        petId: petCode,
                        latitude: lat,
                        longitude: lng,
                        accuracy: accuracy,
                        timestamp: new Date().toISOString()
                    })
                });
                
                if (response.ok) {
                    console.log('Ubicación enviada exitosamente al servidor');
                } else {
                    console.warn('Error al enviar ubicación al servidor');
                }
                
            } catch (error) {
                console.error('Error enviando al servidor:', error);
            }
        }

        // Manejar envío del formulario
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        petId: petCode,  // Verifica que petCode tenga valor
        finderName: document.getElementById('finderName').value,
        finderPhone: document.getElementById('finderPhone').value,
        message: document.getElementById('message').value,
        location: currentLocation,
        timestamp: new Date().toISOString()
    };

        console.log('Enviando datos:', formData);  // Agrega este log
    console.log('petCode actual:', petCode);   // Y este también
            
            try {
                const response = await fetch('/api/notify-owner', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    alert('¡Gracias! El propietario ha sido notificado.');
                    this.reset();
                } else {
                    alert('Error al enviar la notificación. Por favor, inténtalo nuevamente.');
                }
            } catch (error) {
                console.error('Error enviando formulario:', error);
                alert('Error de conexión. Por favor, verifica tu internet e inténtalo nuevamente.');
            }
        });
    </script>
</body>
</html>
            `;

            res.send(petPageHTML);
        });

    } catch (error) {
        console.error('Error en ruta /pet/:id:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// ===========================================
// RUTA API PARA RECIBIR UBICACIÓN GPS
// ===========================================
app.post('/api/found-location', (req, res) => {
    try {
        const { petId, latitude, longitude, accuracy, timestamp } = req.body;
        
        // Primero buscar el ID numérico usando el pet_code
        const findPetQuery = 'SELECT id FROM pets WHERE pet_code = ? AND is_active = 1';
        
        db.get(findPetQuery, [petId], (err, pet) => {
            if (err || !pet) {
                console.error('Error encontrando mascota:', err);
                return res.status(404).json({ 
                    success: false, 
                    error: 'Mascota no encontrada' 
                });
            }
            
            const numericPetId = pet.id;
            
            // Ahora guardar con el ID numérico
            const insertQuery = `
                INSERT INTO pet_locations (
                    pet_id, 
                    latitude, 
                    longitude, 
                    accuracy, 
                    found_timestamp,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;

            db.run(insertQuery, [numericPetId, latitude, longitude, accuracy, timestamp], function(err) {
                if (err) {
                    console.error('Error guardando ubicación:', err);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Error guardando ubicación' 
                    });
                }

                console.log(`Ubicación guardada con ID: ${this.lastID}`);
                res.json({ 
                    success: true, 
                    locationId: this.lastID,
                    message: 'Ubicación registrada exitosamente'
                });
            });
        });

    } catch (error) {
        console.error('Error procesando ubicación:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// ===========================================
// RUTA API PARA NOTIFICAR AL PROPIETARIO
// ===========================================
app.post('/api/notify-owner', (req, res) => {
    try {
        const { petId, finderName, finderPhone, message, location, timestamp } = req.body;
        
        // Primero buscar el ID numérico usando el pet_code
        const findPetQuery = 'SELECT id FROM pets WHERE pet_code = ? AND is_active = 1';
        
        db.get(findPetQuery, [petId], (err, pet) => {
            if (err || !pet) {
                console.error('Error encontrando mascota:', err);
                return res.status(404).json({ 
                    success: false, 
                    error: 'Mascota no encontrada' 
                });
            }
            
            const numericPetId = pet.id;
            
            // Resto del código igual, pero usando numericPetId
            const insertQuery = `
                INSERT INTO pet_notifications (
                    pet_id,
                    finder_name,
                    finder_phone,
                    finder_message,
                    location_lat,
                    location_lng,
                    location_accuracy,
                    found_timestamp,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `;

            const locationData = location ? [location.lat, location.lng, location.accuracy] : [null, null, null];

            db.run(insertQuery, [
                numericPetId,  // Usar el ID numérico aquí
                finderName,
                finderPhone,
                message,
                ...locationData,
                timestamp
            ], function(err) {
                if (err) {
                    console.error('Error guardando notificación:', err);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Error guardando notificación' 
                    });
                }

                console.log(`Notificación guardada con ID: ${this.lastID}`);
                
                res.json({ 
                    success: true, 
                    notificationId: this.lastID,
                    message: 'Propietario notificado exitosamente'
                });
            });
        });

    } catch (error) {
        console.error('Error procesando notificación:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});
console.log('Ruta /api/notify-owner registrada correctamente');

// ===========================================
// RUTA PARA VER TODAS LAS MASCOTAS (ADMIN)
// ===========================================
app.get('/admin/pets', (req, res) => {
    const query = `
        SELECT 
            id, name, species, sex, color, breed,
            age_years, age_months, sterilization_code, pet_code, 
            whatsapp_number, created_at
        FROM pets 
        WHERE is_active = 1
        ORDER BY created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error consultando mascotas:', err);
            return res.status(500).json({ error: 'Error consultando base de datos' });
        }

        const adminHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Mascotas Registradas</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: linear-gradient(45deg, #4ecdc4, #26d0ce); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        tr:hover { background-color: #f8f9fa; }
        .pet-id { font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .btn { background: #007bff; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Panel de Administración - Mascotas Registradas</h1>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${rows.length}</div>
                <div class="stat-label">Total Mascotas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${rows.filter(row => row.created_at > new Date(Date.now() - 7*24*60*60*1000).toISOString()).length}</div>
                <div class="stat-label">Esta Semana</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${rows.filter(row => row.created_at > new Date(Date.now() - 24*60*60*1000).toISOString()).length}</div>
                <div class="stat-label">Hoy</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Especie</th>
                    <th>Sexo</th>
                    <th>Color</th>
                    <th>Raza</th>
                    <th>Edad</th>
                    <th>Código Esterilización</th>
                    <th>Código Pet</th>
                    <th>WhatsApp</th>
                    <th>Registrado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => {
                    let ageText = '';
                    if (row.age_years || row.age_months) {
                        if (row.age_years) ageText += `${row.age_years}a`;
                        if (row.age_months) {
                            if (ageText) ageText += ' ';
                            ageText += `${row.age_months}m`;
                        }
                    } else {
                        ageText = '-';
                    }
                    
                    return `
                        <tr>
                            <td><span class="pet-id">${row.id}</span></td>
                            <td><strong>${row.name}</strong></td>
                            <td>${row.species}</td>
                            <td>${row.sex}</td>
                            <td>${row.color}</td>
                            <td>${row.breed || '-'}</td>
                            <td>${ageText}</td>
                            <td>${row.sterilization_code ? row.sterilization_code : '-'}</td>
                            <td>${row.pet_code ? row.pet_code : '-'}</td>
                            <td>${row.whatsapp_number || '-'}</td>
                            <td>${new Date(row.created_at).toLocaleDateString()}</td>
                            <td>
                                <a href="/pet/${row.pet_code}" class="btn" target="_blank">Ver Página</a>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        ${rows.length === 0 ? '<p style="text-align: center; color: #6c757d; margin-top: 40px;">No hay mascotas registradas aún.</p>' : ''}
    </div>
</body>
</html>
        `;
        
        res.send(adminHTML);
    });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error en request:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: err.message
    });
}); 
// Middleware de debugging para todas las requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
    next();
});

// ===========================================
// RUTA API PARA OBTENER RAZAS POR ESPECIE
// ===========================================
app.get('/api/breeds/:species', (req, res) => {
    const species = req.params.species;
    console.log(`Obteniendo razas para: ${species}`);
    
    const query = 'SELECT id, name FROM breeds WHERE species = ? AND is_active = 1 ORDER BY name';
    
    db.all(query, [species], (err, breeds) => {
        if (err) {
            console.error('Error obteniendo razas:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Error obteniendo razas' 
            });
        }
        
        res.json({
            success: true,
            breeds: breeds
        });
    });
});


// Iniciar servidor
app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('Error iniciando servidor:', err);
        process.exit(1);
    }
    
    console.log('===============================================');
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Acceso local: http://localhost:${PORT}`);
    console.log(`Acceso desde móvil: http://TU_IP:${PORT}`);
    console.log(`Panel Admin: http://localhost:${PORT}/admin/pets`);
    console.log('===============================================');
    
    console.log('Rutas disponibles:');
    console.log('   GET  / (página principal)');
    console.log('   POST /api/register (registrar mascota)');
    console.log('   GET  /pet/:id (página de mascota)');
    console.log('   POST /api/found-location (ubicación GPS)');
    console.log('   POST /api/notify-owner (notificar propietario)');
    console.log('   GET  /admin/pets (panel admin)');
});

// Manejo de errores del servidor
process.on('uncaughtException', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Puerto ${PORT} ya está en uso`);
        console.log('Soluciones:');
        console.log('   1. Cerrar otras aplicaciones en puerto 3000');
        console.log('   2. Usar otro puerto: set PORT=3001 && npm start');
        console.log('   3. Matar procesos: taskkill /f /im node.exe');
        process.exit(1);
    } else {
        console.error('Error del servidor:', err);
        process.exit(1);
    }
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\nCerrando servidor...');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error cerrando base de datos:', err.message);
            } else {
                console.log('Base de datos cerrada correctamente');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Middleware