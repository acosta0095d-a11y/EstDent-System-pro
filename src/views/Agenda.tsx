import React, { useState } from 'react';
import { ClipboardList, Clock, Plus, Play, CheckCircle, AlertCircle } from 'lucide-react';

const Agenda = () => {
  // BASE DE DATOS SIMULADA: El "Papel" digital del día de hoy
  const [turnosHoy] = useState([
    { turno: 1, paciente: "PEREZ, JUAN ALBERTO", motivo: "Urgencia (Dolor Muela)", llegada: "08:15 AM", tiempoEspera: "En atención", estado: "En Consultorio", prioridad: "Alta" },
    { turno: 2, paciente: "GARCIA, MARIA HELENA", motivo: "Revisión Resina", llegada: "08:30 AM", tiempoEspera: "15 min", estado: "Esperando", prioridad: "Normal" },
    { turno: 3, paciente: "RUIZ, CARLOS ANDRES", motivo: "Presupuesto Implante", llegada: "08:40 AM", tiempoEspera: "5 min", estado: "Esperando", prioridad: "Normal" },
  ]);

  return (
    <div className="dashboard-premium-container fade-in">
      
      {/* HEADER PREMIUM DEL TURNERO */}
      <header className="header-premium" style={{ padding: '30px 30px 20px' }}>
        <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 className="patient-name-pro">Monitor de Sala de Espera</h1>
            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardList size={14} /> Control de flujo de pacientes por orden de llegada
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary-estdent" style={{ padding: '10px 24px' }}>
              <Plus size={16} /> REGISTRAR LLEGADA
            </button>
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS DEL DÍA */}
        <div style={{ display: 'flex', gap: '15px', background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, borderRight: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>PACIENTES ESPERANDO</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>2</div>
          </div>
          <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', paddingLeft: '15px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>EN ATENCIÓN ACTUAL</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--brand-blue)' }}>1</div>
          </div>
          <div style={{ flex: 1, paddingLeft: '15px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>ATENDIDOS HOY</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>5</div>
          </div>
        </div>
      </header>

      {/* LA "LISTA DE PAPEL" DIGITALIZADA (ÁREA DE LA TABLA) */}
      <div className="workspace-premium custom-scroll">
        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-minimal-wrapper">
            <table className="table-minimal" style={{ width: '100%' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th className="text-center" style={{ width: '80px' }}>TURNO</th>
                  <th>PACIENTE EN SALA</th>
                  <th>MOTIVO VISITA</th>
                  <th><Clock size={12} style={{ display: 'inline', marginRight: '4px' }}/> LLEGADA</th>
                  <th>ESPERA</th>
                  <th className="text-center">ESTADO</th>
                  <th className="text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {turnosHoy.map((t) => (
                  <tr key={t.turno} className="row-hover">
                    
                    {/* Número de Turno Gigante y Claro */}
                    <td className="text-center" style={{ borderRight: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: t.estado === 'En Consultorio' ? 'var(--brand-blue)' : '#94a3b8' }}>
                        #{t.turno}
                      </span>
                    </td>
                    
                    {/* Paciente y Prioridad */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-black text-slate-800" style={{ fontSize: '14px' }}>{t.paciente}</span>
                        {t.prioridad === 'Alta' && (
                          <AlertCircle size={14} color="#dc2626" />
                        )}
                      </div>
                    </td>
                    
                    <td className="font-semibold text-slate-600">{t.motivo}</td>
                    
                    <td className="font-mono text-slate-500 font-bold">{t.llegada}</td>
                    
                    {/* Indicador de Tiempo de Espera */}
                    <td>
                      <span style={{ 
                        fontSize: '12px', fontWeight: 800, 
                        color: t.tiempoEspera.includes('En') ? '#10b981' : (parseInt(t.tiempoEspera) > 10 ? '#f59e0b' : '#64748b') 
                      }}>
                        {t.tiempoEspera}
                      </span>
                    </td>
                    
                    {/* Píldora de Estado */}
                    <td className="text-center">
                      <span className={`pill-status ${
                        t.estado === 'En Consultorio' ? 'normal' : 'retrasado'
                      }`}>
                        {t.estado}
                      </span>
                    </td>
                    
                    {/* Botones de Acción Rápida (El Doctor llama al paciente) */}
                    <td className="text-right">
                      {t.estado === 'Esperando' ? (
                        <button className="btn-outline-pro" style={{ padding: '6px 12px', fontSize: '10px', color: 'var(--brand-blue)', borderColor: 'var(--brand-blue-light)' }}>
                          <Play size={12} style={{ display: 'inline', marginRight: '4px' }} /> PASAR
                        </button>
                      ) : (
                        <button className="btn-outline-pro" style={{ padding: '6px 12px', fontSize: '10px', color: '#10b981', borderColor: '#d1fae5' }}>
                          <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} /> TERMINAR
                        </button>
                      )}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agenda;