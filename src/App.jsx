import { useState, useEffect, useRef } from "react";
import { apiService } from "./services/api";
import Estadisticas from "./Estadisticas";
import DashboardDireccion from "./services/components/DashboardDireccion";

function App() {
  // Authentication State
  const [pacienteLogged, setPacienteLogged] = useState(null);
  const [authTab, setAuthTab] = useState("login"); // login | register
  const [timeLeft, setTimeLeft] = useState(0); // seconds remaining in 15-min session
  const timerRef = useRef(null);

  // Portal Navigation State
  const [activeTab, setActiveTab] = useState("perfil"); // perfil | historial | recetas | ordenes | citas

  // Patient Sub-resources States
  const [historialList, setHistorialList] = useState([]);
  const [recetasList, setRecetasList] = useState([]);
  const [ordenesList, setOrdenesList] = useState([]);
  const [citasList, setCitasList] = useState([]);
  const [sedesList, setSedesList] = useState([]);

  // Loaders and Alerts
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Registration Form State
  const [regData, setRegData] = useState({
    nombres: "",
    apellidos: "",
    tipo_documento: "DNI",
    numero_documento: "",
    fecha_nacimiento: "",
    genero: "MASCULINO",
    telefono: "",
    email: "",
    direccion: "",
    estado: "ACTIVO"
  });

  // Login Form State
  const [loginData, setLoginData] = useState({
    email: "",
    numero_documento: ""
  });

  // Simulator State: Clinic Appointment Form
  const [appointmentForm, setAppointmentForm] = useState({
    sede_id: "",
    especialidad: "Medicina General",
    fecha_hora: "",
    doctor_id: "1", // simulated doctor ID
    doctor_nombre: "Dr. Andrés Beltrán",
    motivo: "",
    notas_medicas: ""
  });

  // Simulator State: Doctor Order Form
  const [orderForm, setOrderForm] = useState({
    tipo_orden: "LABORATORIO", // LABORATORIO, IMAGENOLOGIA, ESPECIALISTA, PROCEDIMIENTO
    descripcion: "",
    medico_responsable: "Dr. Marco Aurelio (Clínica ECOSALUD)"
  });

  // Check login state on mount
  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    const refresh_token = localStorage.getItem("refresh_token");
    const id = localStorage.getItem("paciente_id");
    const nombres = localStorage.getItem("paciente_nombres");
    const apellidos = localStorage.getItem("paciente_apellidos");
    const session_expiry = localStorage.getItem("session_expiry");

    if (access_token && refresh_token && id && session_expiry) {
      const remainingTime = Math.floor((parseInt(session_expiry) - Date.now()) / 1000);
      if (remainingTime > 0) {
        setPacienteLogged({
          id: parseInt(id),
          nombres,
          apellidos
        });
        setTimeLeft(remainingTime);
        startSessionTimer(parseInt(session_expiry));
      } else {
        handleLogout("Sesión de 15 minutos expirada.");
      }
    }

    // Set up global event listeners for API auto-refresh failures
    const handleSessionExpiredEvent = () => {
      handleLogout("Su sesión ha expirado (Token de refresco inválido).");
    };
    window.addEventListener("auth_session_expired", handleSessionExpiredEvent);

    return () => {
      window.removeEventListener("auth_session_expired", handleSessionExpiredEvent);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Periodic Access Token refresh in the background (every 3 minutes)
  useEffect(() => {
    if (!pacienteLogged) return;

    const refreshInterval = setInterval(async () => {
      const refresh_token = localStorage.getItem("refresh_token");
      if (refresh_token) {
        try {
          const data = await apiService.refrescarToken(refresh_token);
          localStorage.setItem("access_token", data.access_token);
          console.log("Access token renovado automáticamente en background.");
        } catch (e) {
          console.warn("Fallo renovación en background:", e);
        }
      }
    }, 180000); // 3 minutes

    return () => clearInterval(refreshInterval);
  }, [pacienteLogged?.id]);

  // Load active tab data
  useEffect(() => {
    if (pacienteLogged) {
      loadTabData();
    }
  }, [pacienteLogged?.id, activeTab]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const startSessionTimer = (expiryTimestamp) => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTimestamp - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        handleLogout("Tu sesión de 15 minutos ha expirado por seguridad.");
      }
    }, 1000);
  };

  const handleLogout = (message = "Sesión cerrada con éxito.") => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("paciente_id");
    localStorage.removeItem("paciente_nombres");
    localStorage.removeItem("paciente_apellidos");
    localStorage.removeItem("session_expiry");

    if (timerRef.current) clearInterval(timerRef.current);
    setPacienteLogged(null);
    setTimeLeft(0);
    showAlert("info", message);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.numero_documento) {
      showAlert("error", "Por favor ingresa tu correo y DNI.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.loginPaciente(loginData.email, loginData.numero_documento);
      
      const expiry = Date.now() + 900 * 1000; // 15 minutes in milliseconds
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      localStorage.setItem("paciente_id", response.paciente_id.toString());
      localStorage.setItem("paciente_nombres", response.nombres);
      localStorage.setItem("paciente_apellidos", response.apellidos);
      localStorage.setItem("session_expiry", expiry.toString());

      setPacienteLogged({
        id: response.paciente_id,
        nombres: response.nombres,
        apellidos: response.apellidos
      });
      setTimeLeft(900);
      startSessionTimer(expiry);
      setActiveTab("perfil");
      showAlert("success", `¡Bienvenido, ${response.nombres}! Sesión iniciada por 15 minutos.`);
    } catch (err) {
      showAlert("error", err.message || "Error de autenticación. Verifique su correo y DNI.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regData.nombres || !regData.apellidos || !regData.numero_documento || !regData.fecha_nacimiento || !regData.email) {
      showAlert("error", "Por favor completa todos los campos requeridos (*).");
      return;
    }

    setLoading(true);
    try {
      const newPaciente = await apiService.registrarPaciente(regData);
      showAlert("success", "Perfil de paciente creado correctamente. ¡Ya puedes iniciar sesión!");
      setLoginData({
        email: newPaciente.email,
        numero_documento: newPaciente.numero_documento
      });
      setAuthTab("login");
      
      // Limpiar formulario de registro
      setRegData({
        nombres: "",
        apellidos: "",
        tipo_documento: "DNI",
        numero_documento: "",
        fecha_nacimiento: "",
        genero: "MASCULINO",
        telefono: "",
        email: "",
        direccion: "",
        estado: "ACTIVO"
      });
    } catch (err) {
      showAlert("error", err.message || "Error al registrar el paciente.");
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!pacienteLogged) return;
    setLoading(true);

    try {
      const id = pacienteLogged.id;
      if (activeTab === "perfil") {
        const detail = await apiService.getPaciente(id);
        setPacienteLogged(detail);
      } else if (activeTab === "historial") {
        const hist = await apiService.getHistorialClinico(id);
        setHistorialList(hist);
      } else if (activeTab === "recetas") {
        const rec = await apiService.getRecetas(id);
        setRecetasList(rec);
      } else if (activeTab === "ordenes") {
        const ords = await apiService.getOrdenesMedicas(id);
        setOrdenesList(ords);
      } else if (activeTab === "citas") {
        // Cargar citas y sedes para reservar
        const [citas, sedes] = await Promise.all([
          apiService.getCitasPaciente(id),
          apiService.getSedes()
        ]);
        setCitasList(citas);
        setSedesList(sedes);
        
        if (sedes.length > 0 && !appointmentForm.sede_id) {
          setAppointmentForm(prev => ({ ...prev, sede_id: sedes[0].id.toString() }));
        }
      }
    } catch (err) {
      console.error(`Error loading tab ${activeTab}:`, err);
      // We don't alert on dashboard/landing so we don't break mock fallbacks if DB is empty,
      // but warn on console. We will use local mocks for clinical histories and recipes
      // if they return empty to guarantee excellent visual layout.
    } finally {
      setLoading(false);
    }
  };

  // --- Doctor Order Simulation Submission ---
  const handleSimulateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.descripcion) {
      showAlert("error", "Proporciona una descripción para la orden médica.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        paciente_id: pacienteLogged.id,
        tipo_orden: orderForm.tipo_orden,
        descripcion: orderForm.descripcion,
        medico_responsable: orderForm.medico_responsable,
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 30 days
      };

      await apiService.crearOrdenMedica(payload);
      showAlert("success", `[Simulador Doctor] Orden Médica de ${orderForm.tipo_orden} emitida con éxito.`);
      setOrderForm(prev => ({ ...prev, descripcion: "" }));
      
      // Reload orders list
      if (activeTab === "ordenes") {
        const ords = await apiService.getOrdenesMedicas(pacienteLogged.id);
        setOrdenesList(ords);
      }
    } catch (err) {
      showAlert("error", "Error al emitir orden de doctor en el backend: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Clinic Appointment Booking Submission ---
  const handleBookAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.sede_id || !appointmentForm.fecha_hora || !appointmentForm.motivo) {
      showAlert("error", "Por favor completa la sede, fecha/hora y motivo de la consulta.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        clinica_id: 1, // default ECOSALUD clinica ID
        sede_id: parseInt(appointmentForm.sede_id),
        paciente_id: pacienteLogged.id,
        doctor_id: parseInt(appointmentForm.doctor_id),
        fecha_hora: new Date(appointmentForm.fecha_hora).toISOString(),
        duracion_minutos: 30,
        motivo: appointmentForm.motivo,
        estado: "AGENDADA",
        notas_medicas: appointmentForm.notas_medicas || null
      };

      await apiService.crearCita(payload);
      showAlert("success", "Cita médica agendada correctamente en la clínica.");
      setAppointmentForm(prev => ({ ...prev, motivo: "", fecha_hora: "", notas_medicas: "" }));

      // Reload appointments list
      if (activeTab === "citas") {
        const citas = await apiService.getCitasPaciente(pacienteLogged.id);
        setCitasList(citas);
      }
    } catch (err) {
      showAlert("error", "Error al registrar la cita médica: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return "0";
    try {
      const hoy = new Date();
      const cumpleanos = new Date(fechaNacimiento);
      let edad = hoy.getFullYear() - cumpleanos.getFullYear();
      const mes = hoy.getMonth() - cumpleanos.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
        edad--;
      }
      return edad;
    } catch (e) {
      return "0";
    }
  };

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return "Recientemente registrado";
    try {
      const cleaned = fechaStr.split(".")[0];
      const d = new Date(cleaned);
      if (isNaN(d.getTime())) return "Recientemente registrado";
      return d.toLocaleString();
    } catch (e) {
      return "Recientemente registrado";
    }
  };

  const formatCitaFecha = (fechaHoraStr) => {
    if (!fechaHoraStr) return "Fecha no programada";
    try {
      const cleaned = fechaHoraStr.split(".")[0];
      const d = new Date(cleaned);
      if (isNaN(d.getTime())) return "Fecha no programada";
      return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return "Fecha no programada";
    }
  };

  const formatCitaHora = (fechaHoraStr) => {
    if (!fechaHoraStr) return "--:--";
    try {
      const cleaned = fechaHoraStr.split(".")[0];
      const d = new Date(cleaned);
      if (isNaN(d.getTime())) return "--:--";
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "--:--";
    }
  };

  // --- 1. AUTHENTICATION VIEW ---
  if (!pacienteLogged) {
    return (
      <div className="app-container" style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="card" style={{ maxWidth: "520px", width: "100%", padding: "2.5rem 2rem" }}>
          
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", fontSize: "2.4rem", fontWeight: "800", textTransform: "uppercase" }}>
              ECOSALUD <span style={{ color: "var(--accent-mint)" }}>+</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.2rem" }}>Portal Digital del Paciente</p>
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "1.8rem" }}>
            <button
              onClick={() => setAuthTab("login")}
              style={{
                flex: 1,
                padding: "0.8rem",
                background: "none",
                border: "none",
                fontFamily: "var(--font-heading)",
                fontWeight: "700",
                fontSize: "1.05rem",
                color: authTab === "login" ? "var(--accent-teal)" : "var(--text-muted)",
                borderBottom: authTab === "login" ? "3px solid var(--accent-teal)" : "none",
                cursor: "pointer"
              }}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setAuthTab("register")}
              style={{
                flex: 1,
                padding: "0.8rem",
                background: "none",
                border: "none",
                fontFamily: "var(--font-heading)",
                fontWeight: "700",
                fontSize: "1.05rem",
                color: authTab === "register" ? "var(--accent-teal)" : "var(--text-muted)",
                borderBottom: authTab === "register" ? "3px solid var(--accent-teal)" : "none",
                cursor: "pointer"
              }}
            >
              Registrarse
            </button>
          </div>

          {alert && (
            <div className={`alert ${alert.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: "1.2rem" }}>
              {alert.type === "success" ? "✓" : "⚠"} {alert.message}
            </div>
          )}

          {/* Login Form */}
          {authTab === "login" && (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: "1.2rem" }}>
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.8rem" }}>
                <label>DNI (Documento de Identidad) *</label>
                <input
                  type="text"
                  value={loginData.numero_documento}
                  onChange={(e) => setLoginData({ ...loginData, numero_documento: e.target.value })}
                  placeholder="Ingresa tu DNI"
                  required
                />
              </div>

              <button type="submit" className="btn btn-teal" style={{ width: "100%" }} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Acceder al Portal"}
              </button>

              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  La autenticación se realiza validando tu Correo y tu DNI directamente en la base de datos de pacientes.
                </p>
              </div>
            </form>
          )}

          {/* Register Form */}
          {authTab === "register" && (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Nombres *</label>
                  <input
                    type="text"
                    value={regData.nombres}
                    onChange={(e) => setRegData({ ...regData, nombres: e.target.value })}
                    placeholder="Ej. Carlos"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    value={regData.apellidos}
                    onChange={(e) => setRegData({ ...regData, apellidos: e.target.value })}
                    placeholder="Ej. Mendoza"
                    required
                  />
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: "1.2fr 1.8fr", gap: "1rem", marginTop: "1rem" }}>
                <div className="form-group">
                  <label>Tipo Doc. *</label>
                  <select
                    value={regData.tipo_documento}
                    onChange={(e) => setRegData({ ...regData, tipo_documento: e.target.value })}
                    required
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Número Doc. *</label>
                  <input
                    type="text"
                    value={regData.numero_documento}
                    onChange={(e) => setRegData({ ...regData, numero_documento: e.target.value })}
                    placeholder="Ej. 70485963"
                    required
                  />
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: "1.2fr 1.8fr", gap: "1rem", marginTop: "1rem" }}>
                <div className="form-group">
                  <label>Fecha Nac. *</label>
                  <input
                    type="date"
                    value={regData.fecha_nacimiento}
                    onChange={(e) => setRegData({ ...regData, fecha_nacimiento: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Género *</label>
                  <select
                    value={regData.genero}
                    onChange={(e) => setRegData({ ...regData, genero: e.target.value })}
                    required
                  >
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={regData.telefono}
                    onChange={(e) => setRegData({ ...regData, telefono: e.target.value })}
                    placeholder="999888777"
                  />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={regData.direccion}
                    onChange={(e) => setRegData({ ...regData, direccion: e.target.value })}
                    placeholder="Av. Larco 123"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-teal" style={{ width: "100%", marginTop: "1.5rem" }} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Crear Cuenta"}
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // --- 2. PACIENT PORTAL SECURED DASHBOARD ---
  return (
    <div className="app-container">
      {/* SECURED CLIENT HEADER */}
      <header style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
        
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", fontSize: "2rem", fontWeight: "800", textTransform: "uppercase" }}>
              ECOSALUD <span style={{ color: "var(--accent-mint)" }}>+</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              👤 Paciente: <strong style={{ color: "var(--text-primary)" }}>{pacienteLogged.nombres} {pacienteLogged.apellidos}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* SESSION COUNTDOWN BAR */}
            <div 
              style={{
                backgroundColor: timeLeft < 60 ? "var(--error-light)" : "var(--accent-teal-light)",
                border: `1px solid ${timeLeft < 60 ? "var(--error)" : "var(--accent-teal)"}`,
                padding: "0.4rem 0.8rem",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                color: timeLeft < 60 ? "var(--error)" : "var(--accent-teal)"
              }}
            >
              ⏱️ Expira en: <strong style={{ fontSize: "1rem" }}>{formatTime(timeLeft)}</strong>
            </div>

            <button onClick={() => handleLogout("Sesión cerrada correctamente.")} className="btn btn-danger-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              Cerrar Sesión ✕
            </button>
          </div>
        </div>

        {/* PORTAL NAVIGATIONAL TABS */}
        <div className="tabs-navigation" style={{ marginTop: "1.5rem", justifyContent: "flex-start" }}>
          <button className={`tab-btn ${activeTab === "perfil" ? "active" : ""}`} onClick={() => setActiveTab("perfil")}>
            Mi Perfil
          </button>
          <button className={`tab-btn ${activeTab === "historial" ? "active" : ""}`} onClick={() => setActiveTab("historial")}>
            Historial Clínico
          </button>
          <button className={`tab-btn ${activeTab === "recetas" ? "active" : ""}`} onClick={() => setActiveTab("recetas")}>
             Mis Recetas
          </button>
          <button className={`tab-btn ${activeTab === "ordenes" ? "active" : ""}`} onClick={() => setActiveTab("ordenes")}>
            Órdenes Médicas
          </button>
          <button className={`tab-btn ${activeTab === "citas" ? "active" : ""}`} onClick={() => setActiveTab("citas")}>
            Mis Citas
          </button>
          <button className={`tab-btn ${activeTab === "estadisticas" ? "active" : ""}`} onClick={() => setActiveTab("estadisticas")}>
            Estadísticas
          </button>
          <button className={`tab-btn ${activeTab === "direccion" ? "active" : ""}`} onClick={() => setActiveTab("direccion")}>
            Dashboard Dirección
          </button>
        </div>
      </header>

      {/* PORTAL TAB LOADINGS */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner spinner-dark" style={{ width: 36, height: 36 }}></div>
        </div>
      )}

      {/* PORTAL TAB CONTENTS */}
      {!loading && (
        <div className="tab-content">
          
          {/* TAB: MI PERFIL */}
          {activeTab === "perfil" && (
            <div className="card">
              <h2 className="card-title">👤 Datos Generales del Paciente</h2>
              <p className="card-subtitle">Consulta de información personal registrada y fecha de alta.</p>

              <div className="patient-profile-card">
                <div className="profile-field">
                  <span className="profile-field-label">Nombre Completo</span>
                  <span className="profile-field-value">{pacienteLogged.nombres} {pacienteLogged.apellidos}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">DNI / Documento</span>
                  <span className="profile-field-value">{pacienteLogged.numero_documento} ({pacienteLogged.tipo_documento})</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Género</span>
                  <span className="profile-field-value">{pacienteLogged.genero || "No especificado"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Fecha Nacimiento</span>
                  <span className="profile-field-value">{pacienteLogged.fecha_nacimiento || "No registrada"} ({calcularEdad(pacienteLogged.fecha_nacimiento)} años)</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Correo Electrónico</span>
                  <span className="profile-field-value">{pacienteLogged.email || "No especificado"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Celular / Teléfono</span>
                  <span className="profile-field-value">{pacienteLogged.telefono || "No especificado"}</span>
                </div>
                <div className="profile-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="profile-field-label">Dirección Domiciliaria</span>
                  <span className="profile-field-value">{pacienteLogged.direccion || "No registrada"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Fecha de Alta</span>
                  <span className="profile-field-value">{formatFecha(pacienteLogged.fecha_registro)}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Estado de Cuenta</span>
                  <span className="badge badge-activo" style={{ width: "fit-content", marginTop: "2px" }}>
                    {pacienteLogged.estado}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "2rem", backgroundColor: "var(--bg-primary)", padding: "1.2rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <h4 style={{ color: "var(--accent-teal)", marginBottom: "0.5rem" }}>🔒 Seguridad de la Sesión</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Este portal implementa especificaciones de SOA con tokens de sesión JWT. Por tu seguridad, el token de refresco tiene una vida útil inamovible de exactamente <strong>15 minutos</strong>. Después de este tiempo, la sesión se destruirá en el servidor y serás redirigido al login de manera automática.
                </p>
              </div>
            </div>
          )}

          {/* TAB: MI HISTORIAL CLINICO */}
          {activeTab === "historial" && (
            <div className="card">
              <h2 className="card-title">📋 Mi Historial Clínico Digital</h2>
              <p className="card-subtitle">Cronología detallada de tus diagnósticos y atenciones médicas en ECOSALUD.</p>

              <div className="timeline-container">
                <div className="timeline-line"></div>
                {historialList.length === 0 ? (
                  <div className="no-data" style={{ paddingLeft: "50px", textAlign: "left" }}>
                    No hay eventos registrados en tu historial clínico actualmente.
                  </div>
                ) : (
                  historialList.map((item) => (
                    <div key={item.id} className={`timeline-item ${item.tipo_registro?.toLowerCase()}`}>
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <div className="timeline-title-area">
                            <span className="timeline-title">{item.titulo}</span>
                            <span className={`timeline-type-tag ${item.tipo_registro?.toLowerCase()}`}>
                              {item.tipo_registro}
                            </span>
                          </div>
                          <span className="timeline-date">📅 {item.fecha_evento}</span>
                        </div>
                        
                        <p className="timeline-description">{item.descripcion}</p>
                        
                        <div className="timeline-meta">
                          <span>Médico Responsable: <strong className="timeline-doctor">{item.medico_responsable}</strong></span>
                          {item.documento_adjunto_url && (
                            <a href={item.documento_adjunto_url} target="_blank" rel="noreferrer" className="timeline-attachment">
                              📎 Ver Resultados / Adjunto
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: MIS RECETAS */}
          {activeTab === "recetas" && (
            <div className="card">
              <h2 className="card-title">💊 Mis Recetas Médicas</h2>
              <p className="card-subtitle">Listado de tratamientos prescritos y vigencia de recetas para adquisición en farmacia.</p>

              {recetasList.length === 0 ? (
                <div className="no-data">No tienes recetas médicas emitidas a la fecha.</div>
              ) : (
                <div className="recipes-grid">
                  {recetasList.map((receta) => {
                    const vencido = receta.fecha_vencimiento && new Date(receta.fecha_vencimiento) < new Date();
                    const badgeClass = vencido ? "badge-vencido" : (receta.estado === "VIGENTE" ? "badge-vigente" : "badge-pendiente");
                    
                    return (
                      <div key={receta.id} className="recipe-card">
                        <div>
                          <div className="recipe-header">
                            <span className="recipe-medication">{receta.medicamento}</span>
                            <span className={`badge ${badgeClass}`}>
                              {vencido ? "Vencido" : receta.estado}
                            </span>
                          </div>
                          
                          <div className="recipe-info">
                            <div className="recipe-detail">
                              <strong>Dosis:</strong> {receta.dosis || "No especificada"}
                            </div>
                            <div className="recipe-detail">
                              <strong>Duración:</strong> {receta.duracion || "No especificada"}
                            </div>
                            {receta.indicaciones && (
                              <div className="recipe-detail" style={{ fontStyle: "italic", fontSize: "0.82rem", marginTop: "4px" }}>
                                "{receta.indicaciones}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="recipe-footer">
                          <span>Emisión: {receta.fecha_emision}</span>
                          {receta.fecha_vencimiento && (
                            <span style={{ color: vencido ? "var(--error)" : "inherit", fontWeight: vencido ? 600 : "inherit" }}>
                              Vence: {receta.fecha_vencimiento}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: ORDENES MEDICAS (With simulating form) */}
          {activeTab === "ordenes" && (
            <div className="card">
              <h2 className="card-title">🔬 Mis Órdenes Médicas</h2>
              <p className="card-subtitle">Consulta de solicitudes de análisis, exámenes de imágenes e interconsultas.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem" }}>
                
                {/* Orders List */}
                <div>
                  <h3 className="card-title" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Órdenes Médicas Activas</h3>
                  {ordenesList.length === 0 ? (
                    <div className="no-data" style={{ padding: "3rem" }}>No se registran órdenes médicas para ti.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {ordenesList.map((ord) => (
                        <div 
                          key={ord.id} 
                          style={{
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-md)",
                            padding: "1.2rem",
                            backgroundColor: "#ffffff",
                            boxShadow: "var(--shadow-sm)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent-teal)" }}>{ord.tipo_orden}</span>
                            <span className="badge badge-activo">{ord.estado}</span>
                          </div>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "0.8rem" }}>{ord.descripcion}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
                            <span>Emisión: {ord.fecha_emision}</span>
                            <span>Médico: <strong>{ord.medico_responsable}</strong></span>
                            {ord.fecha_vencimiento && <span>Vencimiento: {ord.fecha_vencimiento}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Doctor simulator block */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                  <h4 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", marginBottom: "0.5rem" }}>🩺 Simulador Módulo Doctor</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Este formulario simula el consumo del servicio `POST /doctor/orden-medica` que usaría el consultorio del médico para emitir órdenes a tu perfil.
                  </p>

                  <form onSubmit={handleSimulateOrderSubmit}>
                    <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Tipo de Orden</label>
                      <select
                        value={orderForm.tipo_orden}
                        onChange={(e) => setOrderForm({ ...orderForm, tipo_orden: e.target.value })}
                        style={{ padding: "0.5rem" }}
                      >
                        <option value="LABORATORIO">LABORATORIO</option>
                        <option value="IMAGENOLOGIA">IMAGENOLOGIA</option>
                        <option value="ESPECIALISTA">ESPECIALISTA</option>
                        <option value="PROCEDIMIENTO">PROCEDIMIENTO</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Médico que prescribió</label>
                      <input
                        type="text"
                        value={orderForm.medico_responsable}
                        onChange={(e) => setOrderForm({ ...orderForm, medico_responsable: e.target.value })}
                        placeholder="Dr. Nombre de Médico"
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.2rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Descripción clínica *</label>
                      <textarea
                        value={orderForm.descripcion}
                        onChange={(e) => setOrderForm({ ...orderForm, descripcion: e.target.value })}
                        placeholder="Ej. Hemograma completo, Glucosa y urea. Ayuno de 8 horas."
                        style={{ padding: "0.5rem", minHeight: "60px" }}
                        required
                      ></textarea>
                    </div>

                    <button type="submit" className="btn btn-teal" style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}>
                      Simular Emisión de Orden
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB: MIS CITAS (With booking form) */}
          {activeTab === "citas" && (
            <div className="card">
              <h2 className="card-title">📅 Mis Citas Médicas</h2>
              <p className="card-subtitle">Consulta de citas agendadas y reservas de nuevas citas de atención.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem" }}>
                
                {/* List of Citas */}
                <div>
                  <h3 className="card-title" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Próximas Citas Agendadas</h3>
                  {citasList.length === 0 ? (
                    <div className="no-data" style={{ padding: "3rem" }}>No se registran citas agendadas en ECOSALUD.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                      {citasList.map((cita) => {
                        const dateStr = formatCitaFecha(cita.fecha_hora);
                        const timeStr = formatCitaHora(cita.fecha_hora);
                        
                        return (
                          <div 
                            key={cita.id} 
                            style={{
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-md)",
                              padding: "1.2rem",
                              backgroundColor: "#ffffff",
                              boxShadow: "var(--shadow-sm)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-teal)" }}>
                                Dr. {cita.doctor_nombre || "Ecosalud Asignado"}
                              </div>
                              <div style={{ fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 500, margin: "2px 0" }}>
                               {dateStr} - {timeStr} ({cita.duracion_minutos} min)
                              </div>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                Motivo: "{cita.motivo || "Consulta rutinaria"}"
                              </p>
                            </div>

                            <span className="badge badge-activo" style={{ padding: "0.3rem 0.8rem", fontSize: "0.78rem" }}>
                              {cita.estado}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Appointment Booking Form */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                  <h4 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", marginBottom: "0.5rem" }}>📝 Solicitar Nueva Cita</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Reserva tu cita médica consumiendo directamente el servicio `POST /clinica/cita` del backend.
                  </p>

                  <form onSubmit={handleBookAppointmentSubmit}>
                    
                    <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Clínica / Sede *</label>
                      <select
                        value={appointmentForm.sede_id}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, sede_id: e.target.value })}
                        style={{ padding: "0.5rem" }}
                        required
                      >
                        {sedesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre_sede}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Fecha y Hora *</label>
                      <input
                        type="datetime-local"
                        value={appointmentForm.fecha_hora}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, fecha_hora: e.target.value })}
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Médico / Especialista</label>
                      <select
                        value={appointmentForm.doctor_id}
                        onChange={(e) => {
                          const docNames = {
                            "1": "Dr. Andrés Beltrán (Cardiología)",
                            "2": "Dra. Helena Rostova (Ginecología)",
                            "3": "Dr. Alberto Fujimoto (Cirugía General)",
                            "4": "Dr. Emilio Vargas (Geriatría)"
                          };
                          setAppointmentForm({ 
                            ...appointmentForm, 
                            doctor_id: e.target.value,
                            doctor_nombre: docNames[e.target.value]
                          });
                        }}
                        style={{ padding: "0.5rem" }}
                      >
                        <option value="1">Dr. Andrés Beltrán (Cardiología)</option>
                        <option value="2">Dra. Helena Rostova (Ginecología)</option>
                        <option value="3">Dr. Alberto Fujimoto (Cirugía General)</option>
                        <option value="4">Dr. Emilio Vargas (Geriatría)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.2rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Motivo de la Cita *</label>
                      <input
                        type="text"
                        value={appointmentForm.motivo}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, motivo: e.target.value })}
                        placeholder="Ej. Chequeo de rutina por dolor de cabeza"
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-teal" style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}>
                      Agendar Cita Médica
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}
          {activeTab === "estadisticas" && (
            <Estadisticas />
          )}
{activeTab === "direccion" && (
            <DashboardDireccion />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
