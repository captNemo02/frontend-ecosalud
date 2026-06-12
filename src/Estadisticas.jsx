// src/Estadisticas.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Estadisticas() {
  const [resumen, setResumen] = useState({ total_pacientes: 0, pacientes_activos: 0, pacientes_inactivos: 0 });
  const [datosGenero, setDatosGenero] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatosEstadisticos = async () => {
      try {
        const BASE_URL = "http://localhost:8000"; // Asegúrate de colocar el puerto donde corre tu FastAPI

        // Ejecutamos ambas consultas en paralelo para mejorar el rendimiento
        const [resResumen, resGenero] = await Promise.all([
          fetch(`${BASE_URL}/pacientes/estadisticas/resumen`),
          fetch(`${BASE_URL}/pacientes/estadisticas/genero`)
        ]);

        if (!resResumen.ok || !resGenero.ok) {
          throw new Error("No se pudieron recuperar los indicadores del backend.");
        }

        const dataResumen = await resResumen.json();
        const dataGenero = await resGenero.json();

        setResumen(dataResumen);
        setDatosGenero(dataGenero);
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        setError("Hubo un problema al conectar con el servidor de analíticas.");
      } finally {
        setLoading(false);
      }
    };

    cargarDatosEstadisticos();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Procesando indicadores de SQLAlchemy...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#ef4444' }}>
        <p style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ {error}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verifica que el servicio de FastAPI esté encendido.</p>
      </div>
    );
  }

  // Paleta cromática para la gráfica circular
  const COLORES_PIE = ['#3b82f6', '#ec4899', '#64748b', '#10b981'];

  return (
    <div className="card" style={{ animation: "fadeIn 0.3s ease-in-out" }}>
      <h2 className="card-title">📊 Módulo de Estadísticas del Ecosistema</h2>
      <p className="card-subtitle">Indicadores de gestión de dirección y distribución demográfica de la población.</p>

      {/* --- PANEL DE DIRECCIÓN: INDICADORES DE GESTIÓN (KPIs) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        
        <div style={{ ...kpiStyle, borderLeft: '4px solid var(--accent-teal)' }}>
          <span style={kpiLabelStyle}>Total Histórico Registrado</span>
          <strong style={kpiValueStyle}>{resumen.total_pacientes}</strong>
          <span style={kpiSubStyle}>Pacientes en el ecosistema</span>
        </div>

        <div style={{ ...kpiStyle, borderLeft: '4px solid #10b981' }}>
          <span style={kpiLabelStyle}>Pacientes Activos</span>
          <strong style={{ ...kpiValueStyle, color: '#10b981' }}>{resumen.pacientes_activos}</strong>
          <span style={kpiSubStyle}>Con acceso vigente al portal</span>
        </div>

        <div style={{ ...kpiStyle, borderLeft: '4px solid #ef4444' }}>
          <span style={kpiLabelStyle}>Pacientes Inactivos</span>
          <strong style={{ ...kpiValueStyle, color: '#ef4444' }}>{resumen.pacientes_inactivos}</strong>
          <span style={kpiSubStyle}>Cuentas suspendidas o de baja</span>
        </div>

      </div>

      {/* --- PANEL DE LA CLÍNICA: REPORTES GRÁFICOS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Gráfico 1: Barras de distribución por género */}
        <div style={chartContainerStyle}>
          <h4 style={chartTitleStyle}>📊 Volumen de Pacientes por Género</h4>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={datosGenero} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="genero" stroke="#94a3b8" style={{ fontSize: '0.8rem' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '0.8rem' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" name="Cantidad de Pacientes" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Representación Porcentual (Donut Chart) */}
        <div style={chartContainerStyle}>
          <h4 style={chartTitleStyle}>🍩 Representación Porcentual Demográfica</h4>
          <div style={{ width: '100%', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosGenero}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="cantidad"
                  nameKey="genero"
                >
                  {datosGenero.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}


const kpiStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid var(--border-color, #e2e8f0)',
  padding: '1.2rem',
  borderRadius: 'var(--radius-md, 8px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem'
};

const kpiLabelStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary, #64748b)',
  fontWeight: '500'
};

const kpiValueStyle = {
  fontSize: '2rem',
  color: 'var(--accent-teal, #0d9488)',
  fontWeight: '800'
};

const kpiSubStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted, #94a3b8)'
};

const chartContainerStyle = {
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: 'var(--radius-md, 8px)',
  padding: '1.2rem',
  backgroundColor: '#ffffff'
};

const chartTitleStyle = {
  margin: '0 0 1rem 0',
  color: 'var(--text-primary, #1e293b)',
  fontSize: '1rem',
  fontWeight: '700'
};