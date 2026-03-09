import React, { useState, useEffect } from 'react';
import { 
  X, Save, Activity, Clock, FileText, Plus, AlertTriangle, 
  Pill, CheckCircle, AlertCircle, Camera, Calendar, FileSearch 
} from 'lucide-react';
import { usePatient } from '../../context/PatientContext';

// 1. EL DIBUJO DEL DIENTE (Se queda fuera, es solo visual)
const PiezaDental = ({ numero, estado, onSelect, seleccionada }: any) => {
  const getColor = (cara: string) => estado[cara] || "#ffffff";

  return (
    <div 
      onClick={() => onSelect(numero)}
      style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', 
        cursor: 'pointer', transition: 'all 0.2s',
        transform: seleccionada ? 'scale(1.1)' : 'scale(1)',
        zIndex: seleccionada ? 10 : 1
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 900, color: seleccionada ? '#3b82f6' : '#64748b' }}>{numero}</span>
      <svg width="35" height="35" viewBox="0 0 100 100">
        <path d="M10 10 L90 10 L70 30 L30 30 Z" fill={getColor('top')} stroke="#cbd5e1" strokeWidth="2" />
        <path d="M30 70 L70 70 L90 90 L10 90 Z" fill={getColor('bottom')} stroke="#cbd5e1" strokeWidth="2" />
        <path d="M10 10 L30 30 L30 70 L10 90 Z" fill={getColor('left')} stroke="#cbd5e1" strokeWidth="2" />
        <path d="M90 10 L70 30 L70 70 L90 90 Z" fill={getColor('right')} stroke="#cbd5e1" strokeWidth="2" />
        <rect x="30" y="30" width="40" height="40" fill={getColor('center')} stroke="#cbd5e1" strokeWidth="2" />
      </svg>
    </div>
  );
};
// =====================================================================
// 2. COMPONENTE PRINCIPAL: ENTORNO CLÍNICO CLARO Y EXPANDIDO
// =====================================================================
const EntornoGeneral = ({ onExit }: { onExit: () => void }) => {
  const { selectedPatient } = usePatient();
  const paciente = selectedPatient || { nombre: "Paciente No Identificado", cc: "N/A" };
  const inicial = paciente.nombre.charAt(0).toUpperCase();

  // --- ESTADOS (TODOS JUNTOS AQUÍ) ---
  const [segundos, setSegundos] = useState(0);
  const [mostrarSalida, setMostrarSalida] = useState(false);
  const [piezaActiva, setPiezaActiva] = useState<number | null>(null);
  const [odontograma, setOdontograma] = useState<any>({});
  const [herramienta, setHerramienta] = useState({ color: '#ef4444', nombre: 'Caries' }); // <--- AQUÍ VA
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' });
  const [recetas, setRecetas] = useState<any[]>([]);
  const [nuevaReceta, setNuevaReceta] = useState({ med: '', indicacion: '' });
  const [examenes, setExamenes] = useState<any[]>([]);
  const [nuevoExamen, setNuevoExamen] = useState('');
  const [proximaCita, setProximaCita] = useState({ tiempo: '', motivo: '' });
  const [archivos, setArchivos] = useState<any[]>([]);

  // ... (Sigue tu useEffect del timer y las funciones de agregar medicamento que ya tienes), setProximaCita] = useState({ tiempo: '', motivo: '' });

  // --- CRONÓMETRO ---
  useEffect(() => {
    const timer = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatearCronometro = () => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- FUNCIONES CLÍNICAS ---
  const registrarHallazgo = (color: string, diag: string) => {
    if (piezaActiva) {
      setOdontograma({ ...odontograma, [piezaActiva]: { center: color, top: color, left: color, right: color, bottom: color } });
      setSoap(prev => ({ ...prev, a: prev.a + (prev.a ? '\n' : '') + `• Pieza ${piezaActiva}: ${diag}.` }));
      setPiezaActiva(null);
    }
  };

  const agregarMedicamento = () => {
    if (nuevaReceta.med) {
      setRecetas([{ id: Date.now(), ...nuevaReceta }, ...recetas]);
      setSoap(prev => ({ ...prev, p: prev.p + (prev.p ? '\n' : '') + `• Rx: ${nuevaReceta.med} (${nuevaReceta.indicacion}).` }));
      setNuevaReceta({ med: '', indicacion: '' });
    }
  };

  const agregarExamen = () => {
    if (nuevoExamen) {
      setExamenes([{ id: Date.now(), nombre: nuevoExamen }, ...examenes]);
      setSoap(prev => ({ ...prev, p: prev.p + (prev.p ? '\n' : '') + `• Orden: ${nuevoExamen}.` }));
      setNuevoExamen('');
    }
  };

  const simularSubida = () => {
    const nombres = ["Panorámica_Actual.jpg", "Periapical_Pz11.png", "Intraoral_Frente.jpg"];
    const file = nombres[Math.floor(Math.random() * nombres.length)];
    setArchivos([{ id: Date.now(), nombre: file }, ...archivos]);
  };

  return (
    <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#f1f5f9', zIndex: 10000, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* --- MODAL DE SALIDA --- */}
      {mostrarSalida && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="scale-up" style={{ background: 'white', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '450px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#fee2e2', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={40} color="#ef4444" />
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 900, marginBottom: '10px' }}>¿Descartar Evolución?</h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '30px' }}>
              Todo lo escrito, odontograma, recetas y órdenes se perderá definitivamente.
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setMostrarSalida(false)} style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={onExit} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Sí, Descartar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '50px', height: '50px', background: 'var(--brand-blue-light)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)', fontSize: '22px', fontWeight: 900 }}>
            {inicial}
          </div>
          <div>
            <h1 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 900, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {paciente.nombre} 
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, border: '1px solid #a7f3d0' }}>CONSULTA ACTIVA</span>
            </h1>
            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              <span>Doc: <strong style={{ color: '#334155' }}>{paciente.cc}</strong></span>
              <span style={{ color: '#ef4444' }}>Alergias: <strong>Revisar Antecedentes</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#64748b" />
            <span style={{ color: '#334155', fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>{formatearCronometro()}</span>
          </div>
          <button onClick={() => setMostrarSalida(true)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', padding: '12px 25px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Descartar</button>
          <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}>
            <Save size={18} /> GUARDAR EXPEDIENTE
          </button>
        </div>
      </header>

      {/* --- ÁREA DE TRABAJO --- */}
      <div className="custom-scroll" style={{ display: 'flex', flex: 1, overflowY: 'auto', padding: '30px 40px', gap: '30px' }}>
        
        {/* === COLUMNA IZQUIERDA: OBJETIVA === */}
        <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
    

{/* SECCIÓN ODONTOGRAMA PRO */}
<section style={{ background: 'white', borderRadius: '24px', padding: '35px', border: '1px solid #e2e8f0', position: 'relative' }}>
  
  {/* Selector de Herramienta (El Pincel) */}
  <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
    <span style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', alignSelf: 'center', marginRight: '10px' }}>HERRAMIENTA ACTIVA:</span>
    <button onClick={() => setHerramienta({color: '#ef4444', nombre: 'Caries'})} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: herramienta.nombre === 'Caries' ? '#ef4444' : '#fee2e2', color: herramienta.nombre === 'Caries' ? 'white' : '#b91c1c', fontWeight: 800, cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white'}}></div> CARIES
    </button>
    <button onClick={() => setHerramienta({color: '#3b82f6', nombre: 'Resina'})} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: herramienta.nombre === 'Resina' ? '#3b82f6' : '#dbeafe', color: herramienta.nombre === 'Resina' ? 'white' : '#1d4ed8', fontWeight: 800, cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%', border: '2px solid white'}}></div> RESINA
    </button>
  </div>

  {/* Grilla de Dientes */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
      {[18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28].map(n => (
        <PiezaDental key={n} numero={n} estado={odontograma[n] || {}} onSelect={setPiezaActiva} seleccionada={piezaActiva === n} />
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
      {[48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38].map(n => (
        <PiezaDental key={n} numero={n} estado={odontograma[n] || {}} onSelect={setPiezaActiva} seleccionada={piezaActiva === n} />
      ))}
    </div>
  </div>

  {/* LA VENTANA DE DETALLE (LUPA) */}
  {piezaActiva && (
    <div className="scale-up" style={{ 
      position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', 
      background: 'white', padding: '30px', borderRadius: '30px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', 
      zIndex: 100, border: '2px solid #e2e8f0', width: '350px', textAlign: 'center' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>Pieza {piezaActiva}</h4>
        <button onClick={() => setPiezaActiva(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}><X size={20}/></button>
      </div>

      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Toque la cara del diente para aplicar <strong>{herramienta.nombre}</strong></p>

      {/* DIBUJO GRANDE PARA SELECCIONAR CARA */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <svg width="180" height="180" viewBox="0 0 100 100" style={{ cursor: 'crosshair' }}>
          {/* Función interna para pintar caras al hacer clic */}
          {['top', 'bottom', 'left', 'right', 'center'].map((cara) => {
            const currentOdonto = odontograma[piezaActiva] || {};
            const dPath = {
              top: "M10 10 L90 10 L70 30 L30 30 Z",
              bottom: "M30 70 L70 70 L90 90 L10 90 Z",
              left: "M10 10 L30 30 L30 70 L10 90 Z",
              right: "M90 10 L70 30 L70 70 L90 90 Z"
            };

            const handleClickCara = () => {
               setOdontograma({
                 ...odontograma,
                 [piezaActiva]: { ...currentOdonto, [cara]: herramienta.color }
               });
            };

            if (cara === 'center') {
              return <rect key={cara} x="30" y="30" width="40" height="40" fill={currentOdonto[cara] || "#f8fafc"} stroke="#cbd5e1" strokeWidth="1" onClick={handleClickCara} />;
            }
            return <path key={cara} d={dPath[cara]} fill={currentOdonto[cara] || "#f8fafc"} stroke="#cbd5e1" strokeWidth="1" onClick={handleClickCara} />;
          })}
        </svg>
      </div>
 
      <button onClick={() => setPiezaActiva(null)} style={{ width: '100%', padding: '12px', background: 'var(--brand-blue)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>
        FINALIZAR PIEZA
      </button>
    </div>
  )}
</section>
          {/* NUEVO: Anexos e Imágenes */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={20} color="#ec4899" /> IMÁGENES Y ANEXOS
            </h3>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={simularSubida} style={{ background: '#fdf2f8', color: '#db2777', border: '1px dashed #fbcfe8', padding: '20px', borderRadius: '12px', flex: '0 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}>
                <Plus size={24} /> Subir Foto
              </button>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '100px' }}>
                {archivos.length === 0 && <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', padding: '10px' }}>No hay imágenes anexadas.</span>}
                {archivos.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    <span>{a.nombre}</span> <CheckCircle size={14} color="#10b981" />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* === COLUMNA DERECHA: DOCUMENTACIÓN Y ÓRDENES === */}
        <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* S.O.A.P. */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#8b5cf6" /> EVOLUCIÓN CLÍNICA (S.O.A.P.)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>Subjetivo (S)</label>
                  <textarea value={soap.s} onChange={e => setSoap({...soap, s: e.target.value})} style={{ width: '100%', minHeight: '80px', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', resize: 'vertical', fontSize: '14px', marginTop: '5px' }} placeholder="Motivo de consulta..." />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>Objetivo (O)</label>
                  <textarea value={soap.o} onChange={e => setSoap({...soap, o: e.target.value})} style={{ width: '100%', minHeight: '80px', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', resize: 'vertical', fontSize: '14px', marginTop: '5px' }} placeholder="Examen físico..." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>Análisis (A)</label>
                  <textarea value={soap.a} onChange={e => setSoap({...soap, a: e.target.value})} style={{ width: '100%', minHeight: '100px', padding: '15px', borderRadius: '10px', border: '1px solid #93c5fd', background: '#eff6ff', outline: 'none', resize: 'vertical', fontSize: '14px', marginTop: '5px' }} placeholder="Diagnósticos..." />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>Plan (P)</label>
                  <textarea value={soap.p} onChange={e => setSoap({...soap, p: e.target.value})} style={{ width: '100%', minHeight: '100px', padding: '15px', borderRadius: '10px', border: '1px solid #d8b4fe', background: '#faf5ff', outline: 'none', resize: 'vertical', fontSize: '14px', marginTop: '5px' }} placeholder="Tratamiento a seguir..." />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque Dividido: Recetas y Órdenes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            
            {/* Recetario */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Pill size={18} color="#10b981" /> RECETARIO</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Medicamento" value={nuevaReceta.med} onChange={e => setNuevaReceta({...nuevaReceta, med: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="Indicaciones" value={nuevaReceta.indicacion} onChange={e => setNuevaReceta({...nuevaReceta, indicacion: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }} />
                  <button onClick={agregarMedicamento} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}><Plus size={16}/></button>
                </div>
              </div>
              {recetas.length > 0 && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  {recetas.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#ecfdf5', padding: '8px', borderRadius: '6px', marginBottom: '5px', color: '#065f46', fontWeight: 700 }}>
                      <span>{r.med}</span>
                      <button onClick={() => setRecetas(recetas.filter(x => x.id !== r.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NUEVO: Órdenes Médicas */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileSearch size={18} color="#38bdf8" /> SOLICITUD DE EXÁMENES</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={nuevoExamen} onChange={e => setNuevoExamen(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: 'white' }}>
                  <option value="">Seleccione examen...</option>
                  <option value="Rx Panorámica">Rx Panorámica</option>
                  <option value="Rx Periapical">Rx Periapical</option>
                  <option value="Tomografía Cone Beam">Tomografía Cone Beam</option>
                  <option value="Cuadro Hemático">Cuadro Hemático</option>
                </select>
                <button onClick={agregarExamen} style={{ background: '#38bdf8', color: 'white', border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}><Plus size={16}/></button>
              </div>
              {examenes.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  {examenes.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#f0f9ff', padding: '8px', borderRadius: '6px', marginBottom: '5px', color: '#0369a1', fontWeight: 700 }}>
                      <span>{e.nombre}</span>
                      <button onClick={() => setExamenes(examenes.filter(x => x.id !== e.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* NUEVO: Módulo Próxima Cita */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '12px' }}><Calendar size={24} color="#ef4444" /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0' }}>Plan de Próxima Cita</h3>
              <div style={{ display: 'flex', gap: '15px' }}>
                <select value={proximaCita.tiempo} onChange={e => setProximaCita({...proximaCita, tiempo: e.target.value})} style={{ width: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }}>
                  <option value="">¿Cuándo?</option><option value="En 1 semana">En 1 semana</option><option value="En 1 mes">En 1 mes</option><option value="En 6 meses">En 6 meses (Control)</option>
                </select>
                <input type="text" placeholder="Motivo de la próxima cita..." value={proximaCita.motivo} onChange={e => setProximaCita({...proximaCita, motivo: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }} />
              </div>
            </div>
          </div> {/* Fin de Módulo Próxima Cita */}
        </div> {/* Fin de Columna Derecha */}
      </div> {/* Fin de custom-scroll */}
    </div> // Fin de contenedor principal
  );
};

export default EntornoGeneral;