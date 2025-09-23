// backend/database.js - Conexión y configuración de la base de datos
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/pets.db');
        this.schemaPath = path.join(__dirname, '../database/schema.sql');
        this.db = null;
    }

    // Conectar a la base de datos
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error conectando a la base de datos:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado a la base de datos SQLite');
                    this.initializeTables()
                        .then(() => resolve(this.db))
                        .catch(reject);
                }
            });
        });
    }

    // Crear tablas si no existen
    initializeTables() {
        return new Promise((resolve, reject) => {
            try {
                const schema = fs.readFileSync(this.schemaPath, 'utf8');
                
                this.db.exec(schema, (err) => {
                    if (err) {
                        console.error('❌ Error creando tablas:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ Tablas de la base de datos inicializadas');
                        resolve();
                    }
                });
            } catch (error) {
                console.error('❌ Error leyendo schema.sql:', error.message);
                reject(error);
            }
        });
    }

    // Crear usuario
    createUser(userData) {
        return new Promise((resolve, reject) => {
            const { email, name, phone, city } = userData;
            const query = `
                INSERT INTO users (email, name, phone, city) 
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, [email, name, phone, city], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...userData });
                }
            });
        });
    }

    // Buscar usuario por email
    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE email = ?';
            
            this.db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Crear mascota
    createPet(petData) {
        return new Promise((resolve, reject) => {
            const {
                user_id, name, species, sex, color, age_years, age_months,
                breed, microchip, photo_url, qr_code, gps_alerts,
                alert_email, alert_whatsapp, alert_sms, whatsapp_number
            } = petData;

            const query = `
                INSERT INTO pets (
                    user_id, name, species, sex, color, age_years, age_months,
                    breed, microchip, photo_url, qr_code, gps_alerts,
                    alert_email, alert_whatsapp, alert_sms, whatsapp_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                user_id, name, species, sex, color, age_years, age_months,
                breed, microchip, photo_url, qr_code, gps_alerts ? 1 : 0,
                alert_email ? 1 : 0, alert_whatsapp ? 1 : 0, alert_sms ? 1 : 0, whatsapp_number
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...petData });
                }
            });
        });
    }

    // Buscar mascota por código QR
    getPetByQR(qr_code) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT p.*, u.name as owner_name, u.phone as owner_phone, 
                       u.email as owner_email, u.city as owner_city
                FROM pets p 
                JOIN users u ON p.user_id = u.id 
                WHERE p.qr_code = ? AND p.is_active = 1
            `;
            
            this.db.get(query, [qr_code], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Obtener mascotas de un usuario
    getPetsByUser(user_id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM pets WHERE user_id = ? AND is_active = 1';
            
            this.db.all(query, [user_id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Registrar escaneo de QR
    recordScan(scanData) {
        return new Promise((resolve, reject) => {
            const {
                pet_id, latitude, longitude, ip_address, user_agent,
                address, finder_phone, finder_message
            } = scanData;

            const query = `
                INSERT INTO qr_scans (
                    pet_id, latitude, longitude, ip_address, user_agent,
                    address, finder_phone, finder_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                pet_id, latitude, longitude, ip_address, user_agent,
                address, finder_phone, finder_message
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...scanData });
                }
            });
        });
    }

    // Cerrar conexión
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error cerrando la base de datos:', err.message);
                } else {
                    console.log('✅ Conexión a la base de datos cerrada');
                }
            });
        }
    }
}

module.exports = Database;