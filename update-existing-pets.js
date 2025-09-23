const sqlite3 = require('sqlite3').verbose();

function generateRandomCode() {
    const prefix = 'PET_';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return prefix + code;
}

const db = new sqlite3.Database('./database/pets.db', (err) => {
    if (err) {
        console.error('Error conectando:', err.message);
    } else {
        console.log('Actualizando mascotas existentes con códigos pet...');
        
        // Obtener mascotas sin pet_code
        db.all('SELECT id FROM pets WHERE pet_code IS NULL', (err, pets) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log(`Mascotas a actualizar: ${pets.length}`);
                
                pets.forEach(pet => {
                    const newCode = generateRandomCode();
                    db.run('UPDATE pets SET pet_code = ? WHERE id = ?', [newCode, pet.id], (err) => {
                        if (err) {
                            console.error(`Error actualizando mascota ${pet.id}:`, err);
                        } else {
                            console.log(`Mascota ${pet.id} actualizada con código: ${newCode}`);
                        }
                    });
                });
                
                setTimeout(() => {
                    db.close();
                }, 2000);
            }
        });
    }
});