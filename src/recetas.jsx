import React from 'react';

const Recetas = ({ recetasList }) => {
  return (
    <div className="card">
      <h2 className="card-title">Mis Prescripciones y Recetas Médicas</h2>
      <p className="card-subtitle">Listado de tratamientos emitidos por el consultorio de EcoSalud y su vigencia en farmacia.</p>

      {recetasList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
          🫙 No tienes recetas médicas prescritas actualmente en tu historial.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
          {recetasList.map((receta) => {
            // Validar si la receta ya pasó su fecha límite de vigencia
            const estadoReceta = receta.estado || "SIN ESTADO";
            const esVencido = estadoReceta === "CADUCADO" || estadoReceta === "VENCIDO";
            
            return (
              <div 
                key={receta.id} 
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderLeft: esVencido ? "5px solid #e53e3e" : "5px solid var(--accent-teal)"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                    <span style={{ fontWeight: "700", fontSize: "1.2rem", color: "var(--accent-teal)" }}>
                      {receta.medicamento}
                    </span>
                    <span style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      backgroundColor: esVencido ? "#fed7d7" : "#c6f6d5",
                      color: esVencido ? "#c53030" : "#22543d"
                    }}>
                      {estadoReceta}
                    </span>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "1rem 0" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      <strong>Dosis:</strong> {receta.dosis || "No especificada"}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      <strong>Duración:</strong> {receta.duracion || "Hasta nueva orden"}
                    </div>
                    {receta.indicaciones && (
                      <div style={{ 
                        fontStyle: "italic", 
                        fontSize: "0.85rem", 
                        color: "var(--text-secondary)", 
                        backgroundColor: "#f7fafc", 
                        padding: "8px 12px", 
                        borderRadius: "6px",
                        borderLeft: "2px solid #cbd5e0",
                        marginTop: "6px"
                      }}>
                        "{receta.indicaciones}"
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  fontSize: "0.8rem", 
                  color: "var(--text-muted)", 
                  borderTop: "1px solid #edf2f7", 
                  paddingTop: "0.8rem",
                  marginTop: "0.5rem" 
                }}>
                  <span>Emitido: {receta.fecha_emision}</span>
                  {receta.fecha_vencimiento && (
                    <span style={{ 
                      color: esVencido ? "#e53e3e" : "inherit", 
                      fontWeight: esVencido ? "700" : "500" 
                    }}>
                      Límite: {receta.fecha_vencimiento}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Recetas;
