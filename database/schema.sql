-- schema.sql - Estructura de la base de datos
-- Guardar este archivo en: database/schema.sql

-- Tabla de usuarios/propietarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mascotas
CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(50) NOT NULL, -- 'dog', 'cat'
    sex VARCHAR(10) NOT NULL, -- 'male', 'female'
    color VARCHAR(255) NOT NULL,
    age_years INTEGER,
    age_months INTEGER,
    breed VARCHAR(255),
    microchip VARCHAR(50),
    photo_url VARCHAR(500),
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    gps_alerts BOOLEAN DEFAULT 1,
    alert_email BOOLEAN DEFAULT 1,
    alert_whatsapp BOOLEAN DEFAULT 0,
    alert_sms BOOLEAN DEFAULT 0,
    whatsapp_number VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de escaneos del QR
CREATE TABLE IF NOT EXISTS qr_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    ip_address VARCHAR(45),
    user_agent TEXT,
    address VARCHAR(500), -- dirección obtenida del GPS
    finder_phone VARCHAR(20), -- opcional
    finder_message TEXT, -- opcional
    notification_sent BOOLEAN DEFAULT 0,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- Tabla de configuración del usuario (para planes futuros)
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'free', -- 'free', 'premium'
    max_pets INTEGER DEFAULT 1,
    custom_qr BOOLEAN DEFAULT 0,
    premium_until DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla para ubicaciones de mascotas encontradas
CREATE TABLE IF NOT EXISTS pet_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    found_timestamp TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets (pet_id)
);

-- Tabla para notificaciones al propietario
CREATE TABLE IF NOT EXISTS pet_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id TEXT NOT NULL,
    finder_name TEXT NOT NULL,
    finder_phone TEXT NOT NULL,
    finder_message TEXT,
    location_lat REAL,
    location_lng REAL,
    location_accuracy REAL,
    found_timestamp TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets (pet_id)
);
-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_qr_code ON pets(qr_code);
CREATE INDEX IF NOT EXISTS idx_scans_pet_id ON qr_scans(pet_id);
CREATE INDEX IF NOT EXISTS idx_scans_date ON qr_scans(scanned_at);

-- Datos de ejemplo para testing (opcional)
INSERT OR IGNORE INTO users (id, email, name, phone, city) VALUES 
(1, 'test@example.com', 'Usuario Test', '+1234567890', 'Madrid');

INSERT OR IGNORE INTO pets (id, user_id, name, species, sex, color, age_years, qr_code, gps_alerts) VALUES 
(1, 1, 'Max', 'dog', 'male', 'Marrón', 3, 'PET_QR_123456789', 1);

-- Crear tabla de razas
CREATE TABLE IF NOT EXISTS breeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar razas de perros más comunes
INSERT INTO breeds (name, species) VALUES
('Labrador Retriever', 'Perro'),
('Golden Retriever', 'Perro'),
('Pastor Alemán', 'Perro'),
('Bulldog Francés', 'Perro'),
('Bulldog Inglés', 'Perro'),
('Beagle', 'Perro'),
('Rottweiler', 'Perro'),
('Yorkshire Terrier', 'Perro'),
('Poodle', 'Perro'),
('Chihuahua', 'Perro'),
('Boxer', 'Perro'),
('Husky Siberiano', 'Perro'),
('Cocker Spaniel', 'Perro'),
('Border Collie', 'Perro'),
('Doberman', 'Perro'),
('Shih Tzu', 'Perro'),
('Dachshund', 'Perro'),
('Maltés', 'Perro'),
('Schnauzer', 'Perro'),
('Pit Bull', 'Perro'),
('Mestizo', 'Perro'),

-- Insertar razas de gatos más comunes
('Persa', 'Gato'),
('Siamés', 'Gato'),
('Maine Coon', 'Gato'),
('Ragdoll', 'Gato'),
('Bengalí', 'Gato'),
('British Shorthair', 'Gato'),
('Abisinio', 'Gato'),
('Scottish Fold', 'Gato'),
('Sphynx', 'Gato'),
('Russian Blue', 'Gato'),
('Angora Turco', 'Gato'),
('Birmano', 'Gato'),
('Manx', 'Gato'),
('Oriental', 'Gato'),
('Devon Rex', 'Gato'),
('Doméstico de pelo corto', 'Gato'),
('Doméstico de pelo largo', 'Gato'),
('Mestizo', 'Gato');