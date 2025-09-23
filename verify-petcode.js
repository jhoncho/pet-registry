const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Verificando estructura de tabla pets...');
        
        db.all("PRAGMA table_info(pets)", (err, columns) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('Columnas en la tabla pets:');
                columns.forEach(col => {
                    console.log(`  ${col.name} (${col.type})`);
                });
                
                // Verificar si pet_code existe
                const hasPetCode = columns.find(col => col.name === 'pet_code');
                if (hasPetCode) {
                    console.log('✓ Columna pet_code existe');
                } else {
                    console.log('✗ Columna pet_code NO existe');
                }
            }
            db.close();
        });
    }
});