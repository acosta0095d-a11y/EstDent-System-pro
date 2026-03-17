import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { usePatient } from '../../../core/context/PatientContext';
import { GeneralOdontogram } from '../components/GeneralOdontogram';
import { 
  Clock, Save, ChevronLeft, Plus, Pill, Microscope, 
  Scissors, FileText, X, AlertCircle, CheckCircle, 
  Activity, ClipboardList, Stethoscope, FileSignature, 
  Printer, Scan, Heart, Eye, Info, AlertTriangle,
  Bone, Zap, Trash, DollarSign, CheckSquare, Search, BookOpen,
  User, Hash, Calendar, ShieldCheck, ShieldAlert
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURACIÓN, TIPOS Y DICCIONARIOS CLÍNICOS
// ============================================================================

const COLORS = {
  primary: '#00A4E4', primaryLight: '#e0f2fe', primaryDark: '#0284c7',
  secondary: '#64748b', secondaryLight: '#f8fafc',
  success: '#10b981', successLight: '#d1fae5',
  warning: '#f59e0b', warningLight: '#fef3c7',
  error: '#ef4444', errorLight: '#fee2e2',
  info: '#8b5cf6', infoLight: '#ede9fe',
  background: '#f8fafc', surface: '#ffffff',
  text: '#0f172a', textLight: '#64748b', border: '#e2e8f0'
};

const getToolColor = (tipo: string) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('caries')) return { base: '#ef4444', pastel: '#fef2f2' };
  if (t.includes('resina') || t.includes('obturacion')) return { base: '#3b82f6', pastel: '#eff6ff' };
  if (t.includes('fractura')) return { base: '#f59e0b', pastel: '#fffbeb' };
  if (t.includes('endodoncia') || t.includes('pulpar') || t.includes('nervio')) return { base: '#8b5cf6', pastel: '#f5f3ff' };
  if (t.includes('extraccion') || t.includes('ausente')) return { base: '#64748b', pastel: '#f8fafc' };
  if (t.includes('implante') || t.includes('corona')) return { base: '#10b981', pastel: '#ecfdf5' };
  return { base: COLORS.primary, pastel: COLORS.primaryLight };
};

const ALLERGY_DB = [
  { triggers: ['penicilina', 'amoxicilina', 'ampicilina'], meds: ['amoxicilina', 'ampicilina', 'penicilina', 'amoxidal', 'augmentin'] },
  { triggers: ['aines', 'ibuprofeno', 'aspirina', 'naproxeno', 'diclofenaco'], meds: ['ibuprofeno', 'aspirina', 'naproxeno', 'diclofenaco', 'ketorolaco', 'meloxicam'] },
  { triggers: ['clindamicina'], meds: ['clindamicina'] }
];

const FDI_ADULTOS = Array.from({length: 8}, (_, i) => `1${i+1}`).concat(Array.from({length: 8}, (_, i) => `2${i+1}`), Array.from({length: 8}, (_, i) => `3${i+1}`), Array.from({length: 8}, (_, i) => `4${i+1}`));
const FDI_NINOS = Array.from({length: 5}, (_, i) => `5${i+1}`).concat(Array.from({length: 5}, (_, i) => `6${i+1}`), Array.from({length: 5}, (_, i) => `7${i+1}`), Array.from({length: 5}, (_, i) => `8${i+1}`));

const esDienteAnterior = (pieza: string) => {
  if (!pieza) return false;
  const digito = parseInt(pieza.charAt(1));
  return digito >= 1 && digito <= 3; 
};

const CARAS_POSTERIORES = ['Oclusal (O)', 'Mesial (M)', 'Distal (D)', 'Vestibular (V)', 'Palatino (P)', 'Lingual (L)', 'Múltiples Caras', 'Corona Completa'];
const CARAS_ANTERIORES = ['Incisal (I)', 'Mesial (M)', 'Distal (D)', 'Vestibular (V)', 'Palatino (P)', 'Lingual (L)', 'Múltiples Caras', 'Corona Completa'];

const CIE10_DENTALES = [
  { codigo: 'K02.9', nombre: 'Caries dental, no especificada' },
  { codigo: 'K04.0', nombre: 'Pulpitis' },
  { codigo: 'K04.1', nombre: 'Necrosis de la pulpa' },
  { codigo: 'K04.4', nombre: 'Periodontitis apical aguda de origen pulpar' },
  { codigo: 'K05.0', nombre: 'Gingivitis aguda' },
  { codigo: 'K05.1', nombre: 'Gingivitis crónica' },
  { codigo: 'K05.3', nombre: 'Periodontitis crónica' },
  { codigo: 'K08.1', nombre: 'Pérdida de dientes por accidente, extracción o enfermedad' },
  { codigo: 'K03.0', nombre: 'Atrición excesiva de los dientes' },
  { codigo: 'S02.5', nombre: 'Fractura de los dientes' }
];

interface HallazgoOdontograma { id: string; diente: string; tipo: string; superficie?: string; descripcion: string; severidad?: string; fechaRegistro: string; }
interface Procedimiento { id: string; nombre: string; pieza: string; cara: string; observaciones: string; fecha: string; migradoDesdeOdontograma?: boolean; hallazgoOrigen?: string; tipoHallazgo?: string; estado: 'sugerido' | 'presupuestado' | 'aprobado' | 'realizado'; costo: number; }
interface Diagnostico { id: string; codigo: string; nombre: string; tipo: 'principal' | 'secundario' | 'hallazgo'; diente?: string; migradoDesdeOdontograma?: boolean; tipoHallazgo?: string; }
interface Receta { id: string; medicamento: string; dosis: string; frecuencia: string; duracion: string; indicaciones: string; }
interface Props { onExit: () => void; }

const formatCOP = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

// ============================================================================
// 2. COMPONENTE PRINCIPAL
// ============================================================================

export const GeneralConsultation = ({ onExit }: Props) => {
  const { selectedPatient } = usePatient();
  
  const [activeTab, setActiveTab] = useState('anamnesis');
  const [tiempo, setTiempo] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showMigracionModal, setShowMigracionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false); // NUEVO ESTADO PARA CANCELAR
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');
  
  const [motivo, setMotivo] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string[]>([]);
  const [estadoGeneral, setEstadoGeneral] = useState({ actitud: 'Colaborador', higieneOral: 'Regular', alertaMedica: '' });
  const [evaluacionDolor, setEvaluacionDolor] = useState({ escala: 0, caracteristicas: [] as string[], desencadenantes: [] as string[], evolucion: '' });
  const [examenEstomatologico, setExamenEstomatologico] = useState({ atm: 'Sin alteraciones', labios: 'Sin alteraciones', lengua: 'Sin alteraciones', paladar: 'Sin alteraciones', pisoBoca: 'Sin alteraciones', encias: 'Sin alteraciones', observaciones: '' });
  const [busquedaCie10, setBusquedaCie10] = useState('');
  
  const [hallazgosOdontograma, setHallazgosOdontograma] = useState<HallazgoOdontograma[]>([]);
  const [diagnosticosManuales, setDiagnosticosManuales] = useState<Diagnostico[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  
  const [nuevoProcedimiento, setNuevoProcedimiento] = useState<Partial<Procedimiento>>({ nombre: '', pieza: '', cara: '', observaciones: '', costo: 0, estado: 'aprobado' });
  const [nuevaReceta, setNuevaReceta] = useState({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  const [consentimiento, setConsentimiento] = useState(false);
  const [alertaSeguridadReceta, setAlertaSeguridadReceta] = useState<string | null>(null);

  // ==========================================================================
  // 3. LÓGICA DE ESTADO DERIVADO Y SEGURIDAD CLÍNICA
  // ==========================================================================

  useEffect(() => {
    if (hallazgosOdontograma.length >= 0) {
      setProcedimientos(prev => prev.filter(proc => {
        if (!proc.migradoDesdeOdontograma) return true; 
        if (proc.estado === 'realizado' || proc.estado === 'aprobado') return true; 
        const existeHallazgo = hallazgosOdontograma.some(h => (h.id === proc.hallazgoOrigen || h.diente === proc.hallazgoOrigen));
        return existeHallazgo;
      }));
    }
  }, [hallazgosOdontograma]);

  const resultadosCie10 = useMemo(() => {
    if (!busquedaCie10.trim()) return [];
    const term = busquedaCie10.toLowerCase();
    return CIE10_DENTALES.filter(c => c.codigo.toLowerCase().includes(term) || c.nombre.toLowerCase().includes(term));
  }, [busquedaCie10]);

  const diagnosticosOdontograma = useMemo(() => {
    return hallazgosOdontograma.map(hallazgo => {
      let codigo = 'K08.9'; let nombre = `Hallazgo en diente ${hallazgo.diente}`;
      const tipoLow = String(hallazgo.tipo || '').toLowerCase();
      if (tipoLow.includes('caries')) { codigo = hallazgo.superficie ? 'K02.51' : 'K02.9'; nombre = `Caries en diente ${hallazgo.diente}`; }
      else if (tipoLow.includes('fractura')) { codigo = 'S02.5'; nombre = `Fractura dental del diente ${hallazgo.diente}`; }
      else if (tipoLow.includes('periodontal')) { codigo = 'K05.3'; nombre = `Enfermedad Periodontal en diente ${hallazgo.diente}`; }
      else if (tipoLow.includes('ausente')) { codigo = 'K08.1'; nombre = `Pérdida de diente ${hallazgo.diente}`; }
      if (hallazgo.severidad === 'externo') nombre = `${nombre} (Trabajo previo)`;

      return { id: `diag-odon-${hallazgo.id || hallazgo.diente}-${Math.random()}`, codigo, nombre, tipo: 'hallazgo' as const, diente: hallazgo.diente, migradoDesdeOdontograma: true, tipoHallazgo: hallazgo.tipo };
    });
  }, [hallazgosOdontograma]);

  const todosLosDiagnosticos = [...diagnosticosOdontograma, ...diagnosticosManuales];

  const procedimientosSugeridos = useMemo(() => {
    const sugerencias: Procedimiento[] = [];
    hallazgosOdontograma.forEach(hallazgo => {
      if (hallazgo.severidad === 'externo') return;
      let estadoInicial: 'sugerido' | 'presupuestado' | 'realizado' = 'sugerido';
      if (hallazgo.severidad === 'presupuesto') estadoInicial = 'presupuestado';
      if (hallazgo.severidad === 'realizado') estadoInicial = 'realizado';

      sugerencias.push({
        id: `sug-proc-${hallazgo.id || hallazgo.diente}-${Math.random()}`,
        nombre: `Revisión clínica`, pieza: hallazgo.diente, cara: hallazgo.superficie || 'Todas', observaciones: `Origen: Odontograma`,
        fecha: new Date().toLocaleDateString(), estado: estadoInicial, costo: 0, migradoDesdeOdontograma: true, hallazgoOrigen: hallazgo.id || hallazgo.diente, tipoHallazgo: hallazgo.tipo
      });
    });
    return sugerencias.filter(sug => !procedimientos.some(p => p.hallazgoOrigen === sug.hallazgoOrigen));
  }, [hallazgosOdontograma, procedimientos]);

  const resumenFinanciero = useMemo(() => {
    return procedimientos.reduce((totales, proc) => {
      const costoValido = Math.max(0, Number(proc.costo) || 0);
      if (proc.estado === 'presupuestado' || proc.estado === 'sugerido' || proc.estado === 'aprobado') totales.presupuesto += costoValido;
      else if (proc.estado === 'realizado') totales.realizadoHoy += costoValido;
      return totales;
    }, { presupuesto: 0, realizadoHoy: 0 });
  }, [procedimientos]);

  // ==========================================================================
  // 4. HANDLERS
  // ==========================================================================

  useEffect(() => { const timer = setInterval(() => setTiempo(prev => prev + 1), 1000); return () => clearInterval(timer); }, []);
  const formatTiempo = () => { const h = Math.floor(tiempo / 3600); const m = Math.floor((tiempo % 3600) / 60); const s = tiempo % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  const handleOdontogramaSync = useCallback((data: any) => {
    if (!data) return;
    let arrayDatos: any[] | null = null;
    if (Array.isArray(data)) arrayDatos = data;
    else if (typeof data === 'object') {
      if (Array.isArray(data.hallazgos)) arrayDatos = data.hallazgos;
      else if (Array.isArray(data.history)) arrayDatos = data.history;
      else if (Array.isArray(data.data)) arrayDatos = data.data;
      else if (data.diente) arrayDatos = [data];
    }
    if (arrayDatos) {
      setHallazgosOdontograma(prev => {
        const nuevos = arrayDatos.filter(nuevoItem => !prev.some(p => p.diente === nuevoItem.diente && p.tipo === nuevoItem.tipo));
        return [...prev, ...nuevos.map((item, i) => ({ ...item, id: item.id || `odo-${item.diente}-${Date.now()}-${i}`, tipo: item.tipo || 'hallazgo', descripcion: item.descripcion || `Hallazgo en ${item.diente}`, fechaRegistro: item.fechaRegistro || new Date().toISOString() }))];
      });
    }
  }, []);

  const aceptarSugerencias = useCallback(() => {
    if (procedimientosSugeridos.length === 0) return;
    setProcedimientos(prev => [...prev, ...procedimientosSugeridos]);
    setMensajeConfirmacion(`Se importaron ${procedimientosSugeridos.length} revisiones al plan.`);
    setShowConfirmModal(true); setTimeout(() => setShowConfirmModal(false), 3000);
  }, [procedimientosSugeridos]);

  const actualizarProcedimiento = (id: string, campo: keyof Procedimiento, valor: any) => {
    if (campo === 'costo' && Number(valor) < 0) valor = 0;
    setProcedimientos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const handleGuardar = () => {
    setIsSaved(true);
    setTimeout(() => { if(window.confirm('Consulta guardada exitosamente. ¿Desea cerrar la sesión clínica?')) onExit(); setIsSaved(false); }, 1000);
  };

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => { array.includes(item) ? setArray(array.filter(i => i !== item)) : setArray([...array, item]); };

  const agregarDiagnosticoManual = (cie10: {codigo: string, nombre: string}) => {
    if (diagnosticosManuales.some(d => d.codigo === cie10.codigo)) return;
    setDiagnosticosManuales([...diagnosticosManuales, { id: `diag-man-${Date.now()}`, codigo: cie10.codigo, nombre: cie10.nombre, tipo: 'principal' }]);
    setBusquedaCie10('');
  };

  const verificarSeguridadReceta = (medicamentoNuevo: string, dosisPropuesta: string): boolean => {
    setAlertaSeguridadReceta(null);
    if (!medicamentoNuevo.trim()) return true;

    const edadPaciente = selectedPatient?.edad ? parseInt(selectedPatient.edad.toString()) : 30;
    if (edadPaciente < 12) {
      const isDosisAlta = dosisPropuesta.toLowerCase().includes('500') || dosisPropuesta.toLowerCase().includes('800') || medicamentoNuevo.toLowerCase().includes('500mg');
      const isAdultForm = dosisPropuesta.toLowerCase().includes('tableta') || dosisPropuesta.toLowerCase().includes('capsula');
      
      if (isDosisAlta || isAdultForm) {
        setAlertaSeguridadReceta(`RIESGO PEDIÁTRICO: El paciente tiene ${edadPaciente} años. Verifique la dosis en mg/kg. Las tabletas o dosis de 500mg están contraindicadas.`);
        return false;
      }
    }

    const alertas = estadoGeneral.alertaMedica.toLowerCase();
    const med = medicamentoNuevo.toLowerCase();
    
    if (alertas) {
      for (const familia of ALLERGY_DB) {
        const tieneAlergiaRelacionada = familia.triggers.some(t => alertas.includes(t));
        const esMedicamentoPeligroso = familia.meds.some(m => med.includes(m));
        if (tieneAlergiaRelacionada && esMedicamentoPeligroso) {
          setAlertaSeguridadReceta(`ALTO RIESGO CLÍNICO: El paciente reporta: "${estadoGeneral.alertaMedica}". Recetar ${medicamentoNuevo} causará reacción cruzada.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleAgregarReceta = () => {
    if(!nuevaReceta.medicamento.trim()) return;
    if (verificarSeguridadReceta(nuevaReceta.medicamento, nuevaReceta.dosis)) {
      setRecetas([...recetas, {...nuevaReceta, id: Date.now().toString()}]);
      setNuevaReceta({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
    }
  };

  if (!selectedPatient) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.background }}>Cargando paciente...</div>;

  const carasDisponibles = esDienteAnterior(nuevoProcedimiento.pieza || '') ? CARAS_ANTERIORES : CARAS_POSTERIORES;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.background, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        
        .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .grid-2-col { grid-template-columns: 1fr; } }
        
        .card { background: white; border-radius: 16px; padding: 24px; border: 1px solid ${COLORS.border}; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03), 0 4px 6px -2px rgba(0,0,0,0.02); transition: box-shadow 0.3s ease; }
        .card:hover { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.02); }
        .card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 20px 0; border-bottom: 2px solid ${COLORS.primaryLight}; padding-bottom: 10px; display: inline-flex; }
        
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 12px; font-weight: 700; color: ${COLORS.textLight}; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em; }
        .input-base, select { width: 100%; padding: 12px 14px; border: 1px solid ${COLORS.border}; border-radius: 10px; font-size: 14px; font-family: inherit; transition: all 0.2s; background: ${COLORS.background}; color: ${COLORS.text}; box-sizing: border-box; }
        .input-base:focus, select:focus { outline: none; border-color: ${COLORS.primary}; background: white; box-shadow: 0 0 0 4px ${COLORS.primaryLight}; transform: translateY(-1px); }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        
        .tab-btn { padding: 16px 20px; background: transparent; border: none; border-bottom: 3px solid transparent; font-size: 13px; font-weight: 700; color: ${COLORS.textLight}; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; position: relative; }
        .tab-btn:hover { color: ${COLORS.primary}; background: linear-gradient(to top, ${COLORS.primaryLight}40, transparent); }
        .tab-btn.active { color: ${COLORS.primaryDark}; border-bottom-color: ${COLORS.primary}; background: linear-gradient(to top, ${COLORS.primaryLight}80, transparent); }
        
        .btn-primary { display: flex; align-items: center; gap: 6px; padding: 12px 20px; background: ${COLORS.primary}; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0, 164, 228, 0.2); }
        .btn-primary:hover { background: ${COLORS.primaryDark}; transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0, 164, 228, 0.3); }
        
        .btn-badge { padding: 6px 14px; background: white; border: 1px solid ${COLORS.border}; border-radius: 20px; font-size: 12px; font-weight: 600; color: ${COLORS.text}; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .btn-badge:hover { border-color: ${COLORS.primary}; color: ${COLORS.primaryDark}; background: ${COLORS.primaryLight}; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,164,228,0.1); }
      `}</style>

      {/* HEADER PREMIUM */}
      <header className="no-print" style={{ background: '#ffffff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, position: 'sticky', top: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          
          {/* NUEVO BOTÓN CANCELAR */}
          <button 
            onClick={() => setShowCancelModal(true)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '12px', color: COLORS.textLight, cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} 
            onMouseOver={e => { e.currentTarget.style.color = COLORS.error; e.currentTarget.style.borderColor = COLORS.errorLight; e.currentTarget.style.background = COLORS.errorLight; }} 
            onMouseOut={e => { e.currentTarget.style.color = COLORS.textLight; e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = 'white'; }}
          >
            <ChevronLeft size={16} /> Cancelar Sesión
          </button>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '8px 20px 8px 8px', background: COLORS.background, borderRadius: '40px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #00A4E4 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '18px', border: `3px solid white`, boxShadow: '0 4px 10px rgba(0,164,228,0.2)' }}>
              {selectedPatient.nombre?.[0]}{selectedPatient.apellidos?.[0]}
            </div>
            <div>
              <div style={{ color: COLORS.text, fontWeight: 800, fontSize: '16px', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {selectedPatient.nombre} {selectedPatient.apellidos} 
                <ShieldCheck size={14} color={COLORS.success} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}><Hash size={12} /> {selectedPatient.cc || 'N/A'}</span>
                <span style={{ color: COLORS.border }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}><User size={12} /> {selectedPatient.edad} años</span>
                <span style={{ color: COLORS.border }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: COLORS.primaryDark }}><FileSignature size={12} /> HC: #{selectedPatient.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: COLORS.secondaryLight, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.success, animation: 'pulseDot 1.5s infinite' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '1px' }}>Sesión Activa</span>
              <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: COLORS.primaryDark, lineHeight: 1 }}>{formatTiempo()}</span>
            </div>
          </div>
          
          <button className="btn-primary" onClick={handleGuardar} style={{ background: isSaved ? COLORS.success : COLORS.primary, padding: '14px 28px', borderRadius: '12px', fontSize: '14px' }}>
            {isSaved ? <CheckCircle size={18} /> : <Save size={18} />} {isSaved ? 'Guardado Exitoso' : 'Guardar Sesión'}
          </button>
        </div>
      </header>

      {/* BARRA DE NAVEGACIÓN */}
      <div className="no-print" style={{ background: 'white', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', padding: '0 32px', overflowX: 'auto', gap: '4px' }}>
        <button className={`tab-btn ${activeTab === 'anamnesis' ? 'active' : ''}`} onClick={() => setActiveTab('anamnesis')}><ClipboardList size={16} /> Anamnesis & Triage</button>
        <button className={`tab-btn ${activeTab === 'odontograma' ? 'active' : ''}`} onClick={() => setActiveTab('odontograma')}><Scan size={16} /> Odontograma {hallazgosOdontograma.length > 0 && <span style={{ marginLeft: '5px', background: COLORS.primary, color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '10px' }}>{hallazgosOdontograma.length}</span>}</button>
        <button className={`tab-btn ${activeTab === 'examen' ? 'active' : ''}`} onClick={() => setActiveTab('examen')}><Stethoscope size={16} /> Examen & Diagnóstico</button>
        <button className={`tab-btn ${activeTab === 'procedimientos' ? 'active' : ''}`} onClick={() => setActiveTab('procedimientos')}><Scissors size={16} /> Procedimientos & Cotización {procedimientosSugeridos.length > 0 && <span style={{ marginLeft: '5px', background: COLORS.warning, color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '10px' }}>{procedimientosSugeridos.length}</span>}</button>
        <button className={`tab-btn ${activeTab === 'recetas' ? 'active' : ''}`} onClick={() => setActiveTab('recetas')}><Pill size={16} /> Recetas</button>
      </div>

      {/* ÁREA DE TRABAJO */}
      <div className="no-print" style={{ flex: 1, overflow: 'auto', padding: '40px 30px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* TAB 1: ANAMNESIS */}
          <div style={{ display: activeTab === 'anamnesis' ? 'block' : 'none' }}>
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card">
                <h3 className="card-title" style={{ color: COLORS.primaryDark }}><Activity size={20} /> Condición General en Consulta</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                  <div className="form-group">
                    <label>Actitud del Paciente</label>
                    <select className="input-base" value={estadoGeneral.actitud} onChange={e => setEstadoGeneral({...estadoGeneral, actitud: e.target.value})}>
                      <option value="Colaborador">Colaborador / Tranquilo</option>
                      <option value="Ansioso">Ansioso / Temeroso</option>
                      <option value="Poco colaborador">Poco colaborador</option>
                      <option value="Dolor agudo">Con dolor agudo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Higiene Oral Observada</label>
                    <select className="input-base" value={estadoGeneral.higieneOral} onChange={e => setEstadoGeneral({...estadoGeneral, higieneOral: e.target.value})}>
                      <option value="Buena">Buena (Sin placa evidente)</option>
                      <option value="Regular">Regular (Placa localizada)</option>
                      <option value="Mala">Mala (Placa generalizada / Cálculo)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ color: estadoGeneral.alertaMedica ? COLORS.error : COLORS.textLight }}>Alerta / Riesgo Médico Rápido</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className="input-base" 
                        placeholder="Ej. Alérgico a penicilina, Asmático..." 
                        value={estadoGeneral.alertaMedica} 
                        onChange={e => {
                          setEstadoGeneral({...estadoGeneral, alertaMedica: e.target.value});
                          if(alertaSeguridadReceta) setAlertaSeguridadReceta(null); 
                        }} 
                        style={{ 
                          borderColor: estadoGeneral.alertaMedica ? COLORS.error : COLORS.border,
                          background: estadoGeneral.alertaMedica ? COLORS.errorLight : COLORS.background,
                          color: estadoGeneral.alertaMedica ? COLORS.error : COLORS.text,
                          fontWeight: estadoGeneral.alertaMedica ? 700 : 400,
                          paddingLeft: estadoGeneral.alertaMedica ? '35px' : '14px'
                        }} 
                      />
                      {estadoGeneral.alertaMedica && <AlertTriangle size={18} color={COLORS.error} style={{ position: 'absolute', left: '12px', top: '12px' }} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-2-col">
                <div className="card">
                  <h3 className="card-title"><ClipboardList size={18} /> Motivo de Consulta de Hoy</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {[ { id: 'dolor', label: 'Dolor / Molestia', icon: AlertTriangle }, { id: 'control', label: 'Control Rutina', icon: CheckCircle }, { id: 'estetica', label: 'Estética', icon: Eye }, { id: 'trauma', label: 'Traumatismo', icon: Zap }, { id: 'protesis', label: 'Problema Prótesis', icon: Bone } ].map(btn => {
                      const isSelected = motivoSeleccionado.includes(btn.id); const Icon = btn.icon;
                      return ( <button key={btn.id} onClick={() => toggleArrayItem(motivoSeleccionado, setMotivoSeleccionado, btn.id)} style={{ padding: '8px 14px', background: isSelected ? COLORS.primary : COLORS.background, color: isSelected ? 'white' : COLORS.text, border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}> <Icon size={14} /> {btn.label} </button> )
                    })}
                  </div>
                  <div className="form-group"><label>Relato del Paciente</label><textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Sensibilidad al frío..." className="input-base" /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label>Evolución clínica</label><textarea rows={2} value={evaluacionDolor.evolucion} onChange={e => setEvaluacionDolor({...evaluacionDolor, evolucion: e.target.value})} placeholder="Ej. Inició hace 3 días..." className="input-base" /></div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ color: evaluacionDolor.escala > 6 ? COLORS.error : COLORS.text }}><Activity size={18} /> Escala y Análisis del Dolor</h3>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', margin: 0 }}>Intensidad (0-10)</label><span style={{ fontSize: '13px', fontWeight: 800, color: evaluacionDolor.escala > 7 ? COLORS.error : evaluacionDolor.escala > 3 ? COLORS.warning : COLORS.success }}>{evaluacionDolor.escala === 0 ? 'Sin Dolor' : evaluacionDolor.escala <= 3 ? 'Leve' : evaluacionDolor.escala <= 7 ? 'Moderado' : 'Severo'}</span></div>
                    <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                      {[0,1,2,3,4,5,6,7,8,9,10].map(num => {
                        let bgColor = COLORS.border; let isSelected = evaluacionDolor.escala === num;
                        if (isSelected) { if (num === 0) bgColor = COLORS.success; else if (num <= 3) bgColor = '#84cc16'; else if (num <= 6) bgColor = '#f59e0b'; else if (num <= 8) bgColor = '#ea580c'; else bgColor = '#dc2626'; }
                        return ( <button key={num} onClick={() => setEvaluacionDolor({...evaluacionDolor, escala: num})} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: '8px', background: isSelected ? bgColor : COLORS.background, color: isSelected ? 'white' : COLORS.textLight, fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSelected ? `0 4px 10px ${bgColor}60` : 'none', transform: isSelected ? 'scale(1.05)' : 'scale(1)' }}>{num}</button> )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Tipo de Dolor</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{['Punzante', 'Sordo / Continuo', 'Irradiado', 'Pulsátil'].map(tipo => ( <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}><input type="checkbox" checked={evaluacionDolor.caracteristicas.includes(tipo)} onChange={() => toggleArrayItem(evaluacionDolor.caracteristicas, (arr) => setEvaluacionDolor({...evaluacionDolor, caracteristicas: arr}), tipo)} style={{ accentColor: COLORS.primary, width: '16px', height: '16px' }} /> {tipo}</label> ))}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Desencadenantes</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{['Al Frío', 'Al Calor', 'Al Masticar', 'Espontáneo / Nocturno'].map(tipo => ( <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}><input type="checkbox" checked={evaluacionDolor.desencadenantes.includes(tipo)} onChange={() => toggleArrayItem(evaluacionDolor.desencadenantes, (arr) => setEvaluacionDolor({...evaluacionDolor, desencadenantes: arr}), tipo)} style={{ accentColor: COLORS.warning, width: '16px', height: '16px' }} /> {tipo}</label> ))}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 2: ODONTOGRAMA */}
          <div style={{ display: activeTab === 'odontograma' ? 'block' : 'none' }}>
            <div className="fade-in">
              <div style={{ background: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, marginBottom: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <div style={{ background: COLORS.primary, padding: '15px 24px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><Scan size={20} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Odontograma Clínico Evolutivo</h3></div>
                <div style={{ padding: '24px' }}>
                  <GeneralOdontogram onHistoryChange={handleOdontogramaSync} onChange={handleOdontogramaSync} onUpdate={handleOdontogramaSync} value={hallazgosOdontograma} />
                </div>
              </div>
              {hallazgosOdontograma.length > 0 && (
                <button onClick={() => setShowMigracionModal(true)} style={{ width: '100%', padding: '14px', background: COLORS.primaryLight, color: COLORS.primaryDark, border: `1px solid ${COLORS.primary}`, borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Eye size={18} /> Ver resumen de hallazgos automáticos ({diagnosticosOdontograma.length} diagnósticos, {procedimientosSugeridos.length} sugerencias)
                </button>
              )}
            </div>
          </div>

          {/* TAB 3: EXAMEN Y DIAGNÓSTICO */}
          <div style={{ display: activeTab === 'examen' ? 'block' : 'none' }}>
            <div className="fade-in grid-2-col">
              <div className="card">
                <h3 className="card-title"><Microscope size={18} /> Examen Estomatológico (Tejidos Blandos y ATM)</h3>
                <div className="form-group"><label>Articulación Temporomandibular (ATM)</label><select className="input-base" value={examenEstomatologico.atm} onChange={e => setExamenEstomatologico({...examenEstomatologico, atm: e.target.value})}><option value="Sin alteraciones">Sin alteraciones aparentes</option><option value="Chasquido articular">Chasquido articular</option><option value="Dolor a la palpacion">Dolor a la palpación</option><option value="Apertura limitada">Apertura limitada (&lt;40mm)</option><option value="Desviacion">Desviación en apertura/cierre</option></select></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group"><label>Labios</label><select className="input-base" value={examenEstomatologico.labios} onChange={e => setExamenEstomatologico({...examenEstomatologico, labios: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Resequedad / Fisuras">Resequedad / Fisuras</option><option value="Lesion ulcerosa">Lesión ulcerosa</option><option value="Aumento de volumen">Aumento de volumen</option></select></div>
                  <div className="form-group"><label>Carrillos / Mucosa Yugal</label><select className="input-base" value={examenEstomatologico.carrillos} onChange={e => setExamenEstomatologico({...examenEstomatologico, carrillos: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Linea alba prominente">Línea alba prominente</option><option value="Mordisqueo">Mordisqueo</option><option value="Eritema">Eritema / Inflamación</option></select></div>
                  <div className="form-group"><label>Lengua</label><select className="input-base" value={examenEstomatologico.lengua} onChange={e => setExamenEstomatologico({...examenEstomatologico, lengua: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Saburral">Saburral</option><option value="Fisurada">Fisurada</option><option value="Geografica">Geográfica</option></select></div>
                  <div className="form-group"><label>Paladar</label><select className="input-base" value={examenEstomatologico.paladar} onChange={e => setExamenEstomatologico({...examenEstomatologico, paladar: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Torus palatino">Torus palatino</option><option value="Estomatitis">Estomatitis protésica</option></select></div>
                </div>
                <div className="form-group"><label>Piso de boca y Encías</label><select className="input-base" value={examenEstomatologico.encias} onChange={e => setExamenEstomatologico({...examenEstomatologico, encias: e.target.value})}><option value="Sin alteraciones">Sin alteraciones (Rosa coral, firme)</option><option value="Gingivitis leve">Gingivitis leve (Eritema marginal)</option><option value="Gingivitis severa">Gingivitis severa (Sangrado espontáneo)</option><option value="Retraccion gingival">Retracción gingival localizada/general</option><option value="Torus mandibular">Torus mandibular</option></select></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Hallazgos adicionales</label><textarea rows={2} value={examenEstomatologico.observaciones} onChange={e => setExamenEstomatologico({...examenEstomatologico, observaciones: e.target.value})} placeholder="Ej. Se observa lesión blanquecina no desprendible..." className="input-base" /></div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="card-title"><BookOpen size={18} /> Impresión Diagnóstica y CIE-10</h3>
                <div style={{ marginBottom: '20px', background: COLORS.background, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Agregar Diagnóstico Manual</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color={COLORS.textLight} style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input type="text" className="input-base" placeholder="Buscar código o enfermedad..." style={{ paddingLeft: '40px' }} value={busquedaCie10} onChange={(e) => setBusquedaCie10(e.target.value)} />
                    {resultadosCie10.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '12px', marginTop: '8px', zIndex: 10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
                        {resultadosCie10.map(cie => (
                          <div key={cie.codigo} onClick={() => agregarDiagnosticoManual(cie)} style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = COLORS.background} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                            <span style={{ fontWeight: 700, color: COLORS.primaryDark }}>{cie.codigo}</span><span style={{ color: COLORS.text, textAlign: 'right' }}>{cie.nombre}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Lista de Problemas de la Sesión</label>
                  {todosLosDiagnosticos.map(d => {
                    const diagColor = d.tipoHallazgo ? getToolColor(d.tipoHallazgo) : { base: COLORS.info, pastel: COLORS.infoLight };
                    return (
                      <div key={d.id} style={{ padding: '14px', background: d.migradoDesdeOdontograma ? diagColor.pastel : 'white', borderRadius: '10px', marginBottom: '10px', fontSize: '13px', border: `1px solid ${d.migradoDesdeOdontograma ? diagColor.base + '50' : COLORS.border}`, borderLeft: `4px solid ${d.migradoDesdeOdontograma ? diagColor.base : COLORS.primary}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div><span style={{ fontWeight: 800, color: COLORS.text }}>{d.codigo}</span> <span style={{ color: COLORS.textLight }}>- {d.nombre}</span>{d.diente && <div style={{ fontSize: '11px', color: COLORS.textLight, marginTop: '6px', fontWeight: 600 }}>Asociado a pieza dental #{d.diente}</div>}</div>
                          {d.migradoDesdeOdontograma ? <span style={{ fontSize: '10px', background: 'white', padding: '4px 8px', borderRadius: '12px', color: diagColor.base, fontWeight: 800, border: `1px solid ${diagColor.base}` }}>{d.tipoHallazgo}</span> : <button onClick={() => setDiagnosticosManuales(diagnosticosManuales.filter(item => item.id !== d.id))} style={{ background: COLORS.errorLight, border: 'none', color: COLORS.error, cursor: 'pointer', padding: '6px', borderRadius: '6px' }}><Trash size={14} /></button>}
                        </div>
                      </div>
                    )
                  })}
                  {todosLosDiagnosticos.length === 0 && ( <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textLight, border: `2px dashed ${COLORS.border}`, borderRadius: '12px' }}><Activity size={32} style={{ opacity: 0.3, marginBottom: '12px' }}/><div style={{ fontSize: '14px', fontWeight: 500 }}>Sin diagnósticos registrados.</div></div> )}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 4: PROCEDIMIENTOS Y PRESUPUESTO */}
          <div style={{ display: activeTab === 'procedimientos' ? 'block' : 'none' }}>
            <div className="fade-in card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}><Scissors size={20} /> Plan de Tratamiento & Presupuesto</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: consentimiento ? COLORS.successLight : COLORS.warningLight, color: consentimiento ? COLORS.success : COLORS.warning, padding: '10px 18px', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s', fontWeight: 700 }}>
                  <input type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)} style={{ accentColor: COLORS.success, width: '18px', height: '18px' }} />
                  <FileText size={18} /> Consentimiento Informado Firmado
                </label>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, background: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: COLORS.primaryLight, padding: '12px', borderRadius: '12px' }}><FileText size={20} color={COLORS.primaryDark} /></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presupuesto Total (Pendiente)</div><div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.text }}>{formatCOP(resumenFinanciero.presupuesto)}</div></div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '12px' }}><CheckSquare size={20} color="#166534" /></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realizado Hoy (A Cobrar)</div><div style={{ fontSize: '22px', fontWeight: 900, color: '#166534' }}>{formatCOP(resumenFinanciero.realizadoHoy)}</div></div>
                </div>
              </div>

              {procedimientosSugeridos.length > 0 && (
                <div style={{ background: COLORS.infoLight, border: `1px solid ${COLORS.info}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.infoDark, fontWeight: 700, fontSize: '14px' }}>
                    <Info size={20} /> Inteligencia Clínica: {procedimientosSugeridos.length} revisiones sugeridas por el Odontograma
                  </div>
                  <button onClick={aceptarSugerencias} style={{ padding: '8px 16px', background: COLORS.info, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}><Plus size={16} /> Importar Todos</button>
                </div>
              )}

              {/* INPUTS DE PROCEDIMIENTOS CON VALIDACIÓN ANATÓMICA FDI */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr 1fr auto', gap: '12px', background: COLORS.background, padding: '20px', borderRadius: '16px', marginBottom: '24px', border: `1px solid ${COLORS.border}`, alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Procedimiento</label><input className="input-base" type="text" placeholder="Ej. Limpieza" value={nuevoProcedimiento.nombre} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, nombre: e.target.value})} /></div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Pieza (FDI)</label>
                  <select className="input-base" value={nuevoProcedimiento.pieza} onChange={e => {
                      const nuevaPieza = e.target.value;
                      setNuevoProcedimiento({...nuevoProcedimiento, pieza: nuevaPieza, cara: ''});
                    }}>
                    <option value="">General / N/A</option>
                    <optgroup label="Adultos">
                      {FDI_ADULTOS.map(p => <option key={`ad-${p}`} value={p}>{p}</option>)}
                    </optgroup>
                    <optgroup label="Niños">
                      {FDI_NINOS.map(p => <option key={`ni-${p}`} value={p}>{p}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Cara Anatómica</label>
                  <select className="input-base" value={nuevoProcedimiento.cara} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, cara: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {carasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}><label>Observaciones</label><input className="input-base" type="text" placeholder="Detalles..." value={nuevoProcedimiento.observaciones} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, observaciones: e.target.value})} /></div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Estado</label>
                  <select className="input-base" value={nuevoProcedimiento.estado} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, estado: e.target.value as any})}>
                    <option value="sugerido">Sugerido</option><option value="presupuestado">Presupuestado</option><option value="aprobado">Aprobado</option><option value="realizado">Realizado Hoy</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}><label>Costo ($)</label><input className="input-base" type="number" min="0" placeholder="0" value={nuevoProcedimiento.costo || ''} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, costo: Math.max(0, Number(e.target.value))})} /></div>
                
                <button className="btn-primary" style={{ height: '44px', padding: '0 24px' }} onClick={() => {
                  if(nuevoProcedimiento.nombre && nuevoProcedimiento.nombre.trim() !== '') {
                    setProcedimientos([{ ...nuevoProcedimiento, id: `proc-man-${Date.now()}`, fecha: new Date().toLocaleDateString() } as Procedimiento, ...procedimientos]);
                    setNuevoProcedimiento({ nombre: '', pieza: '', cara: '', observaciones: '', costo: 0, estado: 'aprobado' });
                  }
                }}><Plus size={20} /> Añadir</button>
              </div>

              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: COLORS.background, color: COLORS.textLight, textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
                      <th style={{ padding: '16px' }}>Procedimiento</th><th style={{ padding: '16px' }}>Ubicación</th><th style={{ padding: '16px' }}>Estado Workflow</th><th style={{ padding: '16px' }}>Costo Final</th><th style={{ padding: '16px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedimientos.map((p) => {
                      const getBadgeStyle = (estado: string) => {
                        switch(estado) { case 'realizado': return { bg: COLORS.successLight, text: COLORS.success }; case 'aprobado': return { bg: COLORS.primaryLight, text: COLORS.primaryDark }; case 'presupuestado': return { bg: '#e0e7ff', text: '#4338ca' }; default: return { bg: COLORS.warningLight, text: COLORS.warning }; }
                      };
                      const badge = getBadgeStyle(p.estado);
                      const toolColor = p.tipoHallazgo ? getToolColor(p.tipoHallazgo) : { base: COLORS.border, pastel: 'white' };

                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.border}`, background: p.estado === 'realizado' ? '#f0fdf4' : 'white', transition: 'background 0.3s' }}>
                          <td style={{ padding: '16px', background: toolColor.pastel }}>
                            <input type="text" value={p.nombre} onChange={(e) => actualizarProcedimiento(p.id, 'nombre', e.target.value)} style={{ fontWeight: 800, fontSize: '14px', color: COLORS.text, background: 'transparent', border: 'none', width: '100%', outline: 'none', borderBottom: p.migradoDesdeOdontograma ? `1px dashed ${toolColor.base}` : 'none' }} />
                            {p.tipoHallazgo && <div style={{ fontSize: '11px', color: toolColor.base, marginTop: '6px', fontWeight: 700 }}>Herramienta: {p.tipoHallazgo}</div>}
                            {p.observaciones && <div style={{ fontSize: '12px', color: COLORS.textLight, marginTop: '4px' }}>{p.observaciones}</div>}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {p.pieza ? ( <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span style={{ background: COLORS.background, border: `1px solid ${COLORS.border}`, padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '12px' }}>Pz: {p.pieza}</span><span style={{ color: COLORS.textLight, fontSize: '13px', fontWeight: 500 }}>Cara: {p.cara}</span></div> ) : <span style={{ color: COLORS.textLight, fontSize: '13px', fontWeight: 500 }}>General</span>}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <select value={p.estado} onChange={(e) => actualizarProcedimiento(p.id, 'estado', e.target.value)} style={{ padding: '6px 12px', borderRadius: '24px', border: `1px solid ${badge.text}40`, background: badge.bg, color: badge.text, fontWeight: 800, fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                              <option value="sugerido">Sugerido</option><option value="presupuestado">Presupuestado</option><option value="aprobado">Aprobado</option><option value="realizado">Realizado (Hoy)</option>
                            </select>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '4px 8px' }}>
                              <DollarSign size={14} color={COLORS.textLight} />
                              <input type="number" min="0" value={p.costo || ''} onChange={(e) => actualizarProcedimiento(p.id, 'costo', e.target.value)} placeholder="0" style={{ border: 'none', outline: 'none', width: '90px', fontWeight: 800, color: COLORS.text, background: 'transparent', fontSize: '14px' }} />
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button onClick={() => setProcedimientos(procedimientos.filter(item => item.id !== p.id))} style={{ background: COLORS.errorLight, border: 'none', color: COLORS.error, cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#fca5a5'} onMouseOut={e => e.currentTarget.style.background = COLORS.errorLight}><Trash size={16} /></button>
                          </td>
                        </tr>
                      )
                    })}
                    {procedimientos.length === 0 && ( <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: COLORS.textLight }}><div style={{ fontSize: '14px', fontWeight: 500 }}>El plan de tratamiento está vacío.</div></td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TAB 5: RECETAS CON VIGILANTE DE SEGURIDAD */}
          <div style={{ display: activeTab === 'recetas' ? 'block' : 'none' }}>
            <div className="fade-in grid-2-col">
              <div className="card">
                <h3 className="card-title"><Pill size={18} /> Nueva Prescripción</h3>
                
                {alertaSeguridadReceta && (
                  <div className="shake" style={{ background: COLORS.errorLight, color: COLORS.error, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.error}`, marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', fontWeight: 700 }}>
                    <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>{alertaSeguridadReceta}</div>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: COLORS.textLight }}>Vademécum Rápido</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px 0' }}>
                    <button className="btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Amoxicilina 500mg', dosis: '1 cápsula', frecuencia: 'Cada 8h', duracion: '7 días', indicaciones: 'Tomar después de comidas' }); verificarSeguridadReceta('Amoxicilina 500mg', '1 cápsula'); }}>Amoxicilina</button>
                    <button className="btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Ibuprofeno 400mg', dosis: '1 tableta', frecuencia: 'Cada 8h', duracion: '3 días', indicaciones: 'Con alimentos' }); verificarSeguridadReceta('Ibuprofeno 400mg', '1 tableta'); }}>Ibuprofeno</button>
                    <button className="btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Clindamicina 300mg', dosis: '1 cápsula', frecuencia: 'Cada 8h', duracion: '7 días', indicaciones: 'Con abundante agua' }); verificarSeguridadReceta('Clindamicina 300mg', '1 cápsula'); }}>Clindamicina</button>
                  </div>
                </div>
                
                <div className="form-group"><input type="text" className="input-base" placeholder="Medicamento" value={nuevaReceta.medicamento} onChange={e => { setNuevaReceta({...nuevaReceta, medicamento: e.target.value}); setAlertaSeguridadReceta(null); }} /></div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <input type="text" className="input-base" placeholder="Dosis" value={nuevaReceta.dosis} onChange={e => { setNuevaReceta({...nuevaReceta, dosis: e.target.value}); setAlertaSeguridadReceta(null); }} />
                  <input type="text" className="input-base" placeholder="Frecuencia" value={nuevaReceta.frecuencia} onChange={e => setNuevaReceta({...nuevaReceta, frecuencia: e.target.value})} />
                  <input type="text" className="input-base" placeholder="Duración" value={nuevaReceta.duracion} onChange={e => setNuevaReceta({...nuevaReceta, duracion: e.target.value})} />
                </div>
                
                <div className="form-group"><textarea rows={2} className="input-base" placeholder="Indicaciones adicionales" value={nuevaReceta.indicaciones} onChange={e => setNuevaReceta({...nuevaReceta, indicaciones: e.target.value})} /></div>
                
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={handleAgregarReceta}>
                  <Plus size={18} /> Agregar a la Receta
                </button>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}><Printer size={18} /> Receta Actual</h3>
                </div>
                <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '24px', minHeight: '200px', border: '1px solid #fde68a' }}>
                  {recetas.map((r, i) => (
                    <div key={r.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i !== recetas.length-1 ? '1px dashed #fcd34d' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '15px', color: '#92400e', fontWeight: 800 }}>{r.medicamento}</strong>
                        <button onClick={() => setRecetas(recetas.filter(item => item.id !== r.id))} style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer' }}><X size={16} /></button>
                      </div>
                      <div style={{ fontSize: '14px', color: '#b45309', marginTop: '6px' }}>Tomar <b>{r.dosis}</b> {r.frecuencia} durante <b>{r.duracion}</b>.</div>
                      {r.indicaciones && <div style={{ fontSize: '13px', color: '#d97706', marginTop: '6px', fontStyle: 'italic', fontWeight: 500 }}>* {r.indicaciones}</div>}
                    </div>
                  ))}
                  {recetas.length === 0 && <div style={{ textAlign: 'center', color: '#d97706', marginTop: '50px', fontSize: '14px', fontWeight: 500 }}>No hay medicamentos en la receta.</div>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL MIGRACIÓN ODONTOGRAMA CON BACKDROP BLUR */}
      {showMigracionModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="fade-in" style={{ background: 'white', borderRadius: '20px', width: '650px', maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><h2 style={{ margin: 0, color: COLORS.text, fontSize: '20px', fontWeight: 800 }}>Resumen Inteligente del Odontograma</h2><button onClick={() => setShowMigracionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textLight }}><X size={24} /></button></div>
            <p style={{ fontSize: '15px', color: COLORS.textLight, marginBottom: '24px' }}>El sistema ha analizado sus trazos en el odontograma y sugiere el siguiente plan de acción:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: COLORS.infoLight, padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.info}` }}>
                <h3 style={{ fontSize: '15px', margin: '0 0 12px 0', color: COLORS.infoDark, fontWeight: 800 }}>{diagnosticosOdontograma.length} Diagnósticos derivados</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: COLORS.text, fontWeight: 500 }}>{diagnosticosOdontograma.map(d => <li key={d.id} style={{marginBottom: '6px'}}><strong>{d.codigo}</strong> - Pieza #{d.diente}</li>)}</ul>
              </div>
              <div style={{ background: COLORS.warningLight, padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.warning}` }}>
                <h3 style={{ fontSize: '15px', margin: '0 0 12px 0', color: '#b45309', fontWeight: 800 }}>{procedimientosSugeridos.length} Tratamientos a cotizar</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: COLORS.text, fontWeight: 500 }}>{procedimientosSugeridos.map(p => <li key={p.id} style={{marginBottom: '6px'}}>{p.nombre} (Pieza #{p.pieza})</li>)}</ul>
              </div>
            </div>
            <button onClick={() => { aceptarSugerencias(); setShowMigracionModal(false); setActiveTab('procedimientos'); }} style={{ marginTop: '24px', padding: '16px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '12px', width: '100%', cursor: 'pointer', fontWeight: 700, fontSize: '16px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>Importar al Plan de Tratamiento</button>
          </div>
        </div>
      )}

      {/* NUEVO MODAL DE CONFIRMACIÓN DE CANCELACIÓN (SALIDA SEGURA) */}
      {showCancelModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ background: 'white', borderRadius: '20px', width: '420px', maxWidth: '90%', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: COLORS.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.error }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: COLORS.text, fontSize: '20px', fontWeight: 800 }}>¿Cancelar consulta?</h2>
              </div>
            </div>
            <p style={{ fontSize: '15px', color: COLORS.textLight, marginBottom: '28px', lineHeight: 1.5, fontWeight: 500 }}>
              Estás a punto de salir. Los cambios no guardados se perderán. ¿Estás seguro de que deseas abandonar esta sesión clínica?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCancelModal(false)} 
                style={{ padding: '12px 20px', background: COLORS.background, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} 
                onMouseOut={e => e.currentTarget.style.background = COLORS.background}
              >
                Volver a la consulta
              </button>
              <button 
                onClick={onExit} 
                style={{ padding: '12px 20px', background: COLORS.error, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}
                onMouseOver={e => e.currentTarget.style.background = '#dc2626'} 
                onMouseOut={e => e.currentTarget.style.background = COLORS.error}
              >
                Sí, Cancelar y Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST CONFIRMACIÓN DE GUARDADO/IMPORTACIÓN */}
      {showConfirmModal && (
        <div className="no-print" style={{ position: 'fixed', top: '24px', right: '24px', background: COLORS.success, color: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.3s ease-out' }}>
          <CheckCircle size={24} /><span style={{ fontSize: '15px', fontWeight: 600 }}>{mensajeConfirmacion}</span>
        </div>
      )}
    </div>
  );
};