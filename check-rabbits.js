const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Verificando razas de conejo...');
        
        // Ver todas las razas de conejo actuales
        db.all("SELECT * FROM breeds WHERE species = 'Conejo'", (err, rows) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('Razas de conejo actuales:');
                rows.forEach(row => {
                    console.log(`  ${row.id}: ${row.name}`);
                });
                
                // Insertar una por una para ver cuál falla
                const newBreeds = [
                    'Holland Lop', 'Mini Lop', 'Netherland Dwarf', 
                    'Lionhead', 'Dutch', 'Flemish Giant', 
                    'Rex', 'Angora', 'English Lop'
                ];
                
                let insertCount = 0;
                newBreeds.forEach(breedName => {
                    db.run("INSERT OR IGNORE INTO breeds (name, species) VALUES (?, 'Conejo')", 
                           [breedName], function(err) {
                        if (err) {
                            console.error(`Error insertando ${breedName}:`, err);
                        } else if (this.changes > 0) {
                            console.log(`✓ Insertado: ${breedName}`);
                            insertCount++;
                        } else {
                            console.log(`- Ya existe: ${breedName}`);
                        }
                        
                        if (insertCount + 1 === newBreeds.length) {
                            db.close();
                        }
                    });
                });
            }
        });
    }
});