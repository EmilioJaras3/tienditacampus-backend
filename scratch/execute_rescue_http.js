const http = require('http');

const data = JSON.stringify({
    email: 'jarassanchezl@gmail.com',
    secret: 'TC-ADMIN-RESCUE-2024'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/rescue-admin',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('--- Iniciando Ejecución de Rescate Administrativo ---');

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', body);
        if (res.statusCode === 200) {
            console.log(' RESCATE COMPLETADO. La cuenta debería estar desbloqueada.');
        } else {
            console.log(' FALLO EN EL RESCATE. Verifica el secreto o que el backend esté arriba.');
        }
    });
});

req.on('error', (error) => {
    console.error(' Error de conexión:', error.message);
});

req.write(data);
req.end();