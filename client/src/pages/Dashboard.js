import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { FaUsers, FaChalkboardTeacher, FaUserTie, FaCalendarCheck, FaServer, FaCircle } from 'react-icons/fa';
import api from '../services/api';
import useSSE from '../hooks/useSSE';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// ── Sub-componentes ───────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: color }}>{icon}</div>
    <div className="stat-content">
      <h3 style={{ color }}>{value ?? '—'}</h3>
      <p>{label}</p>
      {sub && <span className="stat-subtitle">{sub}</span>}
    </div>
  </div>
);

const MetricBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const barColor = pct > 85 ? '#ef4444' : pct > 60 ? '#f97316' : color;
  return (
    <div className="metric-bar">
      <div className="metric-bar__header">
        <span>{label}</span><span style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="metric-bar__track">
        <div className="metric-bar__fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="metric-bar__sub">{value?.toLocaleString()} / {max?.toLocaleString()}</div>
    </div>
  );
};

// ── Página Principal ──────────────────────────────────────────
const Dashboard = () => {
  const [empStats, setEmpStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [faltasPorMes, setFaltasPorMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadEmployeeStats = useCallback(async () => {
    try {
      const res = await api.get('/api/employees/stats');
      setEmpStats(res.data.data);
      setLastUpdate(new Date());
    } catch (e) { console.error('Error cargando stats empleados:', e); }
  }, []);

  const loadServerMetrics = useCallback(async () => {
    try {
      const [metricsRes, processesRes] = await Promise.all([
        api.get('/api/monitor/metrics'),
        api.get('/api/monitor/processes')
      ]);
      setMetrics(metricsRes.data);
      setProcesses(processesRes.data.data || []);
    } catch (e) { console.error('Error cargando métricas:', e); }
  }, []);

  const loadAttendanceStats = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const res = await api.get(`/api/attendance/faltas-por-mes?year=${year}`);
      setFaltasPorMes(res.data.data || []);
    } catch { setFaltasPorMes([]); }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadEmployeeStats(), loadServerMetrics(), loadAttendanceStats()]);
      setLoading(false);
    };
    init();
    const metricsInterval = setInterval(loadServerMetrics, 15000); // cada 15s
    const empInterval = setInterval(loadEmployeeStats, 60000); // cada 1 min
    return () => { clearInterval(metricsInterval); clearInterval(empInterval); };
  }, [loadEmployeeStats, loadServerMetrics, loadAttendanceStats]);

  // SSE: actualizar empleados en tiempo real cuando haya cambios
  useSSE({
    employee_created: () => loadEmployeeStats(),
    employee_updated: () => loadEmployeeStats(),
  });

  // ── Datos gráficas ──────────────────────────────────────────

  const donutData = {
    labels: ['Docentes', 'Administrativos'],
    datasets: [{
      data: [parseInt(empStats?.docentes || 0), parseInt(empStats?.administrativos || 0)],
      backgroundColor: ['rgba(99,102,241,0.3)', 'rgba(56,189,248,0.3)'],
      borderColor: ['#6366f1', '#38bdf8'],
      borderWidth: 2,
    }],
  };

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const barData = {
    labels: meses,
    datasets: [{
      label: 'Faltas',
      data: meses.map((_, i) => {
        const found = faltasPorMes.find(f => parseInt(f.mes) === i + 1);
        return found ? parseInt(found.total) : 0;
      }),
      backgroundColor: 'rgba(239,68,68,0.35)',
      borderColor: '#ef4444',
      borderWidth: 2,
      borderRadius: 5,
    }]
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#64748b', font: { size: 11 } } }
    }
  };
  const barOpts = {
    ...chartOpts,
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true }
    }
  };

  const totalRamMb = metrics ? Math.round(metrics.memory.total / 1024 / 1024) : 4096;
  const usedRamMb = metrics ? Math.round(metrics.memory.used / 1024 / 1024) : 0;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard — SIAF Nóminas</h1>
        <p className="dashboard-subtitle">
          {lastUpdate && <>Actualizado: {lastUpdate.toLocaleTimeString('es-MX')}</>}
          <span className="sse-indicator"><FaCircle size={8} color="#22c55e" /> En vivo</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard icon={<FaUsers />} label="Total Empleados" value={empStats?.total} sub={`${empStats?.activos ?? 0} activos`} color="#6366f1" />
        <StatCard icon={<FaChalkboardTeacher />} label="Docentes" value={empStats?.docentes} sub="Personal docente" color="#38bdf8" />
        <StatCard icon={<FaUserTie />} label="Administrativos" value={empStats?.administrativos} sub="Personal administrativo" color="#10b981" />
        <StatCard icon={<FaCalendarCheck />} label="Faltas este año" value={faltasPorMes.reduce((a, f) => a + parseInt(f.total || 0), 0)} sub={`${new Date().getFullYear()}`} color="#f59e0b" />
      </div>

      {/* Gráficas */}
      <div className="dashboard-grid" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header"><h3>Distribución de Personal</h3><span className="card-subtitle">Por tipo</span></div>
          <div style={{ height: 240 }}>
            <Doughnut data={donutData} options={{ ...chartOpts, scales: undefined }} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Faltas por Mes</h3><span className="card-subtitle">{new Date().getFullYear()}</span></div>
          <div style={{ height: 240 }}>
            <Bar data={barData} options={barOpts} />
          </div>
        </div>
      </div>

      {/* Métricas del servidor */}
      {metrics && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><FaServer style={{ marginRight: 8 }} />Servidor</h3>
            <span className="card-subtitle">
              {metrics.system.hostname} · Uptime: {Math.floor(metrics.system.uptime / 3600)}h {Math.floor((metrics.system.uptime % 3600) / 60)}m
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <MetricBar label="CPU" value={metrics.cpu.usage} max={100} color="#6366f1" />
            <MetricBar label="RAM" value={usedRamMb} max={totalRamMb} color="#38bdf8" />
          </div>
          {processes.length > 0 && (
            <div className="table-wrapper" style={{ marginTop: 16 }}>
              <table className="table">
                <thead>
                  <tr><th>Proceso PM2</th><th>Estado</th><th>CPU</th><th>Memoria</th><th>Reinicios</th></tr>
                </thead>
                <tbody>
                  {processes.map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td><span className={`badge ${p.status === 'online' ? 'badge-success' : 'badge-error'}`}>{p.status}</span></td>
                      <td>{p.cpu ?? '—'}%</td>
                      <td>{p.memory ? `${(p.memory / 1024 / 1024).toFixed(1)} MB` : '—'}</td>
                      <td>{p.restarts ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
