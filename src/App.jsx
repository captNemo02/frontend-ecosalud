import { useState, useEffect, useRef } from "react";
import { apiService } from "./services/api";
import Estadisticas from "./Estadisticas";
import DashboardDireccion from "./services/components/DashboardDireccion";
import RecordatorioModal from "./RecordatorioModal";
import Recetas from "./recetas";

function App() {
  // Estado de la autenticación
  const [pacienteLogged, setPacienteLogged] = useState(null);
  const [authTab, setAuthTab] = useState("login");

  // Estados para el flujo de Doble Factor (MFA)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaCountdown, setMfaCountdown] = useState(0);

  // Estado de navegación del portal (pestañas activas)
  const [activeTab, setActiveTab] = useState("perfil");

  // Estados para almacenar la información médica y clínica
  const [historialList, setHistorialList] = useState([]);
  const [recetasList, setRecetasList] = useState([]);
  const [ordenesList, setOrdenesList] = useState([]);
  const [citasList, setCitasList] = useState([]);
  const [sedesList, setSedesList] = useState([]);
  const [doctoresList, setDoctoresList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointmentData, setAppointmentData] = useState(null);

  // Estados para el control de carga y alertas de la interfaz
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Estado del formulario de registro de nuevos pacientes
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

  // Estado del formulario de login
  const [loginData, setLoginData] = useState({
    email: "",
    numero_documento: ""
  });

  // Estado del simulador para la reserva de citas médicas
  const [appointmentForm, setAppointmentForm] = useState({
    sede_id: "",
    especialidad: "Medicina General",
    fecha_hora: "",
    doctor_id: "1",
    doctor_nombre: "Dr. Andrés Beltrán",
    motivo: "",
    notes_medicas: ""
  });

  // Estado del simulador para la emisión de órdenes médicas
  const [orderForm, setOrderForm] = useState({
    tipo_orden: "LABORATORIO",
    descripcion: "",
    medico_responsable: "Dr. Marco Aurelio (Clínica ECOSALUD)"
  });

  // Verifica si existe una sesión activa en el almacenamiento local al cargar la app
  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    const refresh_token = localStorage.getItem("refresh_token");
    const id = localStorage.getItem("paciente_id");
    const nombres = localStorage.getItem("paciente_nombres");
    const apellidos = localStorage.getItem("paciente_apellidos");

    if (access_token && refresh_token && id) {
      setPacienteLogged({
        id: parseInt(id),
        nombres,
        apellidos
      });
    }

    // Suscripción al evento global de expiración de sesión
    const handleSessionExpiredEvent = () => {
      handleLogout("Su sesión ha expirado.");
    };
    window.addEventListener("auth_session_expired", handleSessionExpiredEvent);

    return () => {
      window.removeEventListener("auth_session_expired", handleSessionExpiredEvent);
    };
  }, []);

  // Renovación automática del token de acceso cada 3 minutos si el usuario está logueado
  useEffect(() => {
    if (!pacienteLogged) return;

    const refreshInterval = setInterval(async () => {
      const refresh_token = localStorage.getItem("refresh_token");
      if (refresh_token) {
        try {
          const data = await apiService.refrescarToken(refresh_token);
          localStorage.setItem("access_token", data.access_token);
          console.log("Access token renovado automáticamente.");
        } catch (e) {
          console.warn("Fallo al renovar token:", e);
        }
      }
    }, 180000);

    return () => clearInterval(refreshInterval);
  }, [pacienteLogged?.id]);

  // Carga los datos de la base de datos según la pestaña activa del portal
  useEffect(() => {
    if (pacienteLogged) {
      loadTabData();
    }
  }, [pacienteLogged?.id, activeTab]);

  // Temporizador para reenvío del código MFA
  useEffect(() => {
    if (mfaCountdown <= 0) return;
    const timer = setTimeout(() => {
      setMfaCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [mfaCountdown]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Limpia los datos de sesión del almacenamiento local y redirige al login
  const handleLogout = (message = "Sesión cerrada con éxito.") => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("paciente_id");
    localStorage.removeItem("paciente_nombres");
    localStorage.removeItem("paciente_apellidos");

    setPacienteLogged(null);
    showAlert("info", message);
  };

  // Procesa el formulario de inicio de sesión y guarda el token JWT
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.numero_documento) {
      showAlert("error", "Por favor ingresa tu correo y DNI.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.loginPaciente(loginData.email, loginData.numero_documento);

      if (response.mfa_required) {
        setMfaToken(response.mfa_token);
        setMfaEmail(response.email_masked);
        setMfaRequired(true);
        setMfaCountdown(60);
        setMfaCode("");
        showAlert("info", "Se ha enviado un código de verificación de 6 dígitos a su correo.");
      } else {
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token);
        localStorage.setItem("paciente_id", response.paciente_id.toString());
        localStorage.setItem("paciente_nombres", response.nombres);
        localStorage.setItem("paciente_apellidos", response.apellidos);

        setPacienteLogged({
          id: response.paciente_id,
          nombres: response.nombres,
          apellidos: response.apellidos
        });
        setActiveTab("perfil");
        showAlert("success", `¡Bienvenido, ${response.nombres}! Sesión iniciada.`);
      }
    } catch (err) {
      showAlert("error", err.message || "Error de autenticación. Verifique su correo y DNI.");
    } finally {
      setLoading(false);
    }
  };

  // Procesa la verificación del código MFA
  const handleMFAVerifySubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      showAlert("error", "Por favor ingresa el código de 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.verifyMFA(mfaToken, mfaCode);

      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      localStorage.setItem("paciente_id", response.paciente_id.toString());
      localStorage.setItem("paciente_nombres", response.nombres);
      localStorage.setItem("paciente_apellidos", response.apellidos);

      setPacienteLogged({
        id: response.paciente_id,
        nombres: response.nombres,
        apellidos: response.apellidos
      });
      
      // Limpiar estados de MFA
      setMfaRequired(false);
      setMfaToken("");
      setMfaCode("");
      
      setActiveTab("perfil");
      showAlert("success", `¡Bienvenido, ${response.nombres}! Inicio de sesión exitoso.`);
    } catch (err) {
      showAlert("error", err.message || "Código incorrecto o expirado.");
    } finally {
      setLoading(false);
    }
  };

  // Reenvía el código de verificación
  const handleMFAResend = async () => {
    if (mfaCountdown > 0) return;

    setLoading(true);
    try {
      const response = await apiService.resendMFA(mfaToken);
      setMfaToken(response.mfa_token);
      setMfaCountdown(60);
      setMfaCode("");
      showAlert("success", "Se ha reenviado un nuevo código de verificación a tu correo.");
    } catch (err) {
      showAlert("error", err.message || "Error al reenviar el código.");
    } finally {
      setLoading(false);
    }
  };

  // Envía el formulario para registrar un nuevo paciente
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

  // Carga desde la API la información de la pestaña seleccionada
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
      } else if (activeTab === "ordenes2") {
        const ords = await apiService.getOrdenesMedicas(id);
        setOrdenesList(ords);

      } else if (activeTab === "citas") {
        const [citas, sedes, doctores] = await Promise.all([
          apiService.getCitasPaciente(id),
          apiService.getSedes(),
          apiService.getDoctoresActivos()
        ]);
        setCitasList(citas);
        setSedesList(sedes);
        setDoctoresList(doctores);

        setAppointmentForm(prev => {
          let updated = { ...prev };
          if (sedes.length > 0 && !prev.sede_id) {
            updated.sede_id = sedes[0].id.toString();
          }
          if (doctores.length > 0 && (!prev.doctor_id || prev.doctor_id === "1")) {
            updated.doctor_id = doctores[0].id.toString();
            updated.doctor_nombre = `Dr(a). ${doctores[0].nombres} ${doctores[0].apellidos} (${doctores[0].especialidad})`;
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(`Error loading tab ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Simula el envío de una orden médica (Módulo del Doctor)
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
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      };

      await apiService.crearOrdenMedica(payload);
      showAlert("success", `[Simulador Doctor] Orden Médica de ${orderForm.tipo_orden} emitida con éxito.`);
      setOrderForm(prev => ({ ...prev, descripcion: "" }));

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

  // Reserva una nueva cita médica en el sistema (Módulo de la Clínica)
  const handleBookAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.sede_id || !appointmentForm.fecha_hora || !appointmentForm.motivo) {
      showAlert("error", "Por favor completa la sede, fecha/hora y motivo de la consulta.");
      return;
    }

    const selectedDate = new Date(appointmentForm.fecha_hora);
    const currentDate = new Date();
    if (selectedDate <= currentDate) {
      showAlert("error", "No se puede agendar citas en fechas u horas pasadas.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        clinica_id: 1,
        sede_id: parseInt(appointmentForm.sede_id),
        paciente_id: pacienteLogged.id,
        doctor_id: parseInt(appointmentForm.doctor_id),
        fecha_hora: selectedDate.toISOString(),
        duracion_minutos: 30,
        motivo: appointmentForm.motivo
      };

      await apiService.crearCita(payload);
      showAlert("success", "Cita médica agendada correctamente en la clínica.");
      setAppointmentForm(prev => ({ ...prev, motivo: "", fecha_hora: "", notas_medicas: "" }));

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

  // Cancela una cita en el sistema (Módulo de la Clínica)
  const handleCancelAppointment = async (citaId) => {
    if (!window.confirm("¿Está seguro de que desea cancelar esta cita?")) {
      return;
    }

    setLoading(true);
    try {
      await apiService.cancelarCita(citaId);
      showAlert("success", "Cita cancelada correctamente.");
      
      // Volver a cargar las citas
      if (activeTab === "citas") {
        const citas = await apiService.getCitasPaciente(pacienteLogged.id);
        setCitasList(citas);
      }
    } catch (err) {
      showAlert("error", "Error al cancelar la cita médica: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatea los segundos a un formato legible de minutos y segundos MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calcula la edad en años a partir de la fecha de nacimiento
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

  // Formatea fechas generales con hora local
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

  // Formatea la fecha de las citas médicas
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

  // --- 1. VISTA DE AUTENTICACIÓN ---
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

          {mfaRequired ? (
            <form onSubmit={handleMFAVerifySubmit}>
              <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 124, 137, 0.1)",
                  color: "var(--accent-teal)",
                  fontSize: "1.8rem",
                  marginBottom: "1rem"
                }}>
                  🔐
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", fontSize: "1.3rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
                  Verificación de Doble Factor
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.4" }}>
                  Por tu seguridad, ingresa el código de 6 dígitos que hemos enviado a tu correo registrado:<br/>
                  <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{mfaEmail}</strong>
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: "1.8rem", textAlign: "center" }}>
                <label style={{ display: "block", marginBottom: "0.8rem", textAlign: "left" }}>Código de Verificación *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  style={{
                    letterSpacing: "12px",
                    fontSize: "2.2rem",
                    textAlign: "center",
                    fontWeight: "800",
                    fontFamily: "monospace",
                    padding: "0.8rem",
                    borderRadius: "var(--radius-md)",
                    border: "2px solid var(--accent-teal)",
                    width: "100%",
                    boxShadow: "0 0 10px rgba(0, 124, 137, 0.15)",
                    color: "var(--accent-teal)",
                    backgroundColor: "#fcfdfd"
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-teal" style={{ width: "100%" }} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Verificar Código"}
              </button>

              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                {mfaCountdown > 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Reenviar código en <strong style={{ color: "var(--accent-teal)" }}>{mfaCountdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleMFAResend}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-teal)",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    ¿No recibiste el código? Reenviar código
                  </button>
                )}
              </div>

              <div style={{ textAlign: "center", marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaToken("");
                    setMfaCode("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          ) : (
            <>
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

              {/* Formulario de Inicio de Sesión */}
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

              {/* Formulario de Registro */}
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
            </>
          )}

        </div>
      </div>
    );
  }

  // --- 2. PANEL DEL PORTAL DEL PACIENTE (ACCESO SEGURO) ---
  return (
    <div className="app-container">
      {/* Cabecera del portal */}
      <header style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>

        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", fontSize: "2rem", fontWeight: "800", textTransform: "uppercase" }}>
              ECOSALUD <span style={{ color: "var(--accent-mint)" }}>+</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Paciente: <strong style={{ color: "var(--text-primary)" }}>{pacienteLogged.nombres} {pacienteLogged.apellidos}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button onClick={() => handleLogout("Sesión cerrada correctamente.")} className="btn btn-danger-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Pestañas de navegación del portal */}
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

      {/* Indicador de carga de datos */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner spinner-dark" style={{ width: 36, height: 36 }}></div>
        </div>
      )}

      {/* Contenido de la pestaña seleccionada */}
      {!loading && (
        <div className="tab-content">

          {/* Pestaña: Mi Perfil */}
          {activeTab === "perfil" && (
            <div className="card">
              <h2 className="card-title">Datos Generales del Paciente</h2>
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
            </div>
          )}

          {/* Pestaña: Mi Historial Clínico */}
        {activeTab === "historial" && (
  <div className="card">
    <h2 className="card-title">Mi Historial Clínico Digital</h2>
    <p className="card-subtitle">
      Cronología detallada de tus citas, recetas, tratamientos y atenciones médicas en ECOSALUD.
    </p>

    <div className="timeline-container">
      <div className="timeline-line"></div>

      {historialList.length === 0 ? (
        <div className="no-data" style={{ paddingLeft: "50px", textAlign: "left" }}>
          No hay eventos registrados en tu historial clínico actualmente.
        </div>
      ) : (
        historialList.map((item, index) => (
          <div key={item.id || index} className={`timeline-item ${item.tipo_registro?.toLowerCase()}`}>
            <div className="timeline-dot"></div>

            <div className="timeline-content">
              <div className="timeline-header">
                <div className="timeline-title-area">
                  <span className="timeline-title">{item.titulo}</span>
                  <span className={`timeline-type-tag ${item.tipo_registro?.toLowerCase()}`}>
                    {item.tipo_registro}
                  </span>
                </div>

                <span className="timeline-date">
                  Fecha: {item.fecha_evento || "No registrada"}
                </span>
              </div>

              <p className="timeline-description">
                {item.descripcion || "Sin descripción registrada"}
              </p>

              <p className="timeline-description">
                <strong>Receta:</strong> {item.receta || item.medicamento || "No registrada"}
              </p>

              <p className="timeline-description">
                <strong>Tratamiento posterior:</strong>{" "}
                {item.tratamiento_posterior || item.indicaciones || "No registrado"}
              </p>

              <div className="timeline-meta">
                <span>
                  Médico Responsable:{" "}
                  <strong className="timeline-doctor">
                    {item.medico_responsable || item.doctor_nombre || "No registrado"}
                  </strong>
                </span>

                {item.documento_adjunto_url && (
                  <a
                    href={item.documento_adjunto_url}
                    target="_blank"
                    rel="noreferrer"
                    className="timeline-attachment"
                  >
                    Ver Resultados / Adjunto
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
            <Recetas recetasList={recetasList} />
          )}

          {/* Pestaña: Órdenes Médicas */}
          {activeTab === "ordenes" && (
            <div className="card">
              <h2 className="card-title">Mis Órdenes Médicas</h2>
              <p className="card-subtitle">Consulta de solicitudes de análisis, exámenes de imágenes e interconsultas.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem" }}>

                {/* Lista de órdenes */}
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

                {/* Bloque del simulador de doctor */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                  <h4 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", marginBottom: "0.5rem" }}>Simulador Módulo Doctor</h4>
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
      {/* Pestaña: Órdenes Médicas 2 */}
{activeTab === "ordenes2" && (
  <div className="card">
    <h2 className="card-title">Órdenes Médicas 2</h2>
    <p className="card-subtitle">
      Órdenes médicas provenientes del servicio Doctor.
    </p>

    {ordenesList.length === 0 ? (
      <div className="no-data">No hay órdenes médicas registradas.</div>
    ) : (
      <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
        {ordenesList.map((orden, index) => (
          <div
            key={orden.id || index}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1.2rem",
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8rem" }}>
              <h3 style={{ margin: 0, color: "#007c89" }}>
                {orden.tipo_orden}
              </h3>

              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "999px",
                  fontWeight: "700",
                  fontSize: "0.8rem"
                }}
              >
                {orden.estado || "Pendiente"}
              </span>
            </div>

            <p style={{ marginBottom: "0.8rem", color: "#334155" }}>
              <strong>Descripción:</strong> {orden.descripcion || orden.detalle}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.8rem",
                fontSize: "0.9rem"
              }}
            >
              <p><strong>Paciente ID:</strong> {orden.paciente_id}</p>
              <p><strong>Médico:</strong> {orden.medico_responsable || orden.doctor_id}</p>
              <p><strong>Emisión:</strong> {orden.fecha_emision || "No registrada"}</p>
              <p><strong>Vencimiento:</strong> {orden.fecha_vencimiento}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
          {/* Pestaña: Mis Citas */}
          {activeTab === "citas" && (
            <div className="card">
              <h2 className="card-title">Mis Citas Médicas</h2>
              <p className="card-subtitle">Consulta de citas agendadas y reservas de nuevas citas de atención.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "2rem" }}>

                {/* Formulario de reserva de cita (Izquierda) */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
                  <h4 style={{ fontFamily: "var(--font-heading)", color: "var(--accent-teal)", marginBottom: "0.5rem" }}>Solicitar Nueva Cita</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Reserva tu cita médica seleccionando una sede, médico y horario disponible.
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
                        min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                      <label style={{ fontSize: "0.8rem" }}>Médico / Especialista *</label>
                      <select
                        value={appointmentForm.doctor_id}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedDoc = doctoresList.find(d => d.id.toString() === selectedId.toString());
                          const docName = selectedDoc ? `Dr(a). ${selectedDoc.nombres} ${selectedDoc.apellidos} (${selectedDoc.especialidad})` : "";
                          setAppointmentForm({
                            ...appointmentForm,
                            doctor_id: selectedId,
                            doctor_nombre: docName
                          });
                        }}
                        style={{ padding: "0.5rem" }}
                        required
                      >
                        {doctoresList.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {`Dr(a). ${doc.nombres} ${doc.apellidos} (${doc.especialidad})`}
                          </option>
                        ))}
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

                {/* Lista de citas (Derecha) */}
                <div>
                  <h3 className="card-title" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Próximas Citas Agendadas</h3>
                  {citasList.length === 0 ? (
                    <div className="no-data" style={{ padding: "3rem" }}>No se registran citas agendadas en ECOSALUD.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                      {citasList.map((cita) => {
                        const dateStr = formatCitaFecha(cita.fecha_hora);
                        const timeStr = formatCitaHora(cita.fecha_hora);
                        
                        // Buscar el nombre del doctor dinámicamente usando el doctoresList cargado
                        const matchedDoc = doctoresList.find(d => d.id.toString() === cita.doctor_id?.toString());
                        const doctorDisplayName = matchedDoc 
                          ? `Dr(a). ${matchedDoc.nombres} ${matchedDoc.apellidos} (${matchedDoc.especialidad})` 
                          : (cita.doctor_nombre || `Médico (ID: ${cita.doctor_id})`);

                        const estadoUpper = cita.estado?.toUpperCase() || "AGENDADA";
                        const badgeClass = estadoUpper === "CANCELADA" ? "badge-inactivo" : "badge-activo";

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
                                {doctorDisplayName}
                              </div>
                              <div style={{ fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 500, margin: "2px 0" }}>
                                {dateStr} - {timeStr} ({cita.duracion_minutos} min)
                              </div>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                Motivo: "{cita.motivo || "Consulta rutinaria"}"
                              </p>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.8rem" }}>
                              <span className={`badge ${badgeClass}`} style={{ padding: "0.3rem 0.8rem", fontSize: "0.78rem" }}>
                                {cita.estado}
                              </span>
                              {estadoUpper === "AGENDADA" && (
                                <button
                                  onClick={() => handleCancelAppointment(cita.id)}
                                  className="btn btn-danger-outline"
                                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", minHeight: "auto", border: "1px solid rgba(239, 68, 68, 0.4)" }}
                                >
                                  Cancelar Cita
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
          {/* 👇 INYECTA EL MODAL AQUÍ ABAJO: */}
          <RecordatorioModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            data={appointmentData} 
          />

          
        </div>
      )}
    </div>
  );
}

export default App;
