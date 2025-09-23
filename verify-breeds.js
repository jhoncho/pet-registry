const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Verificando razas insertadas...');
        
        db.all('SELECT * FROM breeds ORDER BY species, name', (err, rows) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log(`Total razas: ${rows.length}`);
                rows.forEach(row => {
                    console.log(`${row.id}: ${row.name} (${row.species})`);
                });
            }
            db.close();
        });
    }
});