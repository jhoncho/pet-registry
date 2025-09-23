const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Verificando última mascota registrada...');
        
        db.get('SELECT * FROM pets ORDER BY id DESC LIMIT 1', (err, pet) => {
            if (err) {
                console.error('Error:', err);
            } else if (pet) {
                console.log('Última mascota:');
                console.log(`  ID: ${pet.id}`);
                console.log(`  Nombre: ${pet.name}`);
                console.log(`  Sterilization code: ${pet.sterilization_code}`);
                console.log(`  Pet code: ${pet.pet_code}`);
                console.log(`  QR code: ${pet.qr_code ? 'Existe' : 'NULL'}`);
            } else {
                console.log('No hay mascotas registradas');
            }
            db.close();
        });
    }
});