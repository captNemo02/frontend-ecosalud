
// src/Estadisticas.jsx
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

export default function Estadisticas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarMetricasPaciente = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        // 1. Conseguimos el token y el ID del paciente desde el almacenamiento de tu App.jsx
        const token = localStorage.getItem("access_token");
        const pacienteId = localStorage.getItem("paciente_id");

        if (!token || !pacienteId) {
          throw new Error("No se encontró una sesión activa o un ID de paciente válido.");
        }

        // 2. CORRECCIÓN DE RUTA: Ajustada exactamente a tu backend de FastAPI metiendo la ID al final
        const response = await fetch(`${BASE_URL}/dashboard/metricas-personales/${pacienteId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Sesión expirada o no autorizada. Por favor, vuelva a loguearse.");
          }
          throw new Error("No se pudieron recuperar las métricas analíticas del servidor.");
        }

        const resultData = await response.json();
        setData(resultData);
      } catch (err) {
        console.error("Error cargando estadísticas del paciente:", err);
        setError(err.message || "Hubo un problema al conectar con el servidor de analíticas.");
      } finally {
        setLoading(false);
      }
    };


    cargarMetricasPaciente();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Procesando indicadores clínicos con SQLAlchemy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
        <p style={{ color: '#ef4444', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}> Error de Analíticas</p>
        <p style={{ fontSize: '0.9rem', color: '#b91c1c', margin: 0 }}>{error}</p>
        <p style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '0.5rem' }}>Asegúrate de que FastAPI y PostgreSQL estén corriendo correctamente.</p>
      </div>
    );
  }

  // Paleta cromática coordinada con la estética de Ecosalud (Teal, Cyan, Azul, Naranja, Rojo)
  const COLORES_GRAFICOS = ['#14b8a6', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="card" style={{ animation: "fadeIn 0.3s ease-in-out", padding: '1.5rem' }}>
      {/* --- ENCABEZADO DEL DASHBOARD --- */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="card-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Mi Portal Clínico Analítico</h2>
        <p className="card-subtitle" style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary, #64748b)' }}>
          Paciente: <strong style={{ color: 'var(--accent-teal, #0d9488)' }}>{data?.paciente_nombre}</strong> | Historial analítico de asistencias, tratamientos y tendencias de salud.
        </p>
      </div>

      {/* --- REJILLA DE REPORTES GRÁFICOS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

        {/* Gráfico 1: Asistencia y Estado de Citas (Donut Chart) */}
        <div style={chartContainerStyle}>
          <h4 style={chartTitleStyle}> Asistencia y Estado de Citas</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.grafico_citas}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data?.grafico_citas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES_GRAFICOS[index % COLORES_GRAFICOS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Citas`, 'Volumen Total']} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Balance de Medicamentos Emitidos (Bar Chart) */}
        <div style={chartContainerStyle}>
          <h4 style={chartTitleStyle}> Balance de Medicamentos y Recetas</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.grafico_recetas} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="estado" stroke="#94a3b8" style={{ fontSize: '0.75rem', fontWeight: '600' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '0.75rem' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${value} Recetas`, 'Cantidad']} />
                <Bar dataKey="cantidad" name="Total Recetas" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                  {data?.grafico_recetas.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.estado === 'VIGENTE' ? '#10b981' : entry.estado === 'CADUCADO' ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Evolución Temporal de Visitas (Line Chart) - Ocupa ancho completo */}
        <div style={{ ...chartContainerStyle, gridColumn: '1 / -1' }}>
          <h4 style={chartTitleStyle}>Evolución Cronológica de Visitas Médicas</h4>
          <p style={{ margin: '-0.5rem 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>Tendencia temporal combinada por mes y año de atención.</p>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.grafico_tendencia} margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="periodo" stroke="#94a3b8" style={{ fontSize: '0.8rem' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '0.8rem' }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line
                  type="monotone"
                  dataKey="visitas"
                  name="Consultas Médicas"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                  dot={{ strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- ESTILOS COMPATIBLES CON TU INTERFAZ ---
const chartContainerStyle = {
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: 'var(--radius-md, 8px)',
  padding: '1.2rem',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
};

const chartTitleStyle = {
  margin: '0 0 1rem 0',
  color: 'var(--text-primary, #1e293b)',
  fontSize: '1rem',
  fontWeight: '700'
};
