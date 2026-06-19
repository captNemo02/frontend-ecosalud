import React from 'react';

const RecordatorioModal = ({ isOpen, onClose, data }) => {
  // Si no está abierto o no hay datos de la cita, no renderiza nada
  if (!isOpen || !data || !data.cita) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <span style={iconStyle}>🔔</span>
          <h3 style={titleStyle}>¡Recordatorio de Cita Médica!</h3>
        </div>
        
        <p style={textStyle}>Hola, te recordamos que tienes una cita programada en la clínica:</p>
        
        <div style={cardStyle}>
          <p style={itemStyle}>📅 <strong>Fecha:</strong> {data.cita.fecha}</p>
          <p style={itemStyle}>⏰ <strong>Hora:</strong> {data.cita.hora || 'Por confirmar'}</p>
          <p style={itemStyle}>📍 <strong>Sede:</strong> Sede N° {data.cita.sede_id}</p>
        </div>

        <p style={{
          ...daysStyle,
          color: data.dias_restantes === 0 ? '#e53e3e' : '#dd6b20'
        }}>
          {data.dias_restantes === 0 
            ? "¡Tu cita es el día de hoy!" 
            : `Faltan ${data.dias_restantes} días para tu cita.`}
        </p>

        <button onClick={onClose} style={buttonStyle}>Entendido</button>
      </div>
    </div>
  );
};

// Estilos rápidos en línea (puedes cambiarlos por clases de Tailwind o CSS normal)
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalStyle = { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center', fontFamily: 'Arial, sans-serif' };
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' };
const iconStyle = { fontSize: '24px' };
const titleStyle = { margin: 0, color: '#2b6cb0', fontSize: '20px', fontWeight: 'bold' };
const textStyle = { color: '#4a5568', fontSize: '14px', margin: '0 0 16px 0' };
const cardStyle = { backgroundColor: '#f7fafc', padding: '14px', borderRadius: '8px', textAlign: 'left', borderLeft: '4px solid #2b6cb0', marginBottom: '16px' };
const itemStyle = { margin: '6px 0', color: '#2d3748', fontSize: '14px' };
const daysStyle = { fontWeight: 'bold', fontSize: '15px', marginBottom: '20px' };
const buttonStyle = { backgroundColor: '#2b6cb0', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'background 0.2s', width: '100%' };

export default RecordatorioModal;

