const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Limpiando duplicados en breeds...');
        
        // Eliminar duplicados manteniendo solo el ID más bajo
        db.run(`
            DELETE FROM breeds 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM breeds 
                GROUP BY name, species
            )
        `, (err) => {
            if (err) {
                console.error('Error limpiando:', err);
            } else {
                console.log('Duplicados eliminados');
                
                // Verificar resultado
                db.all('SELECT species, COUNT(*) as cantidad FROM breeds GROUP BY species', (err, rows) => {
                    if (err) {
                        console.error('Error:', err);
                    } else {
                        console.log('Razas por especie después de limpiar:');
                        rows.forEach(row => {
                            console.log(`  ${row.species}: ${row.cantidad} razas`);
                        });
                    }
                    db.close();
                });
            }
        });
    }
});