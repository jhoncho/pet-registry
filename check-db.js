const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Agregando razas de conejo...');
        
        const rabbitBreeds = [
            ['Holland Lop', 'Conejo'],
            ['Mini Lop', 'Conejo'],
            ['Netherland Dwarf', 'Conejo'],
            ['Lionhead', 'Conejo'],
            ['Dutch', 'Conejo'],
            ['Flemish Giant', 'Conejo'],
            ['Rex', 'Conejo'],
            ['Angora', 'Conejo'],
            ['English Lop', 'Conejo'],
            ['Mestizo', 'Conejo']
        ];
        
        const stmt = db.prepare('INSERT INTO breeds (name, species) VALUES (?, ?)');
        rabbitBreeds.forEach(breed => {
            stmt.run(breed[0], breed[1]);
        });
        stmt.finalize();
        
        console.log('Razas de conejo agregadas exitosamente');
        
        // Verificar total
        db.all('SELECT species, COUNT(*) as cantidad FROM breeds GROUP BY species', (err, rows) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('Razas por especie:');
                rows.forEach(row => {
                    console.log(`  ${row.species}: ${row.cantidad} razas`);
                });
            }
            db.close();
        });
    }
});