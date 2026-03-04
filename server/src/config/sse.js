/**
 * Server-Sent Events (SSE) para notificaciones en tiempo real.
 * Cuando empleados, asistencias o nómina cambian, todos los clientes se enteran.
 */

// Almacena todas las conexiones SSE activas
const clients = new Set();

/**
 * GET /api/events
 * Los clientes se conectan aquí para recibir actualizaciones en tiempo real.
 */
const subscribe = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
    });

    // Confirmación de conexión
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    clients.add(res);
    console.log(`[SSE] Cliente conectado. Total: ${clients.size}`);

    // Heartbeat cada 30s para mantener la conexión viva a través de Nginx
    const heartbeat = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        } catch {
            clearInterval(heartbeat);
            clients.delete(res);
        }
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(res);
        console.log(`[SSE] Cliente desconectado. Total: ${clients.size}`);
    });
};

/**
 * Enviar un evento a todos los clientes conectados.
 * @param {string} type - Tipo de evento: 'employee_created', 'employee_updated', etc.
 * @param {object} data - Datos adicionales del evento
 */
const broadcast = (type, data = {}) => {
    const message = JSON.stringify({ type, ...data });
    const dead = [];
    clients.forEach((client) => {
        try {
            client.write(`data: ${message}\n\n`);
        } catch {
            dead.push(client);
        }
    });
    dead.forEach((c) => clients.delete(c));
};

module.exports = { subscribe, broadcast };
