// backend/gpsService.js - Servicio de geolocalización completo
const https = require('https');

class GPSService {
    constructor() {
        // Puedes usar APIs gratuitas como:
        // - IPGeolocation (1000 requests/mes gratis)
        // - OpenCageData (2500 requests/día gratis)
        // - Google Maps Geocoding (con crédito gratuito)
        this.geocodingApiKey = process.env.GEOCODING_API_KEY || '';
        
        // User-Agent para requests HTTP
        this.userAgent = 'PetRegistry/1.0 (https://github.com/pet-registry)';
    }

    // Obtener ubicación por IP (fallback cuando no hay GPS)
    async getLocationByIP(ipAddress) {
        try {
            // Filtrar IPs locales
            if (this.isLocalIP(ipAddress)) {
                console.log('🏠 IP local detectada, usando ubicación por defecto');
                return {
                    latitude: 40.4168,
                    longitude: -3.7038,
                    address: 'Madrid, España',
                    accuracy: 'city',
                    source: 'default'
                };
            }

            console.log(`🔍 Obteniendo ubicación por IP: ${ipAddress}`);
            
            // Usar API gratuita de ipapi.co
            const url = `https://ipapi.co/${ipAddress}/json/`;
            const data = await this.makeRequest(url);
            
            if (data.latitude && data.longitude) {
                const result = {
                    latitude: parseFloat(data.latitude),
                    longitude: parseFloat(data.longitude),
                    address: this.formatAddress(data),
                    accuracy: 'city', // precisión a nivel ciudad
                    source: 'ip',
                    city: data.city || 'Desconocida',
                    region: data.region || 'Desconocida',
                    country: data.country_name || 'Desconocido'
                };
                
                console.log('✅ Ubicación por IP obtenida:', result);
                return result;
            }
            
            console.log('⚠️ No se pudo obtener ubicación por IP');
            return null;
        } catch (error) {
            console.error('❌ Error obteniendo ubicación por IP:', error.message);
            return null;
        }
    }

    // Convertir coordenadas a dirección legible (Reverse Geocoding)
    async getAddressFromCoordinates(latitude, longitude) {
        try {
            console.log(`🗺️ Convirtiendo coordenadas a dirección: ${latitude}, ${longitude}`);
            
            if (!this.isValidCoordinates(latitude, longitude)) {
                throw new Error('Coordenadas inválidas');
            }

            if (!this.geocodingApiKey) {
                // Usar servicio gratuito de Nominatim (OpenStreetMap)
                const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18&extratags=1`;
                
                const data = await this.makeRequestWithHeaders(url, {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json',
                    'Accept-Language': 'es,en'
                });
                
                if (data && data.display_name) {
                    const result = {
                        address: data.display_name,
                        city: data.address?.city || data.address?.town || data.address?.village || 'Desconocida',
                        country: data.address?.country || 'Desconocido',
                        postcode: data.address?.postcode || null,
                        accuracy: 'high',
                        source: 'nominatim'
                    };
                    
                    console.log('✅ Dirección obtenida:', result.address);
                    return result;
                }
            } else {
                // Usar Google Maps Geocoding API (más preciso)
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.geocodingApiKey}&language=es`;
                const data = await this.makeRequest(url);
                
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    return {
                        address: result.formatted_address,
                        accuracy: 'high',
                        source: 'google'
                    };
                }
            }
            
            console.log('⚠️ No se pudo obtener dirección de las coordenadas');
            return null;
        } catch (error) {
            console.error('❌ Error en reverse geocoding:', error.message);
            return null;
        }
    }

    // Procesar datos de ubicación del frontend
    async processLocationData(locationData, ipAddress) {
        let result = {
            latitude: null,
            longitude: null,
            address: null,
            accuracy: 'unknown',
            source: 'none',
            timestamp: new Date().toISOString()
        };

        try {
            console.log('🔄 Procesando datos de ubicación...');
            
            // Prioridad 1: GPS del dispositivo (más preciso)
            if (locationData && locationData.latitude && locationData.longitude) {
                console.log('📱 Usando GPS del dispositivo');
                
                result.latitude = parseFloat(locationData.latitude);
                result.longitude = parseFloat(locationData.longitude);
                result.accuracy = this.getAccuracyLevel(locationData.accuracy);
                result.source = 'gps';

                // Obtener dirección de las coordenadas
                const addressData = await this.getAddressFromCoordinates(
                    result.latitude, 
                    result.longitude
                );
                
                if (addressData) {
                    result.address = addressData.address;
                    result.city = addressData.city;
                    result.country = addressData.country;
                }
            }
            // Prioridad 2: Geolocalización por IP (menos preciso)
            else if (ipAddress) {
                console.log('🌐 Usando geolocalización por IP como fallback');
                const ipLocation = await this.getLocationByIP(ipAddress);
                if (ipLocation) {
                    result = { ...result, ...ipLocation };
                }
            }

            console.log('✅ Datos de ubicación procesados:', {
                source: result.source,
                accuracy: result.accuracy,
                hasAddress: !!result.address
            });

            return result;
        } catch (error) {
            console.error('❌ Error procesando datos de ubicación:', error);
            return result;
        }
    }

    // Calcular distancia entre dos puntos (en kilómetros)
    calculateDistance(lat1, lon1, lat2, lon2) {
        try {
            const R = 6371; // Radio de la Tierra en km
            const dLat = this.toRadians(lat2 - lat1);
            const dLon = this.toRadians(lon2 - lon1);
            
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            return Math.round(distance * 100) / 100; // Redondear a 2 decimales
        } catch (error) {
            console.error('❌ Error calculando distancia:', error);
            return null;
        }
    }

    // Convertir grados a radianes
    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    // Generar URL de Google Maps
    generateMapsURL(latitude, longitude, petName = 'Mascota') {
        try {
            const encodedPetName = encodeURIComponent(`${petName} encontrada aquí`);
            return `https://maps.google.com/maps?q=${latitude},${longitude}&t=m&z=16&marker=${encodedPetName}`;
        } catch (error) {
            console.error('❌ Error generando URL de mapa:', error);
            return `https://maps.google.com/maps?q=${latitude},${longitude}`;
        }
    }

    // Generar URL de Waze
    generateWazeURL(latitude, longitude) {
        try {
            return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
        } catch (error) {
            console.error('❌ Error generando URL de Waze:', error);
            return null;
        }
    }

    // Función auxiliar para hacer requests HTTP
    makeRequest(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } else {
                            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        }
                    } catch (error) {
                        reject(new Error(`Error parsing JSON: ${error.message}`));
                    }
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    // Función auxiliar para requests con headers personalizados
    makeRequestWithHeaders(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObject = new URL(url);
            const options = {
                hostname: urlObject.hostname,
                port: urlObject.port || 443,
                path: urlObject.pathname + urlObject.search,
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    ...headers
                }
            };

            const request = https.request(options, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } else {
                            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        }
                    } catch (error) {
                        reject(new Error(`Error parsing JSON: ${error.message}`));
                    }
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });

            request.end();
        });
    }

    // Validar coordenadas GPS
    isValidCoordinates(latitude, longitude) {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        
        return !isNaN(lat) && !isNaN(lon) && 
               lat >= -90 && lat <= 90 && 
               lon >= -180 && lon <= 180;
    }

    // Verificar si es IP local
    isLocalIP(ip) {
        if (!ip) return true;
        
        const localIPs = [
            '127.0.0.1',
            'localhost',
            '::1',
            '0.0.0.0'
        ];
        
        return localIPs.includes(ip) || 
               ip.startsWith('192.168.') || 
               ip.startsWith('10.') || 
               ip.startsWith('172.');
    }

    // Formatear dirección de datos de IP
    formatAddress(data) {
        const parts = [];
        
        if (data.city) parts.push(data.city);
        if (data.region && data.region !== data.city) parts.push(data.region);
        if (data.country_name) parts.push(data.country_name);
        
        return parts.join(', ') || 'Ubicación desconocida';
    }

    // Obtener nivel de precisión legible
    getAccuracyLevel(accuracy) {
        if (!accuracy) return 'unknown';
        
        const acc = parseFloat(accuracy);
        if (acc <= 5) return 'very_high';
        if (acc <= 20) return 'high';
        if (acc <= 100) return 'medium';
        if (acc <= 1000) return 'low';
        return 'very_low';
    }

    // Obtener descripción de precisión
    getAccuracyDescription(accuracy) {
        switch (accuracy) {
            case 'very_high': return 'Muy alta (±5m)';
            case 'high': return 'Alta (±20m)';
            case 'medium': return 'Media (±100m)';
            case 'low': return 'Baja (±1km)';
            case 'very_low': return 'Muy baja (+1km)';
            case 'city': return 'Nivel ciudad';
            case 'gps': return 'GPS del dispositivo';
            default: return 'Desconocida';
        }
    }

    // Generar reporte de ubicación completo
    generateLocationReport(locationData) {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                coordinates: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    valid: this.isValidCoordinates(locationData.latitude, locationData.longitude)
                },
                address: locationData.address || 'No disponible',
                accuracy: {
                    level: locationData.accuracy,
                    description: this.getAccuracyDescription(locationData.accuracy)
                },
                source: {
                    type: locationData.source,
                    description: this.getSourceDescription(locationData.source)
                },
                maps: {
                    google: this.generateMapsURL(locationData.latitude, locationData.longitude),
                    waze: this.generateWazeURL(locationData.latitude, locationData.longitude)
                }
            };

            return report;
        } catch (error) {
            console.error('❌ Error generando reporte de ubicación:', error);
            return null;
        }
    }

    // Obtener descripción de la fuente
    getSourceDescription(source) {
        switch (source) {
            case 'gps': return 'GPS del dispositivo móvil';
            case 'ip': return 'Geolocalización por dirección IP';
            case 'default': return 'Ubicación por defecto';
            case 'nominatim': return 'OpenStreetMap Nominatim';
            case 'google': return 'Google Maps Geocoding';
            default: return 'Fuente desconocida';
        }
    }
}

module.exports = GPSService;