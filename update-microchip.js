const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Renombrando columna microchip a sterilization_code...');
        
        // SQLite no soporta RENAME COLUMN directamente, necesitamos recrear la tabla
        db.serialize(() => {
            // 1. Crear tabla temporal con nueva estructura
            db.run(`CREATE TABLE pets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                species VARCHAR(50) NOT NULL,
                sex VARCHAR(10) NOT NULL,
                color VARCHAR(255) NOT NULL,
                age_years INTEGER,
                age_months INTEGER,
                breed VARCHAR(255),
                sterilization_code VARCHAR(50),
                photo_url VARCHAR(500),
                qr_code VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                gps_alerts BOOLEAN DEFAULT 0,
                alert_email BOOLEAN DEFAULT 0,
                alert_whatsapp BOOLEAN DEFAULT 0,
                alert_sms BOOLEAN DEFAULT 0,
                whatsapp_number VARCHAR(20),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creando tabla nueva:', err);
                } else {
                    console.log('Tabla nueva creada');
                }
            });
            
            // 2. Copiar datos de tabla antigua a nueva
            db.run(`INSERT INTO pets_new 
                SELECT id, user_id, name, species, sex, color, age_years, age_months, 
                       breed, microchip, photo_url, qr_code, is_active, gps_alerts, 
                       alert_email, alert_whatsapp, alert_sms, whatsapp_number, 
                       created_at, updated_at
                FROM pets`, (err) => {
                if (err) {
                    console.error('Error copiando datos:', err);
                } else {
                    console.log('Datos copiados');
                }
            });
            
            // 3. Eliminar tabla antigua
            db.run('DROP TABLE pets', (err) => {
                if (err) {
                    console.error('Error eliminando tabla antigua:', err);
                } else {
                    console.log('Tabla antigua eliminada');
                }
            });
            
            // 4. Renombrar tabla nueva
            db.run('ALTER TABLE pets_new RENAME TO pets', (err) => {
                if (err) {
                    console.error('Error renombrando tabla:', err);
                } else {
                    console.log('Tabla renombrada exitosamente');
                    console.log('Columna microchip ahora es sterilization_code');
                }
                db.close();
            });
        });
    }
});