const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper to construct headers with the current access token
function getHeaders(secured = true) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (secured) {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

// Wrapper to perform requests and automatically handle 401 token refresh retries
async function secureRequest(url, options = {}, secured = true) {
  let headers = getHeaders(secured);
  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && secured) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        // Attempt to refresh the access token using the refresh token
        const refreshResponse = await fetch(`${API_BASE_URL}/paciente/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem("access_token", refreshData.access_token);

          // Retry the original request with the new access token
          headers = getHeaders(secured);
          response = await fetch(url, { ...options, headers });
        } else {
          // If refresh token is expired or rejected, clear session and log out
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("paciente_id");
          window.dispatchEvent(new CustomEvent("auth_session_expired"));
        }
      } catch (error) {
        console.error("Auto refresh interceptor error:", error);
      }
    } else {
      // No refresh token available, trigger logout
      window.dispatchEvent(new CustomEvent("auth_session_expired"));
    }
  }

  return response;
}

export const apiService = {
  // --- Autenticación ---
  async loginPaciente(email, numero_documento) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/login`, {
      method: "POST",
      body: JSON.stringify({ email, numero_documento }),
    }, false);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al iniciar sesión");
    }
    return await response.json();
  },

  async refrescarToken(refresh_token) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/refresh`, {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }, false);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al refrescar token");
    }
    return await response.json();
  },

  // --- Pacientes CRUD ---
  async getPacientes() {
    // Unsecured or secured depending on context, we make it secured
    const response = await secureRequest(`${API_BASE_URL}/pacientes`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener la lista de pacientes");
    }
    return await response.json();
  },

  async registrarPaciente(data) {
    // Register is public
    const response = await secureRequest(`${API_BASE_URL}/paciente/registro`, {
      method: "POST",
      body: JSON.stringify(data),
    }, false);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al registrar el paciente");
    }
    return await response.json();
  },

  async getPaciente(id) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/${id}`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener los detalles del paciente");
    }
    return await response.json();
  },

  async actualizarPaciente(id, data) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, true);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al actualizar el paciente");
    }
    return await response.json();
  },
/*
  // --- Sub-recursos del Paciente ---
  async getHistorialClinico(id) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/${id}/historial-clinico`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener el historial clínico");
    }
    return await response.json();
  },*/    
  // --- Sub-recursos del Paciente ---

  async getHistorialClinico(id) {
  const doctorId = 1;

  const response = await secureRequest(
    `https://serviciodoctor.onrender.com/doctor/consulta-paciente?paciente_id=${id}&doctor_id=${doctorId}`,
    { method: "GET" },
    true
  );

  if (!response.ok) {
    throw new Error("Error al obtener el historial clínico desde el servicio doctor");
  }

const data = await response.json();

console.log("Historial recibido:", data);
    
  const diagnosticos = (data.diagnosticos || []).map((diag) => ({
    id: `diag-${diag.id}`,
    tipo_registro: "DIAGNOSTICO",
    titulo: diag.nombre_diagnostico,
    fecha_evento: diag.fecha,
    descripcion: `${diag.descripcion} | CIE: ${diag.codigo_cie} | Gravedad: ${diag.gravedad}`,
    receta: "No aplica",
    tratamiento_posterior: "Según evaluación médica",
    medico_responsable: data.consultado_por?.nombre || "No registrado",
  }));

  const ordenes = (data.ordenes_medicas || []).map((orden) => ({
    id: `orden-${orden.id}`,
    tipo_registro: "ORDEN",
    titulo: orden.tipo,
    fecha_evento: orden.vencimiento,
    descripcion: orden.detalle,
    receta: "No aplica",
    tratamiento_posterior: `Estado: ${orden.estado}`,
    medico_responsable: data.consultado_por?.nombre || "No registrado",
  }));

  return [...diagnosticos, ...ordenes];
},
  
  // --- Fin-hisotrial del Paciente ---

 async getRecetas(id) {
  const response = await secureRequest(`${API_BASE_URL}/paciente/${id}/recetas-remotas`, { method: "GET" }, true);

  if (!response.ok) {
    throw new Error("Error al obtener las recetas médicas del microservicio de doctores");
  }

  const data = await response.json();

  // Si el backend devuelve { paciente_id: 1, recetas: [...] }
  if (data.recetas) {
    return data.recetas;
  }

  // Si el backend devuelve directamente [...]
  if (Array.isArray(data)) {
    return data;
  }

  return [];
},

  async getOrdenesMedicas(id) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/${id}/ordenes-medicas`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener las órdenes médicas");
    }
    return await response.json();
  },

  // --- Clínicas / Citas ---
  async getSedes() {
    const response = await secureRequest(`${API_BASE_URL}/clinica/sedes`, { method: "GET" }, false);
    if (!response.ok) {
      throw new Error("Error al obtener las sedes");
    }
    return await response.json();
  },

  async getCitasPaciente(pacienteId) {
    const response = await fetch(`https://api-clinica-soa.onrender.com/clinica/citas?paciente_id=${pacienteId}`, {
      method: "GET"
    });
    if (!response.ok) {
      throw new Error("Error al obtener las citas del paciente");
    }
    return await response.json();
  },

  async crearCita(data) {
    const response = await fetch("https://api-clinica-soa.onrender.com/clinica/cita", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clinica_id: data.clinica_id,
        sede_id: data.sede_id,
        paciente_id: data.paciente_id,
        doctor_id: data.doctor_id,
        fecha_hora: data.fecha_hora,
        duracion_minutos: data.duracion_minutos || 30,
        motivo: data.motivo
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al agendar la cita");
    }
    return await response.json();
  },

  async cancelarCita(citaId) {
    const response = await fetch(`https://api-clinica-soa.onrender.com/clinica/cita/${citaId}/estado?nuevo_estado=CANCELADA`, {
      method: "PUT"
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al cancelar la cita");
    }
    return await response.json();
  },

  async getDoctoresActivos() {
    const response = await fetch("https://serviciodoctor.onrender.com/doctores?activo=true", {
      method: "GET"
    });
    if (!response.ok) {
      throw new Error("Error al obtener la lista de doctores");
    }
    return await response.json();
  },

  // --- Doctores / Órdenes Médicas ---
  async crearOrdenMedica(data) {
    const response = await secureRequest(`${API_BASE_URL}/doctor/orden-medica`, {
      method: "POST",
      body: JSON.stringify(data),
    }, false); // Mock doctor order endpoint is public to simulate the Doctor module

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al emitir la orden médica");
    }
    return await response.json();
  },

  // --- Multi-Factor Authentication (MFA) ---
  async verifyMFA(mfa_token, code) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/verify-mfa`, {
      method: "POST",
      body: JSON.stringify({ mfa_token, code }),
    }, false);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Código de verificación incorrecto o expirado");
    }
    return await response.json();
  },

  async resendMFA(mfa_token) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/resend-mfa`, {
      method: "POST",
      body: JSON.stringify({ mfa_token }),
    }, false);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al reenviar el código");
    }
    return await response.json();
  }
};
