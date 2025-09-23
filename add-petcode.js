const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Agregando columna pet_code...');
        
        db.run('ALTER TABLE pets ADD COLUMN pet_code VARCHAR(20) UNIQUE', (err) => {
            if (err) {
                console.error('Error agregando columna:', err);
            } else {
                console.log('Columna pet_code agregada exitosamente');
            }
            db.close();
        });
    }
});