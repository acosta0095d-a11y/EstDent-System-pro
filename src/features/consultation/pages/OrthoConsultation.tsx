import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { usePatient } from '../../../core/context/PatientContext';
import { supabase } from '../../../shared/lib/supabase';
import { OrthoOdontogram } from '../components/OrthoOdontogram';
import { 
  Save, ChevronLeft, Plus, Pill, Scissors, FileText, X, AlertCircle, CheckCircle, 
  Activity, ClipboardList, Stethoscope, Printer, Scan, AlertTriangle,
  Bone, Zap, Trash, DollarSign, CheckSquare, Search, BookOpen, User, Hash, ShieldAlert
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURACIÓN, TIPOS Y DICCIONARIOS ORTODÓNTICOS (AZUL PREMIUM)
// ============================================================================

const COLORS = {
  primary: '#0071e3', primaryLight: '#e0f2fe', primaryDark: '#0284c7', // Azul Sistema
  secondary: '#64748b', secondaryLight: '#f8fafc',
  success: '#10b981', successLight: '#d1fae5',
  warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fef2f2',
  info: '#3b82f6', infoLight: '#eff6ff',
  background: '#f8fafc', surface: '#ffffff',
  text: '#0f172a', textLight: '#64748b', border: '#e2e8f0'
};

const getToolColor = (tipo: string) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('falla') || t.includes('despegado')) return { base: COLORS.error, pastel: COLORS.errorLight };
  if (t.includes('arco') || t.includes('alambre')) return { base: COLORS.info, pastel: COLORS.infoLight };
  if (t.includes('cadeneta') || t.includes('elastico')) return { base: COLORS.primaryDark, pastel: COLORS.primaryLight };
  if (t.includes('banda') || t.includes('tubo')) return { base: COLORS.warning, pastel: COLORS.warningLight };
  return { base: COLORS.primary, pastel: COLORS.primaryLight };
};

const ALLERGY_DB = [
  { triggers: ['penicilina', 'amoxicilina', 'ampicilina'], meds: ['amoxicilina', 'ampicilina', 'penicilina', 'amoxidal', 'augmentin'] },
  { triggers: ['aines', 'ibuprofeno', 'aspirina', 'naproxeno', 'diclofenaco'], meds: ['ibuprofeno', 'aspirina', 'naproxeno', 'diclofenaco', 'ketorolaco', 'meloxicam'] },
  { triggers: ['niquel', 'metal'], meds: ['arco de niquel', 'niti'] }
];

const FDI_ADULTOS = Array.from({length: 8}, (_, i) => `1${i+1}`).concat(Array.from({length: 8}, (_, i) => `2${i+1}`), Array.from({length: 8}, (_, i) => `3${i+1}`), Array.from({length: 8}, (_, i) => `4${i+1}`));
const ACCESORIOS_ORTO = ['Arco NiTi', 'Arco Acero', 'Bracket', 'Tubo', 'Banda', 'Cadeneta Abierta', 'Cadeneta Cerrada', 'Ligadura Metálica', 'Elásticos', 'Retenedor'];

const CIE10_ORTODONCIA = [
  { codigo: 'K07.0', nombre: 'Anomalías evidentes del tamaño de los maxilares' },
  { codigo: 'K07.1', nombre: 'Anomalías de la relación maxilobasilar (Clase II / Clase III)' },
  { codigo: 'K07.2', nombre: 'Anomalías de la relación de los arcos dentarios (Maloclusión)' },
  { codigo: 'K07.3', nombre: 'Anomalías de la posición del diente (Apiñamiento, Diastema)' },
  { codigo: 'K07.4', nombre: 'Maloclusión, de tipo no especificado' },
  { codigo: 'K07.5', nombre: 'Anomalías dentofaciales funcionales' },
  { codigo: 'K07.6', nombre: 'Trastornos de la articulación temporomandibular' }
];

interface HallazgoOdontograma { id: string; diente: string; tipo: string; descripcion: string; severidad: string; }
interface Procedimiento { id: string; nombre: string; pieza: string; accesorio: string; observaciones: string; fecha: string; migradoDesdeOdontograma?: boolean; hallazgoOrigen?: string; tipoHallazgo?: string; estado: 'sugerido' | 'presupuestado' | 'aprobado' | 'realizado'; costo: number; }
interface Diagnostico { id: string; codigo: string; nombre: string; tipo: 'principal' | 'secundario' | 'hallazgo'; diente?: string; migradoDesdeOdontograma?: boolean; tipoHallazgo?: string; }
interface Receta { id: string; medicamento: string; dosis: string; frecuencia: string; duracion: string; indicaciones: string; }

interface ConsultaPayload {
  paciente_id: string;
  tipo_consulta: 'GENERAL' | 'ORTODONCIA';
  hallazgos_odontograma: HallazgoOdontograma[];
  estado_odontograma: {
    teethData: Record<string, any>;
    connections: any[];
  };
  detalles_clinicos: {
    anamnesis: {
      motivo: string;
      motivoSeleccionado: string[];
      estadoGeneral: any;
      evaluacionDolor: any;
    };
    examen: any;
    plan_tratamiento: Procedimiento[];
    recetario: Receta[];
  };
  tiempo_sesion: number;
}

interface Props { 
  onExit: () => void; 
  initialData?: any;
  onSave?: (data: ConsultaPayload) => Promise<void>;
}

const formatCOP = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

// ============================================================================
// 2. COMPONENTE PRINCIPAL (ORTODONCIA TRADUCTOR)
// ============================================================================

export const OrthoConsultation = ({ onExit, initialData, onSave }: Props) => {
  const { selectedPatient, setSelectedPatient, patients, setPatients } = usePatient();
  
  const [activeTab, setActiveTab] = useState('anamnesis');
  const [tiempo, setTiempo] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMigracionModal, setShowMigracionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');
  const [previousHigieneOral, setPreviousHigieneOral] = useState<string>('');
  const [showHigieneRojaAlert, setShowHigieneRojaAlert] = useState(false);
  
  // Estados Anamnesis Orto
  const [motivo, setMotivo] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string[]>([]);
  const [estadoGeneral, setEstadoGeneral] = useState({ higieneOral: 'Regular', estadoAparatos: 'Buen estado', alertaMedica: '' });
  const [evaluacionDolor, setEvaluacionDolor] = useState({ escala: 0, molestias: [] as string[], evolucion: '' });
  
  // Estados Examen Orto Especializado
  const [examenOrto, setExamenOrto] = useState({ 
    claseMolarDer: 'No evaluable', claseMolarIzq: 'No evaluable', 
    claseCaninaDer: 'No evaluable', claseCaninaIzq: 'No evaluable', 
    overjet: '', overbite: '', lineaMedia: 'Centrada', observaciones: '' 
  });
  const [busquedaCie10, setBusquedaCie10] = useState('');
  
  // Estados de Listas
  const [hallazgosOdontograma, setHallazgosOdontograma] = useState<HallazgoOdontograma[]>([]);
  const [orthoTeethData, setOrthoTeethData] = useState<Record<string, any>>({});
  const [orthoConnections, setOrthoConnections] = useState<any[]>([]);
  const [diagnosticosManuales, setDiagnosticosManuales] = useState<Diagnostico[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  
  const [nuevoProcedimiento, setNuevoProcedimiento] = useState<Partial<Procedimiento>>({ nombre: '', pieza: '', accesorio: '', observaciones: '', costo: 0, estado: 'aprobado' });
  const [nuevaReceta, setNuevaReceta] = useState({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  const [alertaSeguridadReceta, setAlertaSeguridadReceta] = useState<string | null>(null);

  // VÁLVULAS DE SEGURIDAD
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const lastUpdateRef = useRef("");

  useEffect(() => {
    setShowHigieneRojaAlert(previousHigieneOral === 'Mala' && estadoGeneral.higieneOral === 'Mala');
  }, [previousHigieneOral, estadoGeneral.higieneOral]);

  // CARGAR DATOS PREVIOS
  useEffect(() => {
    if (!isInitialLoadDone && initialData) {
      if (initialData.motivo) setMotivo(initialData.motivo);
      if (initialData.motivoSeleccionado) setMotivoSeleccionado(initialData.motivoSeleccionado);
      if (initialData.estadoGeneral) setEstadoGeneral(initialData.estadoGeneral);
      if (initialData.evaluacionDolor) setEvaluacionDolor(initialData.evaluacionDolor);
      if (initialData.examenOrto) setExamenOrto(initialData.examenOrto);
      if (initialData.diagnosticosManuales) setDiagnosticosManuales(initialData.diagnosticosManuales);
      if (initialData.procedimientos) setProcedimientos(initialData.procedimientos);
      if (initialData.recetas) setRecetas(initialData.recetas);
      if (initialData.hallazgosOdontograma) setHallazgosOdontograma(initialData.hallazgosOdontograma);
      if (initialData.estado_odontograma) {
        setOrthoTeethData(initialData.estado_odontograma.teethData || {});
        setOrthoConnections(initialData.estado_odontograma.connections || []);
      }
      setPreviousHigieneOral(initialData.detalles?.anamnesis?.estadoGeneral?.higieneOral || '');
      setIsInitialLoadDone(true);
    }
  }, [initialData, isInitialLoadDone]);

  // Herencia Inteligente: cargar el último estado si no hay initialData
  useEffect(() => {
    const cargarUltimoEstado = async () => {
      if (!initialData && selectedPatient?.id && !isInitialLoadDone) {
        const { data: ultima, error } = await supabase
          .from('consultas_odontologicas')
          .select('estado_odontograma, detalles')
          .eq('paciente_id', selectedPatient.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.warn('No se pudo cargar última consulta:', error);
          setIsInitialLoadDone(true);
          return;
        }

        if (ultima) {
          setOrthoTeethData(ultima.estado_odontograma?.teethData || {});
          setOrthoConnections(ultima.estado_odontograma?.connections || []);
          setPreviousHigieneOral(ultima.detalles?.anamnesis?.estadoGeneral?.higieneOral || '');
          setMensajeConfirmacion('Cargando base de la cita anterior...');
          setShowConfirmModal(true);
          setTimeout(() => setShowConfirmModal(false), 1800);
        }

        setIsInitialLoadDone(true);
      }
    };

    cargarUltimoEstado();
  }, [selectedPatient?.id, initialData, isInitialLoadDone]);

  // Estilos de panel para transiciones más suaves en navegación de pestañas
  const panelBaseProps = {
    transition: 'opacity 220ms ease, transform 220ms ease, max-height 260ms ease',
    transformOrigin: 'top center',
  };

  const getPanelStyle = (visible: boolean): React.CSSProperties => ({
    ...panelBaseProps,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    maxHeight: visible ? '1200px' : '0',
    overflow: 'hidden',
    pointerEvents: visible ? 'auto' as React.CSSProperties['pointerEvents'] : 'none' as React.CSSProperties['pointerEvents'],
  });

  // ==========================================================================
  // 3. INTELIGENCIA BIDIRECCIONAL (ODONTOGRAMA -> FORMULARIO)
  // ==========================================================================

  const handleOdontogramaSync = useCallback((hallazgos: any[], rawState?: { teethData?: Record<string, any>, connections?: any[] }) => {
    if (!hallazgos || !Array.isArray(hallazgos)) return;

    // Solo actualizamos si los datos cambiaron de verdad
    const currentStr = JSON.stringify(hallazgos);
    if (lastUpdateRef.current !== currentStr) {
      lastUpdateRef.current = currentStr;
      setHallazgosOdontograma(hallazgos);

      if (rawState) {
        setOrthoTeethData(rawState.teethData || {});
        setOrthoConnections(rawState.connections || []);
      }

      // Auto-detección de fallas
      const fallas = hallazgos.filter(h => h.severidad === 'despegado' || h.severidad === 'fracturado');
      if (fallas.length > 0) {
        setEstadoGeneral(prev => ({ ...prev, estadoAparatos: 'Falla mayor' }));
        if (!motivoSeleccionado.includes('caido')) {
          setMotivoSeleccionado(prev => [...prev, 'caido']);
        }
      }
    }
  }, [motivoSeleccionado]);

  // 2. AGRUPACIÓN Y SUGERENCIAS DE COBRO INTELIGENTE
  const procedimientosSugeridos = useMemo(() => {
    const sugerencias: Procedimiento[] = [];
    const COSTO_RECEMENTADO = 50000;
    
    // Agrupar Fallas (Si hay más de 1 recementado, se agrupa el cobro)
    const fallas = hallazgosOdontograma.filter(h => h.id.startsWith('falla-'));
    if (fallas.length === 1) {
      sugerencias.push({
        id: `sug-${fallas[0].id}`, nombre: `Recementado de ${fallas[0].tipo}`, pieza: fallas[0].diente, accesorio: 'Bracket/Tubo', observaciones: `Falla individual detectada en odontograma`,
        fecha: new Date().toLocaleDateString(), estado: 'presupuestado', costo: COSTO_RECEMENTADO, migradoDesdeOdontograma: true, hallazgoOrigen: fallas[0].id, tipoHallazgo: fallas[0].tipo
      });
    } else if (fallas.length > 1) {
      sugerencias.push({
        id: `sug-falla-multiple-${Date.now()}`, nombre: `Recementado Múltiple (${fallas.length} piezas)`, pieza: 'Múltiple', accesorio: 'Varios', observaciones: `Piezas: ${fallas.map(f => f.diente).join(', ')}`,
        fecha: new Date().toLocaleDateString(), estado: 'presupuestado', costo: COSTO_RECEMENTADO * fallas.length, migradoDesdeOdontograma: true, hallazgoOrigen: 'multiple-fallas', tipoHallazgo: 'Falla Múltiple'
      });
    }

    // Cobro automático: añadir recementado por cada hallazgo de emergencia no presente en procedimientos
    hallazgosOdontograma.forEach(h => {
      if (['despegado', 'fracturado'].includes(h.severidad?.toLowerCase())) {
        const existe = procedimientos.some(p => p.hallazgoOrigen === h.id) || sugerencias.some(p => p.hallazgoOrigen === h.id);
        if (!existe) {
          sugerencias.push({
            id: `auto-${h.id}`,
            nombre: `Recementado de ${h.tipo}`,
            pieza: h.diente,
            accesorio: 'Bracket/Tubo',
            observaciones: `Auto-generado por hallazgo ${h.tipo}`,
            fecha: new Date().toLocaleDateString(),
            estado: 'presupuestado',
            costo: COSTO_RECEMENTADO,
            migradoDesdeOdontograma: true,
            hallazgoOrigen: h.id,
            tipoHallazgo: h.tipo
          });
        }
      }
    });

    // Agrupar Conexiones (Arcos y Cadenetas)
    const arcos = hallazgosOdontograma.filter(h => h.tipo?.toLowerCase().includes('arco'));
    arcos.forEach(arco => {
      sugerencias.push({
        id: `sug-${arco.id}`, nombre: `Instalación/Cambio de ${arco.tipo}`, pieza: arco.diente, accesorio: arco.tipo, observaciones: arco.descripcion,
        fecha: new Date().toLocaleDateString(), estado: 'realizado', costo: 0, migradoDesdeOdontograma: true, hallazgoOrigen: arco.id, tipoHallazgo: arco.tipo
      });
    });

    const cadenetas = hallazgosOdontograma.filter(h => h.tipo?.toLowerCase().includes('cadeneta'));
    cadenetas.forEach(cad => {
      sugerencias.push({
        id: `sug-${cad.id}`, nombre: `Activación con ${cad.tipo}`, pieza: cad.diente, accesorio: cad.tipo, observaciones: cad.descripcion,
        fecha: new Date().toLocaleDateString(), estado: 'realizado', costo: 0, migradoDesdeOdontograma: true, hallazgoOrigen: cad.id, tipoHallazgo: cad.tipo
      });
    });

    return sugerencias.filter(sug => !procedimientos.some(p => p.hallazgoOrigen === sug.hallazgoOrigen));
  }, [hallazgosOdontograma, procedimientos]);

  // Limpieza de procedimientos si se borran en el odontograma
  useEffect(() => {
    if (hallazgosOdontograma.length >= 0) {
      setProcedimientos(prev => prev.filter(proc => {
        if (!proc.migradoDesdeOdontograma) return true; 
        if (proc.estado === 'realizado' || proc.estado === 'aprobado') return true; 
        if (proc.hallazgoOrigen === 'multiple-fallas') return hallazgosOdontograma.filter(h => h.id.startsWith('falla-')).length > 1;
        return hallazgosOdontograma.some(h => h.id === proc.hallazgoOrigen);
      }));
    }
  }, [hallazgosOdontograma]);


  // ==========================================================================
  // 4. OTROS MEMOS Y HANDLERS
  // ==========================================================================

  const resultadosCie10 = useMemo(() => {
    if (!busquedaCie10.trim()) return [];
    return CIE10_ORTODONCIA.filter(c => c.codigo.toLowerCase().includes(busquedaCie10.toLowerCase()) || c.nombre.toLowerCase().includes(busquedaCie10.toLowerCase()));
  }, [busquedaCie10]);

  const resumenFinanciero = useMemo(() => {
    return procedimientos.reduce((totales, proc) => {
      const costoValido = Math.max(0, Number(proc.costo) || 0);
      if (proc.estado === 'presupuestado' || proc.estado === 'sugerido' || proc.estado === 'aprobado') totales.presupuesto += costoValido;
      else if (proc.estado === 'realizado') totales.realizadoHoy += costoValido;
      return totales;
    }, { presupuesto: 0, realizadoHoy: 0 });
  }, [procedimientos]);

  useEffect(() => { const timer = setInterval(() => setTiempo(prev => prev + 1), 1000); return () => clearInterval(timer); }, []);
  const formatTiempo = () => { const h = Math.floor(tiempo / 3600); const m = Math.floor((tiempo % 3600) / 60); const s = tiempo % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  const aceptarSugerencias = useCallback(() => {
    if (procedimientosSugeridos.length === 0) return;
    setProcedimientos(prev => [...prev, ...procedimientosSugeridos]);
    setMensajeConfirmacion(`Se agruparon ${procedimientosSugeridos.length} acciones ortodónticas al plan.`);
    setShowConfirmModal(true); setTimeout(() => setShowConfirmModal(false), 3000);
  }, [procedimientosSugeridos]);

  const actualizarProcedimiento = (id: string, campo: keyof Procedimiento, valor: any) => {
    if (campo === 'costo' && Number(valor) < 0) valor = 0;
    setProcedimientos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => { array.includes(item) ? setArray(array.filter(i => i !== item)) : setArray([...array, item]); };

  const verificarSeguridadReceta = (medicamentoNuevo: string, dosisPropuesta: string): boolean => {
    setAlertaSeguridadReceta(null);
    if (!medicamentoNuevo.trim() || !estadoGeneral.alertaMedica) return true;
    const alertas = estadoGeneral.alertaMedica.toLowerCase();
    const med = medicamentoNuevo.toLowerCase();
    
    for (const familia of ALLERGY_DB) {
      const tieneAlergiaRelacionada = familia.triggers.some(t => alertas.includes(t));
      const esMedicamentoPeligroso = familia.meds.some(m => med.includes(m));
      if (tieneAlergiaRelacionada && esMedicamentoPeligroso) {
        setAlertaSeguridadReceta(`ALERTA CRUZADA: El paciente reporta: "${estadoGeneral.alertaMedica}". Recetar ${medicamentoNuevo} es de alto riesgo.`);
        return false;
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

  const handleGuardar = async () => {
    if (isSaving) return;
    if (!selectedPatient?.id) {
      alert('Error: No hay un paciente seleccionado.');
      return;
    }

    setIsSaving(true);

    const payload: ConsultaPayload = {
      paciente_id: selectedPatient.id,
      tipo_consulta: 'ORTODONCIA',
      hallazgos_odontograma: hallazgosOdontograma,
      estado_odontograma: { teethData: orthoTeethData, connections: orthoConnections },
      detalles_clinicos: {
        anamnesis: {
          motivo,
          motivoSeleccionado,
          estadoGeneral,
          evaluacionDolor
        },
        examen: examenOrto,
        plan_tratamiento: procedimientos,
        recetario: recetas
      },
      tiempo_sesion: tiempo
    };

    try {
      let response: { error?: any } | null = null;

      if (onSave) {
        await onSave(payload);
      } else {
        const { error } = await supabase.from('consultas_odontologicas').insert([payload]);
        response = { error };
      }

      if (response?.error) {
        throw response.error;
      }

      setMensajeConfirmacion('Evolución guardada correctamente.');
      setShowConfirmModal(true);

      setIsSaved(true);
      setTimeout(() => { setShowConfirmModal(false); onExit(); }, 1500);
    } catch (error) {
      setIsSaved(false);
      const err = error as any;
      alert('Error crítico al guardar. Revise la consola. ' + (err?.message || JSON.stringify(err) || ''));
      console.error('handleGuardar error', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedPatient) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.background }}>Cargando paciente...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.background, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(0, 164, 228, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(0, 164, 228, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 164, 228, 0); } }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        
        .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .grid-2-col { grid-template-columns: 1fr; } }
        
        .card { background: white; border-radius: 16px; padding: 24px; border: 1px solid ${COLORS.border}; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03), 0 4px 6px -2px rgba(0,0,0,0.02); transition: box-shadow 0.3s ease; }
        .card:hover { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.02); }
        .card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: ${COLORS.text}; margin: 0 0 20px 0; border-bottom: 2px solid ${COLORS.primaryLight}; padding-bottom: 10px; display: inline-flex; }
        
        .oc-form-group { margin-bottom: 16px; }
        .oc-form-group label { display: block; font-size: 12px; font-weight: 700; color: ${COLORS.textLight}; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em; }
        .oc-input, select { width: 100%; padding: 12px 14px; border: 1px solid ${COLORS.border}; border-radius: 10px; font-size: 14px; font-family: inherit; transition: all 0.2s; background: ${COLORS.background}; color: ${COLORS.text}; box-sizing: border-box; }
        .oc-input:focus, select:focus { outline: none; border-color: ${COLORS.primary}; background: white; box-shadow: 0 0 0 4px ${COLORS.primaryLight}; transform: translateY(-1px); }
        
        .tab-btn { padding: 16px 20px; background: transparent; border: none; border-bottom: 3px solid transparent; font-size: 13px; font-weight: 700; color: ${COLORS.textLight}; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.05em; position: relative; }
        .tab-btn:hover { color: ${COLORS.primary}; background: linear-gradient(to top, ${COLORS.primaryLight}40, transparent); }
        .tab-btn.active { color: ${COLORS.primaryDark}; border-bottom-color: ${COLORS.primary}; background: linear-gradient(to top, ${COLORS.primaryLight}80, transparent); }
        
        .oc-btn-primary { display: flex; align-items: center; gap: 6px; padding: 12px 20px; background: ${COLORS.primary}; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0, 164, 228, 0.2); }
        .oc-btn-primary:hover { background: ${COLORS.primaryDark}; transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0, 164, 228, 0.3); }
        
        .oc-btn-badge { padding: 6px 14px; background: white; border: 1px solid ${COLORS.border}; border-radius: 20px; font-size: 12px; font-weight: 600; color: ${COLORS.text}; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .oc-btn-badge:hover { border-color: ${COLORS.primary}; color: ${COLORS.primaryDark}; background: ${COLORS.primaryLight}; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0, 164, 228, 0.1); }      `}</style>

      {/* HEADER PREMIUM ORTODONCIA */}
      <header className="no-print" style={{ background: '#ffffff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, position: 'sticky', top: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          
          <button 
            onClick={() => setShowCancelModal(true)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '12px', color: COLORS.textLight, cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} 
            onMouseOver={e => { e.currentTarget.style.color = COLORS.error; e.currentTarget.style.borderColor = COLORS.errorLight; e.currentTarget.style.background = COLORS.errorLight; }} 
            onMouseOut={e => { e.currentTarget.style.color = COLORS.textLight; e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = 'white'; }}
          >
            <ChevronLeft size={16} /> Cancelar Sesión
          </button>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '8px 20px 8px 8px', background: COLORS.background, borderRadius: '40px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '18px', border: `3px solid white`, boxShadow: `0 4px 10px rgba(0, 164, 228, 0.2)` }}>
              {selectedPatient.nombre?.[0]}{selectedPatient.apellidos?.[0]}
            </div>
            <div>
              <div style={{ color: COLORS.text, fontWeight: 800, fontSize: '16px', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {selectedPatient.nombre} {selectedPatient.apellidos} 
                <span style={{ fontSize: '10px', background: COLORS.primaryLight, color: COLORS.primaryDark, padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>Ortodoncia Módulo</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}><Hash size={12} /> {selectedPatient.cc || 'N/A'}</span>
                <span style={{ color: COLORS.border }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}><User size={12} /> {selectedPatient.edad} años</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: COLORS.secondaryLight, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.primary, animation: 'pulseDot 1.5s infinite' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '1px' }}>Cronómetro</span>
              <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: COLORS.primaryDark, lineHeight: 1 }}>{formatTiempo()}</span>
            </div>
          </div>
          
          <button className="oc-btn-primary" onClick={handleGuardar} style={{ background: isSaved ? COLORS.success : COLORS.primary, padding: '14px 28px', borderRadius: '12px', fontSize: '14px' }}>
            {isSaved ? <CheckCircle size={18} /> : <Save size={18} />} {isSaved ? 'Guardado Exitoso' : 'Guardar Evolución'}
          </button>
        </div>
      </header>

      {/* ALERTA DE HIGIENE ROJA: 2 consultas seguidas */}
      {showHigieneRojaAlert && (
        <div style={{ background: '#b91c1c', color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontWeight: 700, borderBottom: '3px solid #7f1d1d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={22} />
            ALERTA CRÍTICA: Higiene deficiente confirmé en dos consultas seguidas.
          </div>
          <button onClick={() => setRecetas([...recetas, { id: `higiene-${Date.now()}`, medicamento: 'Refuerzo de Higiene', dosis: 'Diaria', frecuencia: '1 vez al día', duracion: '14 días', indicaciones: 'Cepillar y usar seda dental específico para ortodoncia' }])} style={{ border: '1px solid white', background: 'transparent', color: 'white', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}>Añadir receta rápida</button>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN */}
      <div className="no-print" style={{ background: 'white', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', padding: '0 32px', overflowX: 'auto', gap: '4px' }}>
        <button className={`tab-btn ${activeTab === 'anamnesis' ? 'active' : ''}`} onClick={() => setActiveTab('anamnesis')}><ClipboardList size={16} /> Anamnesis Orto</button>
        <button className={`tab-btn ${activeTab === 'odontograma' ? 'active' : ''}`} onClick={() => setActiveTab('odontograma')}><Scan size={16} /> Mapeo de Nodos (Aparatología) {hallazgosOdontograma.length > 0 && <span style={{ marginLeft: '5px', background: COLORS.primary, color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '10px' }}>{hallazgosOdontograma.length}</span>}</button>
        <button className={`tab-btn ${activeTab === 'examen' ? 'active' : ''}`} onClick={() => setActiveTab('examen')}><Stethoscope size={16} /> Oclusión y CIE-10</button>
        <button className={`tab-btn ${activeTab === 'procedimientos' ? 'active' : ''}`} onClick={() => setActiveTab('procedimientos')}><Scissors size={16} /> Cotizador & Activación {procedimientosSugeridos.length > 0 && <span style={{ marginLeft: '5px', background: COLORS.warning, color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '10px' }}>{procedimientosSugeridos.length}</span>}</button>
        <button className={`tab-btn ${activeTab === 'recetas' ? 'active' : ''}`} onClick={() => setActiveTab('recetas')}><Pill size={16} /> Recetas y Recomendaciones</button>
      </div>

      {/* ÁREA DE TRABAJO */}
      <div className="no-print" style={{ flex: 1, overflow: 'auto', padding: '40px 30px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* TAB 1: ANAMNESIS ORTO */}
          <div style={getPanelStyle(activeTab === 'anamnesis')}>
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card">
                <h3 className="card-title" style={{ color: COLORS.primaryDark }}><Activity size={20} /> Condición General en Consulta Mensual</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                  <div className="oc-form-group">
                    <label>Higiene Oral con Aparatología</label>
                    <select className="oc-input" value={estadoGeneral.higieneOral} onChange={e => setEstadoGeneral({...estadoGeneral, higieneOral: e.target.value})}>
                      <option value="Buena">Buena (Sin placa, encías sanas)</option>
                      <option value="Regular">Regular (Placa localizada alrededor de brackets)</option>
                      <option value="Mala">Mala (Gingivitis hipertrófica evidente)</option>
                    </select>
                  </div>
                  <div className="oc-form-group">
                    <label style={{ color: estadoGeneral.estadoAparatos === 'Falla mayor' ? COLORS.error : COLORS.textLight }}>Estado general de los aparatos</label>
                    <select 
                      className="oc-input" 
                      value={estadoGeneral.estadoAparatos} 
                      onChange={e => setEstadoGeneral({...estadoGeneral, estadoAparatos: e.target.value})}
                      style={{ 
                        borderColor: estadoGeneral.estadoAparatos === 'Falla mayor' ? COLORS.error : COLORS.border,
                        background: estadoGeneral.estadoAparatos === 'Falla mayor' ? COLORS.errorLight : COLORS.background,
                        color: estadoGeneral.estadoAparatos === 'Falla mayor' ? COLORS.error : COLORS.text,
                        fontWeight: estadoGeneral.estadoAparatos === 'Falla mayor' ? 700 : 400
                      }}
                    >
                      <option value="Buen estado">Intactos / Buen estado</option>
                      <option value="Falla menor">Falla menor (Módulo suelto)</option>
                      <option value="Falla mayor">Falla mayor (Brackets despegados, arco roto)</option>
                    </select>
                    {estadoGeneral.estadoAparatos === 'Falla mayor' && <div style={{ fontSize: '11px', color: COLORS.error, marginTop: '4px', fontWeight: 600 }}>* Detectado automáticamente vía Odontograma</div>}
                  </div>
                  <div className="oc-form-group">
                    <label style={{ color: estadoGeneral.alertaMedica ? COLORS.error : COLORS.textLight }}>Alergias (Ej. Níquel)</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" className="oc-input" placeholder="Alergia a metales, látex..." 
                        value={estadoGeneral.alertaMedica} onChange={e => setEstadoGeneral({...estadoGeneral, alertaMedica: e.target.value})} 
                        style={{ borderColor: estadoGeneral.alertaMedica ? COLORS.error : COLORS.border, background: estadoGeneral.alertaMedica ? COLORS.errorLight : COLORS.background, paddingLeft: estadoGeneral.alertaMedica ? '35px' : '14px' }} 
                      />
                      {estadoGeneral.alertaMedica && <AlertTriangle size={18} color={COLORS.error} style={{ position: 'absolute', left: '12px', top: '12px' }} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-2-col">
                <div className="card">
                  <h3 className="card-title"><ClipboardList size={18} /> Motivo de Consulta</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {[ { id: 'control', label: 'Control Mensual', icon: CheckCircle }, { id: 'caido', label: 'Bracket / Tubo Caído', icon: AlertTriangle }, { id: 'alambre', label: 'Alambre Pinchando', icon: Zap }, { id: 'dolor', label: 'Dolor Severo', icon: Activity }, { id: 'retenedores', label: 'Retenedores', icon: Bone } ].map(btn => {
                      const isSelected = motivoSeleccionado.includes(btn.id); const Icon = btn.icon;
                      return ( <button key={btn.id} onClick={() => toggleArrayItem(motivoSeleccionado, setMotivoSeleccionado, btn.id)} style={{ padding: '8px 14px', background: isSelected ? COLORS.primary : COLORS.background, color: isSelected ? 'white' : COLORS.text, border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}> <Icon size={14} /> {btn.label} </button> )
                    })}
                  </div>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}><label>Reporte del Paciente (Evolución)</label><textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. El paciente refiere dolor al masticar por el lado derecho..." className="oc-input" /></div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ color: evaluacionDolor.escala > 6 ? COLORS.error : COLORS.text }}><Activity size={18} /> Análisis de Molestias</h3>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', margin: 0 }}>Intensidad de Dolor Ortodóntico (0-10)</label></div>
                    <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                      {[0,1,2,3,4,5,6,7,8,9,10].map(num => {
                        let bgColor = COLORS.border; let isSelected = evaluacionDolor.escala === num;
                        if (isSelected) { if (num === 0) bgColor = COLORS.success; else if (num <= 3) bgColor = '#84cc16'; else if (num <= 6) bgColor = '#f59e0b'; else if (num <= 8) bgColor = '#ea580c'; else bgColor = '#dc2626'; }
                        return ( <button key={num} onClick={() => setEvaluacionDolor({...evaluacionDolor, escala: num})} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: '8px', background: isSelected ? bgColor : COLORS.background, color: isSelected ? 'white' : COLORS.textLight, fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>{num}</button> )
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Tipo de Molestia</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['Roce en mejilla', 'Úlcera/Afta', 'Dolor al masticar', 'Dolor constante', 'Sensibilidad dental'].map(tipo => ( <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}><input type="checkbox" checked={evaluacionDolor.molestias.includes(tipo)} onChange={() => toggleArrayItem(evaluacionDolor.molestias, (arr) => setEvaluacionDolor({...evaluacionDolor, molestias: arr}), tipo)} style={{ accentColor: COLORS.primary, width: '16px', height: '16px' }} /> {tipo}</label> ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 2: ODONTOGRAMA DE MASAS */}
          <div style={getPanelStyle(activeTab === 'odontograma')}>
            <div className="fade-in">
              <div style={{ background: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, marginBottom: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <div style={{ background: COLORS.primary, padding: '15px 24px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><Scan size={20} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Arquitectura y Mapeo Ortodóntico</h3></div>
                <div style={{ padding: '24px' }}>
                  <OrthoOdontogram onUpdate={handleOdontogramaSync} value={{ teethData: orthoTeethData, connections: orthoConnections }} />
                </div>
              </div>
              {hallazgosOdontograma.length > 0 && (
                <button onClick={() => setShowMigracionModal(true)} style={{ width: '100%', padding: '14px', background: COLORS.primaryLight, color: COLORS.primaryDark, border: `1px solid ${COLORS.primary}`, borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <AlertTriangle size={18} /> Agrupar {hallazgosOdontograma.length} registros y enviar a Cotización
                </button>
              )}
            </div>
          </div>

          {/* TAB 3: EXAMEN ORTODÓNTICO */}
          <div style={getPanelStyle(activeTab === 'examen')}>
            <div className="fade-in grid-2-col">
              <div className="card">
                <h3 className="card-title"><Stethoscope size={18} /> Evolución de la Oclusión</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
                  <div className="oc-form-group"><label>Clase Molar Derecha</label><select className="oc-input" value={examenOrto.claseMolarDer} onChange={e => setExamenOrto({...examenOrto, claseMolarDer: e.target.value})}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                  <div className="oc-form-group"><label>Clase Molar Izquierda</label><select className="oc-input" value={examenOrto.claseMolarIzq} onChange={e => setExamenOrto({...examenOrto, claseMolarIzq: e.target.value})}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
                  <div className="oc-form-group"><label>Clase Canina Derecha</label><select className="oc-input" value={examenOrto.claseCaninaDer} onChange={e => setExamenOrto({...examenOrto, claseCaninaDer: e.target.value})}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                  <div className="oc-form-group"><label>Clase Canina Izquierda</label><select className="oc-input" value={examenOrto.claseCaninaIzq} onChange={e => setExamenOrto({...examenOrto, claseCaninaIzq: e.target.value})}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="oc-form-group"><label>Overjet (mm)</label><input type="text" className="oc-input" placeholder="Ej. 3mm" value={examenOrto.overjet} onChange={e => setExamenOrto({...examenOrto, overjet: e.target.value})} /></div>
                  <div className="oc-form-group"><label>Overbite (%)</label><input type="text" className="oc-input" placeholder="Ej. 20%" value={examenOrto.overbite} onChange={e => setExamenOrto({...examenOrto, overbite: e.target.value})} /></div>
                </div>
                <div className="oc-form-group"><label>Línea Media Dental</label><select className="oc-input" value={examenOrto.lineaMedia} onChange={e => setExamenOrto({...examenOrto, lineaMedia: e.target.value})}><option value="Centrada">Centradas y Coincidentes</option><option value="Desviada Derecha">Desviada a la Derecha</option><option value="Desviada Izquierda">Desviada a la Izquierda</option></select></div>
                <div className="oc-form-group" style={{ marginBottom: 0 }}><label>Observaciones de Progreso</label><textarea rows={2} value={examenOrto.observaciones} onChange={e => setExamenOrto({...examenOrto, observaciones: e.target.value})} placeholder="Ej. Buen cierre de espacios en sector anterior..." className="oc-input" /></div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="card-title"><BookOpen size={18} /> Diagnóstico CIE-10 Ortodoncia</h3>
                <div style={{ marginBottom: '20px', background: COLORS.background, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Agregar Diagnóstico Manual</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color={COLORS.textLight} style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input type="text" className="oc-input" placeholder="Buscar código o anomalía..." style={{ paddingLeft: '40px' }} value={busquedaCie10} onChange={(e) => setBusquedaCie10(e.target.value)} />
                    {resultadosCie10.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '12px', marginTop: '8px', zIndex: 10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosCie10.map(cie => (
                          <div key={cie.codigo} onClick={() => { setDiagnosticosManuales([...diagnosticosManuales, { id: `diag-man-${Date.now()}`, codigo: cie.codigo, nombre: cie.nombre, tipo: 'principal' }]); setBusquedaCie10(''); }} style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }} onMouseOver={e => e.currentTarget.style.background = COLORS.background} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                            <span style={{ fontWeight: 700, color: COLORS.primaryDark }}>{cie.codigo}</span><span style={{ color: COLORS.text, textAlign: 'right' }}>{cie.nombre}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Lista de Problemas de la Sesión</label>
                  {diagnosticosManuales.map(d => (
                    <div key={d.id} style={{ padding: '14px', background: 'white', borderRadius: '10px', marginBottom: '10px', fontSize: '13px', border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${COLORS.primary}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div><span style={{ fontWeight: 800, color: COLORS.text }}>{d.codigo}</span> <span style={{ color: COLORS.textLight }}>- {d.nombre}</span></div>
                        <button onClick={() => setDiagnosticosManuales(diagnosticosManuales.filter(item => item.id !== d.id))} style={{ background: COLORS.errorLight, border: 'none', color: COLORS.error, cursor: 'pointer', padding: '6px', borderRadius: '6px' }}><Trash size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {diagnosticosManuales.length === 0 && ( <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textLight, border: `2px dashed ${COLORS.border}`, borderRadius: '12px' }}><Activity size={32} style={{ opacity: 0.3, marginBottom: '12px' }}/><div style={{ fontSize: '14px', fontWeight: 500 }}>Sin diagnósticos registrados.</div></div> )}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 4: PROCEDIMIENTOS Y PRESUPUESTO ORTO */}
          <div style={getPanelStyle(activeTab === 'procedimientos')}>
            <div className="fade-in card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}><Scissors size={20} /> Cotización y Activaciones</h3>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, background: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: COLORS.infoLight, padding: '12px', borderRadius: '12px' }}><FileText size={20} color={COLORS.info} /></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presupuesto Extra</div><div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.text }}>{formatCOP(resumenFinanciero.presupuesto)}</div></div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '12px' }}><CheckSquare size={20} color="#166534" /></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realizado Hoy (Mensualidad/Cobro)</div><div style={{ fontSize: '22px', fontWeight: 900, color: '#166534' }}>{formatCOP(resumenFinanciero.realizadoHoy)}</div></div>
                </div>
              </div>

              {procedimientosSugeridos.length > 0 && (
                <div style={{ background: COLORS.primaryLight, border: `1px solid ${COLORS.primary}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.primaryDark, fontWeight: 700, fontSize: '14px' }}>
                    <AlertTriangle size={20} /> Odontograma detectó {procedimientosSugeridos.length} movimientos facturables (Agrupados).
                  </div>
                  <button onClick={aceptarSugerencias} style={{ padding: '8px 16px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 4px 6px ${COLORS.primary}40` }}><Plus size={16} /> Importar al Plan</button>
                </div>
              )}

              {/* INPUTS DE PROCEDIMIENTOS ORTO */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr 1fr auto', gap: '12px', background: COLORS.background, padding: '20px', borderRadius: '16px', marginBottom: '24px', border: `1px solid ${COLORS.border}`, alignItems: 'end' }}>
                <div className="oc-form-group" style={{ marginBottom: 0 }}><label>Acción Clínica</label><input className="oc-input" type="text" placeholder="Ej. Mensualidad..." value={nuevoProcedimiento.nombre} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, nombre: e.target.value})} /></div>
                
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Ubicación</label>
                  <select className="oc-input" value={nuevoProcedimiento.pieza} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, pieza: e.target.value})}>
                    <option value="">General / Ambos Arcos</option>
                    <option value="Arco Superior">Arco Superior Completo</option>
                    <option value="Arco Inferior">Arco Inferior Completo</option>
                    <optgroup label="Diente Específico">
                      {FDI_ADULTOS.map(p => <option key={`ad-${p}`} value={p}>Pieza {p}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Accesorio / Insumo</label>
                  <select className="oc-input" value={nuevoProcedimiento.accesorio} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, accesorio: e.target.value})}>
                    <option value="">N/A</option>
                    {ACCESORIOS_ORTO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="oc-form-group" style={{ marginBottom: 0 }}><label>Observaciones/Calibre</label><input className="oc-input" type="text" placeholder="Ej. NiTi 0.14" value={nuevoProcedimiento.observaciones} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, observaciones: e.target.value})} /></div>
                
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Estado</label>
                  <select className="oc-input" value={nuevoProcedimiento.estado} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, estado: e.target.value as any})}>
                    <option value="sugerido">Sugerido</option><option value="presupuestado">Presupuestado</option><option value="aprobado">Aprobado</option><option value="realizado">Realizado Hoy</option>
                  </select>
                </div>
                
                <div className="oc-form-group" style={{ marginBottom: 0 }}><label>Costo ($)</label><input className="oc-input" type="number" min="0" placeholder="0" value={nuevoProcedimiento.costo || ''} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, costo: Math.max(0, Number(e.target.value))})} /></div>
                
                <button className="oc-btn-primary" style={{ height: '44px', padding: '0 24px' }} onClick={() => {
                  if(nuevoProcedimiento.nombre && nuevoProcedimiento.nombre.trim() !== '') {
                    setProcedimientos([{ ...nuevoProcedimiento, id: `proc-man-${Date.now()}`, fecha: new Date().toLocaleDateString() } as Procedimiento, ...procedimientos]);
                    setNuevoProcedimiento({ nombre: '', pieza: '', accesorio: '', observaciones: '', costo: 0, estado: 'aprobado' });
                  }
                }}><Plus size={20} /> Añadir</button>
              </div>

              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: COLORS.background, color: COLORS.textLight, textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
                      <th style={{ padding: '16px' }}>Acción Clínica</th><th style={{ padding: '16px' }}>Ubicación</th><th style={{ padding: '16px' }}>Estado</th><th style={{ padding: '16px' }}>Costo</th><th style={{ padding: '16px', textAlign: 'right' }}>Eliminar</th>
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
                            {p.accesorio && <div style={{ fontSize: '11px', color: COLORS.primaryDark, marginTop: '6px', fontWeight: 700 }}>Insumo: {p.accesorio}</div>}
                            {p.observaciones && <div style={{ fontSize: '12px', color: COLORS.textLight, marginTop: '4px' }}>{p.observaciones}</div>}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ color: COLORS.text, fontSize: '13px', fontWeight: 600 }}>{p.pieza || 'General'}</span>
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
                            <button onClick={() => setProcedimientos(procedimientos.filter(item => item.id !== p.id))} style={{ background: COLORS.errorLight, border: 'none', color: COLORS.error, cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}><Trash size={16} /></button>
                          </td>
                        </tr>
                      )
                    })}
                    {procedimientos.length === 0 && ( <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: COLORS.textLight }}><div style={{ fontSize: '14px', fontWeight: 500 }}>El plan de tratamiento ortodóntico está vacío.</div></td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TAB 5: RECETAS */}
          <div style={getPanelStyle(activeTab === 'recetas')}>
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
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: COLORS.textLight }}>Vademécum Ortodoncia</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px 0' }}>
                    <button className="oc-btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Cera Ortodóntica', dosis: '1 barra', frecuencia: 'Según necesidad', duracion: 'Continuo', indicaciones: 'Aplicar bolita en bracket que causa roce' }); setAlertaSeguridadReceta(null); }}>Cera Orto</button>
                    <button className="oc-btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Ibuprofeno 400mg', dosis: '1 tableta', frecuencia: 'Cada 8h', duracion: '3 días', indicaciones: 'Para dolor post-activación' }); verificarSeguridadReceta('Ibuprofeno 400mg', '1 tableta'); }}>Ibuprofeno</button>
                    <button className="oc-btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Enjuague con Clorhexidina', dosis: '15ml', frecuencia: 'Cada 12h', duracion: '7 días', indicaciones: 'Enjuagar por 1 minuto, no ingerir agua después' }); setAlertaSeguridadReceta(null); }}>Clorhexidina</button>
                  </div>
                </div>
                
                <div className="oc-form-group"><input type="text" className="oc-input" placeholder="Medicamento / Insumo" value={nuevaReceta.medicamento} onChange={e => { setNuevaReceta({...nuevaReceta, medicamento: e.target.value}); setAlertaSeguridadReceta(null); }} /></div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <input type="text" className="oc-input" placeholder="Dosis" value={nuevaReceta.dosis} onChange={e => { setNuevaReceta({...nuevaReceta, dosis: e.target.value}); setAlertaSeguridadReceta(null); }} />
                  <input type="text" className="oc-input" placeholder="Frecuencia" value={nuevaReceta.frecuencia} onChange={e => setNuevaReceta({...nuevaReceta, frecuencia: e.target.value})} />
                  <input type="text" className="oc-input" placeholder="Duración" value={nuevaReceta.duracion} onChange={e => setNuevaReceta({...nuevaReceta, duracion: e.target.value})} />
                </div>
                
                <div className="oc-form-group"><textarea rows={2} className="oc-input" placeholder="Indicaciones adicionales" value={nuevaReceta.indicaciones} onChange={e => setNuevaReceta({...nuevaReceta, indicaciones: e.target.value})} /></div>
                
                <button className="oc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={handleAgregarReceta}>
                  <Plus size={18} /> Agregar a la Receta
                </button>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}><Printer size={18} /> Receta Actual</h3>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '24px', minHeight: '200px', border: `1px solid ${COLORS.primaryLight}` }}>
                  {recetas.map((r, i) => (
                    <div key={r.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i !== recetas.length-1 ? `1px dashed ${COLORS.primaryLight}` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '15px', color: COLORS.primaryDark, fontWeight: 800 }}>{r.medicamento}</strong>
                        <button onClick={() => setRecetas(recetas.filter(item => item.id !== r.id))} style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer' }}><X size={16} /></button>
                      </div>
                      <div style={{ fontSize: '14px', color: COLORS.primary, marginTop: '6px' }}>Tomar/Usar <b>{r.dosis}</b> {r.frecuencia} durante <b>{r.duracion}</b>.</div>
                      {r.indicaciones && <div style={{ fontSize: '13px', color: COLORS.textLight, marginTop: '6px', fontStyle: 'italic', fontWeight: 500 }}>* {r.indicaciones}</div>}
                    </div>
                  ))}
                  {recetas.length === 0 && <div style={{ textAlign: 'center', color: COLORS.primary, marginTop: '50px', fontSize: '14px', fontWeight: 500 }}>No hay medicamentos ni insumos recetados.</div>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL MIGRACIÓN ODONTOGRAMA ORTO */}
      {showMigracionModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="fade-in" style={{ background: 'white', borderRadius: '20px', width: '650px', maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><h2 style={{ margin: 0, color: COLORS.text, fontSize: '20px', fontWeight: 800 }}>Mapeo Agrupado Inteligente</h2><button onClick={() => setShowMigracionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textLight }}><X size={24} /></button></div>
            <p style={{ fontSize: '15px', color: COLORS.textLight, marginBottom: '24px' }}>El sistema agrupó las acciones masivas del odontograma para facilitar el cobro y seguimiento:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              
              {procedimientosSugeridos.map(s => {
                const isError = s.hallazgoOrigen?.includes('falla');
                return (
                  <div key={s.id} style={{ background: isError ? COLORS.errorLight : COLORS.infoLight, padding: '16px 20px', borderRadius: '12px', border: `1px solid ${isError ? COLORS.error : COLORS.info}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', margin: '0 0 4px 0', color: isError ? COLORS.error : COLORS.primaryDark, fontWeight: 800 }}>{s.nombre}</h3>
                      <div style={{ fontSize: '13px', color: COLORS.text, fontWeight: 500 }}>Piezas / Ubicación: <strong>{s.pieza}</strong></div>
                    </div>
                  </div>
                )
              })}

            </div>
            <button onClick={() => { aceptarSugerencias(); setShowMigracionModal(false); setActiveTab('procedimientos'); }} style={{ marginTop: '24px', padding: '16px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '12px', width: '100%', cursor: 'pointer', fontWeight: 700, fontSize: '16px', transition: 'all 0.2s', boxShadow: `0 4px 6px ${COLORS.primary}40` }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>Añadir acciones a la Cotización</button>
          </div>
        </div>
      )}

      {/* MODAL DE CANCELACIÓN */}
      {showCancelModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ background: 'white', borderRadius: '20px', width: '420px', maxWidth: '90%', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: COLORS.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.error }}>
                <AlertTriangle size={24} />
              </div>
              <div><h2 style={{ margin: 0, color: COLORS.text, fontSize: '20px', fontWeight: 800 }}>¿Cancelar consulta?</h2></div>
            </div>
            <p style={{ fontSize: '15px', color: COLORS.textLight, marginBottom: '28px', lineHeight: 1.5, fontWeight: 500 }}>Estás a punto de salir. Los cambios no guardados se perderán. ¿Estás seguro de que deseas abandonar esta sesión clínica?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ padding: '12px 20px', background: COLORS.background, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s' }}>Volver a la consulta</button>
              <button onClick={onExit} style={{ padding: '12px 20px', background: COLORS.error, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}>Sí, Cancelar y Salir</button>
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



