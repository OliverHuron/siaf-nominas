const os = require('os');
const { execSync } = require('child_process');

class MonitorController {
    // GET /api/monitor/metrics — CPU, RAM, uptime, load average
    getMetrics = (req, res) => {
        try {
            const cpus = os.cpus();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;

            // Calcular uso de CPU promedio
            const cpuUsage = cpus.reduce((acc, cpu) => {
                const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
                const idle = cpu.times.idle;
                return acc + ((total - idle) / total) * 100;
            }, 0) / cpus.length;

            res.json({
                success: true,
                cpu: {
                    usage: parseFloat(cpuUsage.toFixed(1)),
                    model: cpus[0]?.model || 'N/A',
                    cores: cpus.length,
                    speed: cpus[0]?.speed || 0
                },
                memory: {
                    total: totalMem,
                    used: usedMem,
                    free: freeMem,
                    usedPercent: parseFloat(((usedMem / totalMem) * 100).toFixed(1))
                },
                system: {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    uptime: os.uptime(),
                    loadAvg: os.loadavg(),
                    nodeVersion: process.version
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error obteniendo métricas del servidor' });
        }
    };

    // GET /api/monitor/processes — procesos PM2 (solo en producción)
    getProcesses = (req, res) => {
        try {
            let processes = [];
            if (process.env.NODE_ENV === 'production') {
                const output = execSync('pm2 jlist 2>/dev/null', { timeout: 5000 }).toString();
                const pm2List = JSON.parse(output);
                processes = pm2List.map(p => ({
                    name: p.name,
                    status: p.pm2_env?.status || 'unknown',
                    cpu: p.monit?.cpu ?? null,
                    memory: p.monit?.memory ?? null,
                    restarts: p.pm2_env?.restart_time ?? 0,
                    uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null
                }));
            }
            res.json({ success: true, data: processes });
        } catch {
            res.json({ success: true, data: [] }); // No fallar si PM2 no está disponible
        }
    };
}

module.exports = new MonitorController();
