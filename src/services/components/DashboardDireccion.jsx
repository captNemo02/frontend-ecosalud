import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, UserCheck, UserX, UserMinus, Loader2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];

export default function DashboardDireccion() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reemplaza con la URL exacta de tu backend si mapeas en un puerto distinto
    fetch('http://localhost:8000/clinica/direccion/gestion-pacientes')
      .then((res) => {
        if (!res.ok) throw new Error('Error al conectar con el servidor analítico');
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500 font-medium">Cargando métricas de dirección...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg inline-block max-w-md shadow-sm border border-red-200">
          <p className="font-bold">Error Operativo</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { resumen_general, distribucion_segmento, rangos_etarios } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans text-gray-800">
      {/* Encabezado del Panel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel de Dirección Médica</h1>
        <p className="text-gray-500 mt-1">Indicadores analíticos globales del módulo de gestión de pacientes.</p>
      </div>

      {/* 1. SECCIÓN DE TARJETAS (KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Tarjeta: Total Registrados */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase">Pacientes Registrados</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{resumen_general.total_registrados}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Tarjeta: Activos */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase">Usuarios Activos</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">{resumen_general.usuarios_activos}</h3>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Tarjeta: Inactivos */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase">Usuarios Inactivos</p>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">{resumen_general.usuarios_inactivos}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
            <UserX className="h-6 w-6" />
          </div>
        </div>

        {/* Tarjeta: Eliminados */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase">Cuentas Eliminadas</p>
            <h3 className="text-2xl font-bold text-red-500 mt-1">{resumen_general.usuarios_eliminados}</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-500 rounded-lg">
            <UserMinus className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico 1: Composición por Género (Torta/Pie) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-5 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Composición por Género</h2>
          <p className="text-xs text-gray-400 mb-4">Distribución porcentual de la población clínica.</p>
          <div className="flex-1 h-64 min-h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribucion_segmento}
                  dataKey="cantidad"
                  nameKey="criterio"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  label={({ criterio }) => criterio}
                >
                  {distribucion_segmento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Rangos Etarios (Barras) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-7 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Segmentación Operativa por Edad</h2>
          <p className="text-xs text-gray-400 mb-4">Clasificación demográfica activa en tiempo real.</p>
          <div className="flex-1 h-64 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rangos_etarios} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="rango" tick={{ fill: '#9ca3af', fontSize: 12 }} stroke="#e5e7eb" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} stroke="#e5e7eb" />
                <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value) => [`${value} Pacientes`, 'Volumen']} />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {rangos_etarios.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
