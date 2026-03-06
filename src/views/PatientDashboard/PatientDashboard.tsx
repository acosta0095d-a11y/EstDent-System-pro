import React, { useState } from 'react';
import { 
  ChevronLeft, CalendarDays, PlusCircle, ClipboardList, Wallet, 
  Phone, Mail, MapPin, Droplet, AlertTriangle 
} from 'lucide-react';

const PatientDashboard = ({ paciente, onBack }: any) => {
  const [pestanaActiva, setPestanaActiva] = useState("historial");

  // Simulamos datos clínicos rápidos para el Header Premium
  const infoRapida = {
    sangre: "O+",
    alergias: "Ninguna",
    telefono: paciente.celular || "Sin registrar",
    correo: paciente.correo || "Sin registrar",
    ciudad: paciente.ciudad || "Neiva"
  };

  return (
    <div className="dashboard-premium-container slide-in-bottom">
      
      {/* HEADER PREMIUM MINIMALISTA */}
      <header className="header-premium">
        <div className="header-top-bar">
          <button className="btn-back-pro" onClick={onBack}>
            <ChevronLeft size={18} /> VOLVER AL DIRECTORIO
          </button>
        </div>

        <div className="header-main-content">
          <div className="patient-identity">
            <div className="avatar-pro">
              {paciente.nombre ? paciente.nombre.charAt(0) : "P"}
            </div>
            <div>
              <h1 className="patient-name-pro">{paciente.nombre}</h1>
              <div className="patient-tags">
                <span className="tag-cc">CC: {paciente.cc}</span>
                <span className={`tag-status ${paciente.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                  {paciente.estado}
                </span>
              </div>
            </div>
          </div>

          <div className="patient-quick-stats">
            <div className="stat-item">
              <Phone size={14} className="text-muted" />
              <span>{infoRapida.telefono}</span>
            </div>
            <div className="stat-item">
              <Mail size={14} className="text-muted" />
              <span>{infoRapida.correo}</span>
            </div>
            <div className="stat-item">
              <MapPin size={14} className="text-muted" />
              <span>{infoRapida.ciudad}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item text-brand-blue font-bold">
              <Droplet size={14} />
              <span>{infoRapida.sangre}</span>
            </div>
            <div className="stat-item text-emerald-600 font-bold">
              <AlertTriangle size={14} />
              <span>{infoRapida.alergias}</span>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS SUTIL Y MODERNA */}
        <nav className="tabs-premium">
          <button 
            className={`tab-btn ${pestanaActiva === "historial" ? "active" : ""}`} 
            onClick={() => setPestanaActiva("historial")}
          >
            <CalendarDays size={16} /> HISTORIAL CLÍNICO
          </button>
          <button 
            className={`tab-btn tab-action ${pestanaActiva === "nueva_consulta" ? "active" : ""}`}
            onClick={() => setPestanaActiva("nueva_consulta")}
          >
            <PlusCircle size={16} /> NUEVA CONSULTA
          </button>
          <button 
            className={`tab-btn ${pestanaActiva === "historia_clinica" ? "active" : ""}`} 
            onClick={() => setPestanaActiva("historia_clinica")}
          >
            <ClipboardList size={16} /> HISTORIA CLÍNICA
          </button>
          <button 
            className={`tab-btn ${pestanaActiva === "finanzas" ? "active" : ""}`} 
            onClick={() => setPestanaActiva("finanzas")}
          >
            <Wallet size={16} /> ESTADO DE CUENTA
          </button>
        </nav>
      </header>

      {/* ÁREA DE TRABAJO DINÁMICA */}
      <div className="workspace-premium custom-scroll">
        
        {pestanaActiva === "historial" && (
          <div className="card-premium fade-in">
            <div className="card-header-pro">
              <h2>REGISTRO DE ATENCIONES</h2>
              <button className="btn-outline-pro">Imprimir Historial</button>
            </div>
            <div className="table-minimal-wrapper">
              <table className="table-minimal">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>TIPO DE ATENCIÓN</th>
                    <th>PROCEDIMIENTO REALIZADO</th>
                    <th>ESPECIALISTA</th>
                    <th className="text-right">VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-mono text-slate-500">15/01/2026</td>
                    <td><span className="badge-outline">CLÍNICA GENERAL</span></td>
                    <td className="font-semibold text-slate-800">Limpieza Profunda + Valoración Inicial</td>
                    <td className="text-slate-600">Dr. Sistema</td>
                    <td className="text-right font-black text-slate-800">$120.000</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-slate-500">28/02/2026</td>
                    <td><span className="badge-outline">ORTODONCIA</span></td>
                    <td className="font-semibold text-slate-800">Control Mensual - Cambio de Arcos (Niti 0.14)</td>
                    <td className="text-slate-600">Dr. Sistema</td>
                    <td className="text-right font-black text-slate-800">$80.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pestanaActiva === "nueva_consulta" && (
          <div className="fade-in workspace-center">
            <h2 className="workspace-title">SELECCIONE EL MÓDULO DE ATENCIÓN</h2>
            <div className="module-grid">
              <button className="module-card">
                <ClipboardList size={32} />
                <span>ODONTOLOGÍA GENERAL</span>
                <p>Odontogramas, caries, cirugías menores.</p>
              </button>
              <button className="module-card">
                <AlertTriangle size={32} />
                <span>ORTODONCIA</span>
                <p>Control de brackets, arcos y evolución.</p>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PatientDashboard;