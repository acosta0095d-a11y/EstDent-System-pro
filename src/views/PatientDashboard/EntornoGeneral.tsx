import React, { useState } from 'react';
import { X, Save, Zap, Activity, Clock, MessageSquare, MousePointer2 } from 'lucide-react';
import { usePatient } from '../../context/PatientContext';

// --- COMPONENTE: PIEZA DENTAL INTERACTIVA (SVG) ---
const PiezaDental = ({ numero, estado, onSelect }: any) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8' }}>{numero}</span>
      <svg width="35" height="35" viewBox="0 0 100 100" style={{ cursor: 'pointer' }} onClick={() => onSelect(numero)}>
        {/* Cara Superior (Vestibular/Palatina) */}
        <path d="M20 20 L80 20 L65 35 L35 35 Z" fill={estado.top || "#fff"} stroke="#cbd5e1" strokeWidth="2" />
        {/* Cara Izquierda (Mesial/Distal) */}
        <path d="M20 20 L35 35 L35 65 L20 80 Z" fill={estado.left || "#fff"} stroke="#cbd5e1" strokeWidth="2" />
        {/* Cara Derecha (Mesial/Distal) */}
        <path d="M80 20 L65 35 L65 65 L80 80 Z" fill={estado.right || "#fff"} stroke="#cbd5e1" strokeWidth="2" />
        {/* Cara Inferior (Vestibular/Palatina) */}
        <path d="M35 65 L65 65 L80 80 L20 80 Z" fill={estado.bottom || "#fff"} stroke="#cbd5e1" strokeWidth="2" />
        {/* Cara Central (Oclusal) */}
        <rect x="35" y="35" width="30" height="30" fill={estado.center || "#fff"} stroke="#cbd5e1" strokeWidth="2" />
      </svg>
    </div>
  );
};

const EntornoGeneral = ({ onExit }: { onExit: () => void }) => {
  const { selectedPatient: paciente } = usePatient();
  const [paso, setPaso] = useState(1); 
  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number | null>(null);
  const [evolucion, setEvolucion] = useState(`El paciente ${paciente?.nombre} se presenta para valoración...`);

  // ESTADO DE CADA DIENTE (Super Lógica)
  const [odontogramaData, setOdontogramaData] = useState<any>({});

  const marcarDiente = (color: string) => {
    if (piezaSeleccionada) {
      setOdontogramaData({
        ...odontogramaData,
        [piezaSeleccionada]: { center: color, top: color, left: color, right: color, bottom: color }
      });
      setEvolucion(prev => prev + `\n- Se registra hallazgo en pieza ${piezaSeleccionada}.`);
      setPiezaSeleccionada(null);
    }
  };

  if (paso === 1) {
    return (
      <div className="modal-overlay fade-in" style={{zIndex: 10000}}>
        <div className="modal-content-pro" style={{textAlign: 'center', padding: '40px'}}>
          <div style={{background: 'var(--brand-blue-light)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
            <Activity size={40} color="var(--brand-blue)" />
          </div>
          <h2 style={{fontSize: '22px', fontWeight: 900, marginBottom: '10px'}}>¿Iniciar Sesión Clínica?</h2>
          <p style={{color: '#64748b', marginBottom: '30px'}}>Se abrirá el entorno de Odontología General para <strong>{paciente?.nombre}</strong>.</p>
          <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
            <button className="btn-outline-pro" onClick={onExit} style={{padding: '12px 30px'}}>Cancelar</button>
            <button className="btn-primary-estdent" onClick={() => setPaso(2)} style={{padding: '12px 30px'}}>SÍ, INICIAR AHORA</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="entorno-clinico-full fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#f8fafc', zIndex: 9999, display: 'flex', flexDirection: 'column'
    }}>
      {/* HEADER */}
      <header style={{ background: 'white', padding: '15px 30px', borderBottom: '2px solid var(--brand-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div className="avatar-pro" style={{width: '45px', height: '45px'}}>{paciente?.nombre.charAt(0)}</div>
          <div>
            <h2 style={{fontSize: '16px', fontWeight: 900}}>{paciente?.nombre}</h2>
            <span style={{fontSize: '11px', color: '#10b981', fontWeight: 800}}>● SESIÓN ACTIVA</span>
          </div>
        </div>
        <div style={{display: 'flex', gap: '12px'}}>
          <button className="btn-outline-pro" onClick={onExit} style={{color: '#dc2626'}}>DESCARTAR</button>
          <button className="btn-primary-estdent" style={{background: '#10b981'}}><Save size={16} /> GUARDAR CONSULTA</button>
        </div>
      </header>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 400px', flex: 1, overflow: 'hidden'}}>
        <div className="custom-scroll" style={{overflowY: 'auto', padding: '30px', background: '#fff'}}>
          
          {/* ODONTOGRAMA SUPER PRO */}
          <section style={{marginBottom: '40px'}}>
            <h3 style={{fontSize: '14px', fontWeight: 900, marginBottom: '20px'}}>ODONTOGRAMA TÉCNICO</h3>
            
            <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative' }}>
              
              {/* Dientes Superiores */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
                {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(n => (
                  <PiezaDental key={n} numero={n} estado={odontogramaData[n] || {}} onSelect={setPiezaSeleccionada} />
                ))}
              </div>

              {/* Dientes Inferiores */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(n => (
                  <PiezaDental key={n} numero={n} estado={odontogramaData[n] || {}} onSelect={setPiezaSeleccionada} />
                ))}
              </div>

              {/* TOOLBOX FLOTANTE AL SELECCIONAR DIENTE */}
              {piezaSeleccionada && (
                <div className="fade-in" style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                  zIndex: 100, border: '1px solid var(--brand-blue)', textAlign: 'center'
                }}>
                  <h4 style={{marginBottom: '15px', fontWeight: 900}}>Pieza {piezaSeleccionada}</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <button onClick={() => marcarDiente('#ef4444')} style={{background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer'}}>CARIES</button>
                    <button onClick={() => marcarDiente('#3b82f6')} style={{background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer'}}>RESINA</button>
                    <button onClick={() => marcarDiente('#10b981')} style={{background: '#d1fae5', color: '#065f46', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer'}}>SANO</button>
                    <button onClick={() => setPiezaSeleccionada(null)} style={{background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer'}}>CERRAR</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* EVOLUCIÓN */}
          <section>
            <h3 style={{fontSize: '14px', fontWeight: 900, marginBottom: '15px'}}><MessageSquare size={16} /> NOTAS DE EVOLUCIÓN</h3>
            <textarea 
              value={evolucion}
              onChange={(e) => setEvolucion(e.target.value)}
              style={{ width: '100%', minHeight: '200px', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
            />
          </section>
        </div>

        {/* LATERAL DERECHO */}
        <div style={{background: '#f1f5f9', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <div className="card-premium" style={{padding: '20px'}}>
               <h4 style={{fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '15px'}}>RESUMEN DE CARGOS</h4>
               <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                  <span style={{fontSize: '12px', fontWeight: 600}}>Valoración General</span>
                  <span style={{fontWeight: 900}}>$50.000</span>
               </div>
               <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{fontWeight: 900}}>TOTAL</span>
                  <span style={{fontWeight: 900, color: 'var(--brand-blue)'}}>$50.000</span>
               </div>
            </div>
            <div style={{marginTop: 'auto'}}>
               <button className="btn-primary-estdent" style={{width: '100%', padding: '15px'}}><Save size={18} /> GUARDAR TODO</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EntornoGeneral;