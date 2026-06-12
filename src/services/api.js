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

  // --- Sub-recursos del Paciente ---
  async getHistorialClinico(id) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/${id}/historial-clinico`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener el historial clínico");
    }
    return await response.json();
  },

  async getRecetas(id) {
    const response = await secureRequest(`${API_BASE_URL}/paciente/${id}/recetas`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener las recetas médicas");
    }
    return await response.json();
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
    const response = await secureRequest(`${API_BASE_URL}/clinica/citas/paciente/${pacienteId}`, { method: "GET" }, true);
    if (!response.ok) {
      throw new Error("Error al obtener las citas del paciente");
    }
    return await response.json();
  },

  async crearCita(data) {
    const response = await secureRequest(`${API_BASE_URL}/clinica/cita`, {
      method: "POST",
      body: JSON.stringify(data),
    }, true);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Error al agendar la cita");
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
  }
};
