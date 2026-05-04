import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../core/context/PatientContext';
import { GeneralOdontogram } from '../components/GeneralOdontogram';
import { useToast, ToastContainer, ConfirmDialog } from '../../../shared/components/Toast';
// 👇 IMPORTACIÓN DE LA BASE DE DATOS 👇
import { supabase } from '../../../shared/lib/supabase';
import { formatPatientSerial } from '../../patients/pages/patientUtils';
import {
  attachConsultationCodeToDetails,
  buildConsultationCode,
  omitConsultationCodeColumn,
  shouldRetryWithoutConsultationCodeColumn,
} from '../../../shared/lib/consultationUtils';
import {
  buildProcedureStableKey,
  deriveMasterPlan,
  generateAutoNote,
  summarizeClinicalHistory,
} from '../../../shared/lib/clinicalWorkflow';
import { formatPatientRh } from '../../../shared/lib/patientRhUtils';
import { 
  Clock, Save, ChevronLeft, Plus, Pill, Microscope, 
  Scissors, FileText, X, AlertCircle, CheckCircle, 
  Activity, ClipboardList, Stethoscope, FileSignature, 
  Printer, Scan, Heart, Eye, Info, AlertTriangle,
  Bone, Zap, Trash, DollarSign, Search, BookOpen,
  User, Hash, Calendar, ShieldCheck, ShieldAlert, TrendingUp, PackageOpen,
  Lock, Download, MessageCircle
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURACIÓN, TIPOS Y DICCIONARIOS CLÍNICOS
// ============================================================================

const COLORS = {
  primary: '#29b2e8', primaryLight: '#e0f2fe', primaryDark: '#0e7da8',
  secondary: '#64748b', secondaryLight: '#f8fafc',
  success: '#10b981', successLight: '#d1fae5',
  warning: '#f59e0b', warningLight: '#fef3c7',
  error: '#ef4444', errorLight: '#fee2e2',
  info: '#64748b', infoLight: '#f1f5f9',
  background: '#f8fafc', surface: '#ffffff',
  text: '#1e293b', textLight: '#64748b', border: '#e2e8f0'
};

const getToolColor = (tipo: string) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('caries')) return { base: '#475569', pastel: '#f1f5f9' };
  if (t.includes('resina') || t.includes('obturacion')) return { base: '#64748b', pastel: '#f8fafc' };
  if (t.includes('fractura')) return { base: '#6b7280', pastel: '#f3f4f6' };
  if (t.includes('endodoncia') || t.includes('pulpar') || t.includes('nervio')) return { base: '#4b5563', pastel: '#f3f4f6' };
  if (t.includes('extraccion') || t.includes('ausente')) return { base: '#64748b', pastel: '#f8fafc' };
  if (t.includes('implante') || t.includes('corona')) return { base: '#374151', pastel: '#f1f5f9' };
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

interface HallazgoOdontograma { id: string; diente: string; tipo: string; superficie?: string; descripcion: string; severidad?: string; fechaRegistro: string; cie10?: string; cdt?: string; proceso?: boolean; }
interface Procedimiento { id: string; nombre: string; pieza: string; cara: string; observaciones: string; fecha: string; categoria?: string; migradoDesdeOdontograma?: boolean; hallazgoOrigen?: string; tipoHallazgo?: string; estado: 'sugerido' | 'presupuestado' | 'aprobado' | 'realizado'; costo: number; costoMaterial?: number; is_persistent?: boolean; }
interface Diagnostico { id: string; codigo: string; nombre: string; tipo: 'principal' | 'secundario' | 'hallazgo'; diente?: string; migradoDesdeOdontograma?: boolean; tipoHallazgo?: string; }
interface Receta { id: string; medicamento: string; dosis: string; frecuencia: string; duracion: string; indicaciones: string; }
interface Props { onExit: () => void; onSave?: (data: any) => Promise<any>; initialData?: any; }

const formatCOP = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const GENERAL_TREATMENT_CATEGORIES = ['Operatoria / Restauradora', 'Estetica', 'Cirugia oral', 'Endodoncia', 'Periodoncia', 'Prevencion', 'Rehabilitacion / Protesis'];
const AUTO_NOMBRE_ODONTO_RE = /(restauraci[oó]n con resina|manejo de fractura dental|terapia periodontal inicial|limpieza general|blanqueamiento dental|valoraci[oó]n endod[oó]ntica|valoraci[oó]n para rehabilitaci[oó]n|valoraci[oó]n cl[ií]nica focalizada)/i;

const normalizarNombreOdontograma = (procedure: Partial<Procedimiento>) => {
  const nombre = String(procedure.nombre || '').trim();
  const estado = String(procedure.estado || '').toLowerCase();
  if (!procedure.migradoDesdeOdontograma) return nombre;
  if (estado === 'realizado') return nombre;
  if (AUTO_NOMBRE_ODONTO_RE.test(nombre)) return '';
  return nombre;
};

const MOTIVO_LABELS_GENERAL: Record<string, string> = {
  dolor: 'Dolor o molestia dental',
  control: 'Control odontologico de rutina',
  caries: 'Sospecha de caries',
  fractura: 'Fractura dental',
  protesis: 'Ajuste de protesis',
  trauma: 'Traumatismo dentoalveolar',
  estetica: 'Consulta estetica',
  periodontal: 'Control periodontal',
  otro: 'Otro motivo clinico',
};

const GENERAL_CLINICAL_DESCRIPTION_TEMPLATE = 'Higiene oral regular, con acumulo moderado de placa en sectores puntuales. Se recomienda mejorar tecnica de cepillado y uso de implementos interproximales.';

// ============================================================================
// 2. COMPONENTE PRINCIPAL
// ============================================================================

export const GeneralConsultation = ({ onExit, onSave, initialData }: Props) => {
  const navigate = useNavigate();
  const {
    selectedPatient,
    loadPatientById,
    setCurrentView,
    setAgendaDraft,
  } = usePatient();
  
  // ID de sesión estable — generado al montar, persiste para upsert idempotente
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [sessionStartedAt] = useState<Date>(() =>
    initialData?.created_at ? new Date(initialData.created_at) : new Date()
  );
  const { toasts, removeToast, success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();

  const [activeTab, setActiveTab] = useState('anamnesis');
  const [tiempo, setTiempo] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMigracionModal, setShowMigracionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');

  // ── MEMORIA CLÍNICA ──────────────────────────────────────────────
  const [lastConsultation, setLastConsultation] = useState<any | null>(null);
  const [carryOverPending, setCarryOverPending] = useState<Procedimiento[]>([]);
  const [showCarryOverBanner, setShowCarryOverBanner] = useState(false);
  const [evolutionText, setEvolutionText] = useState('');
  const [isDocumentEditing, setIsDocumentEditing] = useState(false);
  const hasUserEditedNarrative = useRef(false);
  const [lastOdontogramEditAt, setLastOdontogramEditAt] = useState<string | null>(null);
  
  const [motivo, setMotivo] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('');
  const [estadoGeneral, setEstadoGeneral] = useState({
    actitud: 'Colaborador',
    higieneOral: 'Regular',
    alertaMedica: '',
    descripcionClinica: GENERAL_CLINICAL_DESCRIPTION_TEMPLATE,
  });
  const [evaluacionDolor, setEvaluacionDolor] = useState({ escala: 0, caracteristicas: [] as string[], desencadenantes: [] as string[], evolucion: '' });
  const [examenEstomatologico, setExamenEstomatologico] = useState({ atm: 'Sin alteraciones', labios: 'Sin alteraciones', lengua: 'Sin alteraciones', paladar: 'Sin alteraciones', pisoBoca: 'Sin alteraciones', encias: 'Sin alteraciones', observaciones: '', carrillos: 'Sin alteraciones' });
  const [busquedaCie10, setBusquedaCie10] = useState('');
  
  const [hallazgosOdontograma, setHallazgosOdontograma] = useState<HallazgoOdontograma[]>([]);
  const [odontogramaState, setOdontogramaState] = useState<any | null>(initialData?.estado_odontograma || null);
  const [diagnosticosManuales, setDiagnosticosManuales] = useState<Diagnostico[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  
  const [nuevoProcedimiento, setNuevoProcedimiento] = useState<Partial<Procedimiento>>({ nombre: '', pieza: '', cara: '', observaciones: '', categoria: 'Operatoria / Restauradora', costo: 0, costoMaterial: 0, estado: 'aprobado' });
  const [nuevaReceta, setNuevaReceta] = useState({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  const [consentimiento, setConsentimiento] = useState(false);
  const [alertaSeguridadReceta, setAlertaSeguridadReceta] = useState<string | null>(null);

  // ── INMUTABILIDAD LEGAL (Res. 1995 / HIPAA) ─────────────────────
  const [savedAt, setSavedAt] = useState<Date | null>(() =>
    initialData?.created_at ? new Date(initialData.created_at) : null
  );
  const [isLocked, setIsLocked] = useState(false);
  const [minutosRestantes, setMinutosRestantes] = useState(30);
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [notaAclaratoria, setNotaAclaratoria] = useState('');
  const hasInitialConsultationSeed = useMemo(
    () => Boolean(
      initialData && (
        initialData.created_at
        || initialData.estado_odontograma
        || initialData.detalles_clinicos
        || initialData.motivo
        || initialData.motivo_principal
        || initialData.hallazgos_odontograma?.length
        || initialData.hallazgosOdontograma?.length
        || initialData.plan_tratamiento?.length
        || initialData.procedimientos?.length
      )
    ),
    [initialData]
  );

  const getPanelStyle = (visible: boolean): React.CSSProperties => (visible ? {} : { display: 'none' });

  useEffect(() => {
    if (!selectedPatient?.id) return;
    if (selectedPatient.consultas !== undefined && selectedPatient.clinical_history !== undefined) return;

    loadPatientById(selectedPatient.id).catch((error) => {
      console.error('[GeneralConsultation] No se pudo hidratar el caso clinico:', error);
    });
  }, [selectedPatient?.id, selectedPatient?.consultas, selectedPatient?.clinical_history, loadPatientById]);

  useEffect(() => {
    if (hasInitialConsultationSeed && initialData) {
      setMotivo(initialData.motivo_principal || initialData.motivo || '');
      const incomingMotivo = initialData.motivo_tags || initialData.motivoSeleccionado || '';
      setMotivoSeleccionado(Array.isArray(incomingMotivo) ? String(incomingMotivo[0] || '') : String(incomingMotivo || ''));
      const incomingEstadoGeneral = initialData.estado_general || initialData.estadoGeneral || {};
      setEstadoGeneral({
        actitud: incomingEstadoGeneral.actitud || 'Colaborador',
        higieneOral: incomingEstadoGeneral.higieneOral || 'Regular',
        alertaMedica: incomingEstadoGeneral.alertaMedica || incomingEstadoGeneral.alerta_medica || '',
        descripcionClinica: incomingEstadoGeneral.descripcionClinica || incomingEstadoGeneral.descripcion_higiene || incomingEstadoGeneral.descripcionHigiene || GENERAL_CLINICAL_DESCRIPTION_TEMPLATE,
      });
      setEvaluacionDolor(initialData.dolor_detalles || initialData.evaluacionDolor || { escala: 0, caracteristicas: [], desencadenantes: [], evolucion: '' });
      setExamenEstomatologico(initialData.examen_estomatologico || initialData.examenEstomatologico || { atm: 'Sin alteraciones', labios: 'Sin alteraciones', lengua: 'Sin alteraciones', paladar: 'Sin alteraciones', pisoBoca: 'Sin alteraciones', encias: 'Sin alteraciones', observaciones: '' });
      const hallazgosCargados = initialData.hallazgos_odontograma || initialData.hallazgosOdontograma || [];
      console.log('[ODONTO] Hallazgos cargados desde initialData:', hallazgosCargados);
      setHallazgosOdontograma(hallazgosCargados);
      setOdontogramaState(initialData.estado_odontograma || null);
      setDiagnosticosManuales(initialData.diagnosticos_cie10 || initialData.diagnosticos || []);
      setProcedimientos(
        (initialData.plan_tratamiento || initialData.procedimientos || []).map((p: Procedimiento) => ({
          ...p,
          nombre: normalizarNombreOdontograma(p),
        }))
      );
      setRecetas(initialData.recetas_prescritas || initialData.recetas || []);
      const savedNarrative = initialData.detalles_clinicos?.evolucion_clinica || initialData.evolucion_clinica || '';
      if (String(savedNarrative).trim()) {
        hasUserEditedNarrative.current = true;
        setEvolutionText(String(savedNarrative));
      }
      if (initialData.consentimiento_informado !== undefined) setConsentimiento(initialData.consentimiento_informado);
      if (initialData.tiempo_atencion_segundos !== undefined) setTiempo(initialData.tiempo_atencion_segundos || 0);
    }
  }, [initialData, hasInitialConsultationSeed]);

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
      else if (tipoLow.includes('ausente') || tipoLow.includes('extraido')) { codigo = 'K08.1'; nombre = `Pérdida de diente ${hallazgo.diente}`; }
      if (hallazgo.severidad === 'externo') nombre = `${nombre} (Trabajo previo)`;

      return { id: `diag_odon_${hallazgo.id || hallazgo.diente}`, codigo, nombre, tipo: 'hallazgo' as const, diente: hallazgo.diente, migradoDesdeOdontograma: true, tipoHallazgo: hallazgo.tipo };
    });
  }, [hallazgosOdontograma]);

  const todosLosDiagnosticos = [...diagnosticosOdontograma, ...diagnosticosManuales];

  const procedimientosSugeridos = useMemo(() => {
    const sugerencias: Procedimiento[] = [];
    hallazgosOdontograma.forEach(hallazgo => {
      if (hallazgo.severidad === 'externo') return;
      let estadoInicial: 'sugerido' | 'presupuestado' | 'realizado' = 'sugerido';
      if (hallazgo.severidad === 'presupuesto' || hallazgo.proceso) estadoInicial = 'presupuestado';
      // En consulta general, los hallazgos del odontograma se importan como plan ejecutable,
      // no como procedimiento ya cobrado/ejecutado por defecto.
      if (hallazgo.severidad === 'realizado') estadoInicial = 'sugerido';

      const nombre = '';
      // La categoria se deja manual para que el doctor la defina en el plan.
      const categoria: Procedimiento['categoria'] = undefined;
      const costo = 0;

      sugerencias.push({
        id: `ptr_${hallazgo.id || hallazgo.diente}`,
        nombre,
        pieza: hallazgo.diente,
        cara: hallazgo.superficie || 'Todas',
        observaciones: `Sugerido desde odontograma. Definir nombre del tratamiento y precio.${hallazgo.descripcion ? ` ${hallazgo.descripcion}` : ''}${hallazgo.proceso ? ' · Procedimiento en proceso' : ''}${hallazgo.cie10 ? ` · CIE-10 ${hallazgo.cie10}` : ''}${hallazgo.cdt ? ` · CDT ${hallazgo.cdt}` : ''}`,
        categoria,
        fecha: new Date().toLocaleDateString(),
        estado: estadoInicial,
        costo,
        migradoDesdeOdontograma: true,
        hallazgoOrigen: hallazgo.id || hallazgo.diente,
        tipoHallazgo: hallazgo.tipo
      });
    });
    return sugerencias.filter(sug => !procedimientos.some(p => p.hallazgoOrigen === sug.hallazgoOrigen));
  }, [hallazgosOdontograma, procedimientos]);

  const antecedentSummary = useMemo(
    () => summarizeClinicalHistory(selectedPatient?.clinical_history),
    [selectedPatient?.clinical_history]
  );

  const currentProcedureKeys = useMemo(
    () => new Set(procedimientos.map((procedure) => buildProcedureStableKey({ ...procedure, costoMaterial: procedure.costoMaterial ?? 0 }, selectedPatient?.id))),
    [procedimientos, selectedPatient?.id]
  );

  const persistentPlan = useMemo(() => {
    return deriveMasterPlan(selectedPatient?.consultas, selectedPatient?.id)
      .filter((item) => item.consultationType === 'GENERAL')
      .filter((item) => !currentProcedureKeys.has(item.stableKey))
      .slice(0, 6);
  }, [selectedPatient?.consultas, selectedPatient?.id, currentProcedureKeys]);

  const currentGeneralClosureSummary = useMemo(() => {
    const pendientes = procedimientos.filter((p) => ['sugerido', 'presupuestado', 'aprobado'].includes(String(p.estado).toLowerCase()));
    const realizados = procedimientos.filter((p) => String(p.estado).toLowerCase() === 'realizado');
    const h = Math.floor(tiempo / 3600);
    const m = Math.floor((tiempo % 3600) / 60);
    const s = tiempo % 60;
    return {
      hallazgos_activos: hallazgosOdontograma.length,
      odontograma_ultima_edicion: lastOdontogramEditAt,
      procedimientos_realizados_hoy: realizados.length,
      procedimientos_pendientes: pendientes.length,
      recetas_emitidas: recetas.length,
      motivo_categorizado: motivoSeleccionado,
      motivo_label: MOTIVO_LABELS_GENERAL[motivoSeleccionado] || 'No categorizado',
      tiempo_sesion: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
    };
  }, [procedimientos, hallazgosOdontograma.length, lastOdontogramEditAt, recetas.length, motivoSeleccionado, tiempo]);

  // ==========================================================================
  // 4. HANDLERS & SUPABASE CONNECTION
  // ==========================================================================

  useEffect(() => { const timer = setInterval(() => setTiempo(prev => prev + 1), 1000); return () => clearInterval(timer); }, []);

  // ── TEMPORIZADOR DE BLOQUEO LEGAL (30 min, Res. 1995 / HIPAA) ───
  useEffect(() => {
    if (!savedAt) { setIsLocked(false); return; }
    const tick = () => {
      const mins = (Date.now() - savedAt.getTime()) / 60000;
      setMinutosRestantes(Math.max(0, Math.ceil(30 - mins)));
      setIsLocked(mins >= 30);
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [savedAt]);

  const formatTiempo = () => { const h = Math.floor(tiempo / 3600); const m = Math.floor((tiempo % 3600) / 60); const s = tiempo % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  // ── FETCH ÚLTIMA CONSULTA (Snapshot + Carry-over) ──────────────
  useEffect(() => {
    if (!selectedPatient?.id) return;
    const fetchLast = async () => {
      try {
        const { data, error } = await supabase
          .from('consultas_odontologicas')
          .select('id, creado_en, detalles_clinicos, hallazgos_odontograma, estado_odontograma')
          .eq('paciente_id', selectedPatient.id)
          .neq('id', sessionId)
          .eq('tipo_consulta', 'GENERAL')
          .order('creado_en', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) return;
        setLastConsultation(data);

        if (!hasInitialConsultationSeed) {
          setOdontogramaState((prev: any) => prev || data.estado_odontograma || null);
          const hallazgosPrevios = data.hallazgos_odontograma || [];
          // Eliminado: notificación al cargar base de cita anterior
          setHallazgosOdontograma((prev) => prev.length > 0 ? prev : hallazgosPrevios);
        }

        // Carry-over: procedimientos presupuestados o sugeridos que no se realizaron
        const previoPlan: any[] = data.detalles_clinicos?.plan_tratamiento || [];
        const pendientes = previoPlan
          .filter((p: any) => p.estado === 'presupuestado' || p.estado === 'sugerido')
          .map((p: any) => ({
            ...p,
            id: `carry_${crypto.randomUUID()}`,
            estado: 'presupuestado' as const,
            _carryOver: true,
            _carryOverDate: data.creado_en,
          }));

        if (pendientes.length > 0) {
          setCarryOverPending(pendientes);
          setShowCarryOverBanner(true);
        }
        // No mostrar ningún mensaje ni notificación al cargar base previa
        setMensajeConfirmacion(''); // redundante, pero asegura limpieza
      } catch (_) { /* silencioso — no hay consulta previa */ }
    };
    fetchLast();
  }, [selectedPatient?.id, sessionId, hasInitialConsultationSeed]);

  // ── NARRATIVE GENERATOR ────────────────────────────────────────
  const motivoSeleccionadoLabel = useMemo(
    () => MOTIVO_LABELS_GENERAL[motivoSeleccionado] || '',
    [motivoSeleccionado]
  );

  const generalContainerLogic = useMemo(() => {
    const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
    const normList = (list: unknown) => {
      const arr = Array.isArray(list) ? list : [];
      return [...new Set(arr.map((item) => norm(item)).filter(Boolean))].sort().join('|');
    };
    const hallazgoKey = (hallazgo: any) => {
      return [
        String(hallazgo?.diente || '').trim(),
        norm(hallazgo?.tipo),
        norm(hallazgo?.superficie),
        norm(hallazgo?.severidad),
        norm(hallazgo?.cie10),
        norm(hallazgo?.cdt),
      ].join('::');
    };
    const procedimientoKey = (procedure: any) => {
      return [
        norm(normalizarNombreOdontograma(procedure) || procedure?.nombre),
        norm(procedure?.pieza),
        norm(procedure?.cara),
        norm(procedure?.estado),
        String(Number(procedure?.costo || 0)),
      ].join('::');
    };
    const recetaKey = (receta: any) => {
      return [
        norm(receta?.medicamento),
        norm(receta?.dosis),
        norm(receta?.frecuencia),
        norm(receta?.duracion),
      ].join('::');
    };

    const previousDetails = (lastConsultation?.detalles_clinicos && typeof lastConsultation.detalles_clinicos === 'object')
      ? lastConsultation.detalles_clinicos
      : {};
    const previousEstado = previousDetails.notas || previousDetails.estado_general || previousDetails.estadoGeneral || {};
    const previousDolor = previousDetails.dolor?.detalles || previousDetails.dolor_detalles || previousDetails.evaluacionDolor || {};
    const previousExamen = previousDetails.examen_fisico || previousDetails.examen_estomatologico || previousDetails.examenEstomatologico || {};
    const previousPlan = Array.isArray(previousDetails.plan_tratamiento) ? previousDetails.plan_tratamiento : [];
    const previousRecetas = Array.isArray(previousDetails.recetas) ? previousDetails.recetas : [];
    const previousHallazgos = Array.isArray(lastConsultation?.hallazgos_odontograma) ? lastConsultation.hallazgos_odontograma : [];

    const estadoChanged =
      norm(previousEstado?.actitud) !== norm(estadoGeneral.actitud)
      || norm(previousEstado?.higieneOral) !== norm(estadoGeneral.higieneOral)
      || norm(previousEstado?.alertaMedica || previousEstado?.alerta_medica) !== norm(estadoGeneral.alertaMedica)
      || norm(previousEstado?.descripcionClinica || previousEstado?.descripcion_higiene || previousEstado?.descripcionHigiene) !== norm(estadoGeneral.descripcionClinica);

    const dolorChanged =
      Number(previousDolor?.escala || 0) !== Number(evaluacionDolor.escala || 0)
      || normList(previousDolor?.caracteristicas || previousDolor?.molestias || previousDolor?.detalles?.caracteristicas) !== normList(evaluacionDolor.caracteristicas)
      || normList(previousDolor?.desencadenantes || previousDolor?.detalles?.desencadenantes) !== normList(evaluacionDolor.desencadenantes)
      || norm(previousDolor?.evolucion || previousDolor?.detalles?.evolucion) !== norm(evaluacionDolor.evolucion);

    const examenChanged =
      norm(previousExamen?.atm) !== norm(examenEstomatologico.atm)
      || norm(previousExamen?.labios) !== norm(examenEstomatologico.labios)
      || norm(previousExamen?.carrillos) !== norm(examenEstomatologico.carrillos)
      || norm(previousExamen?.lengua) !== norm(examenEstomatologico.lengua)
      || norm(previousExamen?.paladar) !== norm(examenEstomatologico.paladar)
      || norm(previousExamen?.pisoBoca || previousExamen?.piso_boca) !== norm(examenEstomatologico.pisoBoca)
      || norm(previousExamen?.encias || previousExamen?.enciasPisoBoca || previousExamen?.encias_piso_boca) !== norm(examenEstomatologico.encias)
      || norm(previousExamen?.observaciones || previousExamen?.hallazgosAdicionales) !== norm(examenEstomatologico.observaciones);

    const currentHallazgoSet = new Set(
      hallazgosOdontograma
        .filter((item: any) => norm(item?.severidad) !== 'externo')
        .map((item: any) => hallazgoKey(item))
    );
    const previousHallazgoSet = new Set(
      previousHallazgos
        .filter((item: any) => norm(item?.severidad) !== 'externo')
        .map((item: any) => hallazgoKey(item))
    );
    const odontogramaChanged = currentHallazgoSet.size !== previousHallazgoSet.size
      || [...currentHallazgoSet].some((item) => !previousHallazgoSet.has(item));

    const currentPlanSet = new Set(procedimientos.map((item) => procedimientoKey(item)));
    const previousPlanSet = new Set(previousPlan.map((item: any) => procedimientoKey(item)));
    const planChanged = currentPlanSet.size !== previousPlanSet.size
      || [...currentPlanSet].some((item) => !previousPlanSet.has(item));

    const currentRecetaSet = new Set(recetas.map((item) => recetaKey(item)));
    const previousRecetaSet = new Set(previousRecetas.map((item: any) => recetaKey(item)));
    const recetasChanged = currentRecetaSet.size !== previousRecetaSet.size
      || [...currentRecetaSet].some((item) => !previousRecetaSet.has(item));

    const isFirstVisit = !lastConsultation?.id;
    const isControl = motivoSeleccionado === 'control';
    const isUrgentOrPain = ['dolor', 'trauma', 'fractura'].includes(motivoSeleccionado);

    const changes = {
      estadoGeneral: estadoChanged,
      evaluacionDolor: dolorChanged,
      examenEstomatologico: examenChanged,
      odontograma: odontogramaChanged,
      planTratamiento: planChanged,
      recetas: recetasChanged,
    };

    const hasMeaningfulChanges = Object.values(changes).some(Boolean);
    const mode = isFirstVisit
      ? 'primera_vez'
      : (isControl
        ? 'control'
        : (isUrgentOrPain ? 'focal_urgencia' : 'focal_evolucion'));

    const referenceIso = String(lastConsultation?.creado_en || initialData?.created_at || '') || null;
    const nowIso = new Date().toISOString();

    return {
      mode,
      isFirstVisit,
      isControl,
      isUrgentOrPain,
      hasMeaningfulChanges,
      changes,
      referenceConsultation: lastConsultation?.id
        ? { id: lastConsultation.id, date: referenceIso }
        : null,
      containerUpdatedAt: {
        estadoGeneral: changes.estadoGeneral ? nowIso : referenceIso,
        evaluacionDolor: changes.evaluacionDolor ? nowIso : referenceIso,
        examenEstomatologico: changes.examenEstomatologico ? nowIso : referenceIso,
        odontograma: changes.odontograma ? (lastOdontogramEditAt || nowIso) : referenceIso,
        planTratamiento: changes.planTratamiento ? nowIso : referenceIso,
        recetas: changes.recetas ? nowIso : referenceIso,
      },
    };
  }, [
    lastConsultation,
    initialData?.created_at,
    motivoSeleccionado,
    estadoGeneral,
    evaluacionDolor,
    examenEstomatologico,
    hallazgosOdontograma,
    procedimientos,
    recetas,
    lastOdontogramEditAt,
  ]);

  const generalContainerSummaries = useMemo(() => {
    const val = (input: unknown, fallback: string) => {
      const str = String(input ?? '').trim();
      return str ? str : fallback;
    };

    const ensureFinalPeriod = (input: string) => {
      const clean = String(input || '').trim();
      if (!clean) return '';
      return /[.!?]$/.test(clean) ? clean : `${clean}.`;
    };

    const antecedentes = ensureFinalPeriod(antecedentSummary || 'Historia base aun no diligenciada.');
    const descripcionClinicaActual = val(estadoGeneral.descripcionClinica, GENERAL_CLINICAL_DESCRIPTION_TEMPLATE);
    const alertaMedica = val(estadoGeneral.alertaMedica, 'sin alertas médicas sistémicas de riesgo');
    const actitud = val(estadoGeneral.actitud, 'sin dato').toLowerCase();
    const higiene = val(estadoGeneral.higieneOral, 'sin dato').toLowerCase();

    const dolor = evaluacionDolor.escala > 0
      ? `Refiere dolor ${evaluacionDolor.escala}/10${evaluacionDolor.caracteristicas.length ? `, descrito como ${evaluacionDolor.caracteristicas.join(', ')}` : ''}${evaluacionDolor.desencadenantes.length ? `, con desencadenantes ${evaluacionDolor.desencadenantes.join(', ')}` : ''}${evaluacionDolor.evolucion ? `. Evolución reportada: ${evaluacionDolor.evolucion}` : ''}.`
      : 'No refiere dolor clínicamente significativo durante esta atención.';

    const examenItems = [
      ['ATM', examenEstomatologico.atm],
      ['labios', examenEstomatologico.labios],
      ['carrillos', examenEstomatologico.carrillos],
      ['lengua', examenEstomatologico.lengua],
      ['paladar', examenEstomatologico.paladar],
      ['piso de boca', examenEstomatologico.pisoBoca],
      ['encías', examenEstomatologico.encias],
    ]
      .map(([label, value]) => `${label}: ${val(value, 'sin dato')}`)
      .join(', ');

    const hallazgosActivos = hallazgosOdontograma
      .filter((h) => String(h.severidad || '').toLowerCase() !== 'externo');
    const hallazgosResumen = hallazgosActivos.length > 0
      ? hallazgosActivos
          .slice(0, 5)
          .map((h) => `${String(h.tipo || 'hallazgo').replace(/_/g, ' ')} en pieza ${h.diente}${h.superficie ? ` (${h.superficie})` : ''}`)
          .join(', ')
      : 'sin hallazgos nuevos en el odontograma';

    const diagnosticosResumen = todosLosDiagnosticos.length > 0
      ? todosLosDiagnosticos
          .slice(0, 6)
          .map((d) => `${d.codigo} (${d.nombre})`)
          .join(', ')
      : 'sin diagnósticos CIE-10 manuales registrados';

    const procedimientosNarrables = procedimientos.filter((p) => {
      if (String(p.estado).toLowerCase() === 'sugerido') return false;
      return String(normalizarNombreOdontograma(p) || p.nombre || '').trim().length > 0;
    });
    const realizados = procedimientosNarrables.filter((p) => String(p.estado).toLowerCase() === 'realizado');
    const aprobados = procedimientosNarrables.filter((p) => String(p.estado).toLowerCase() === 'aprobado');
    const pendientes = procedimientosNarrables.filter((p) => String(p.estado).toLowerCase() === 'presupuestado');

    const procedimientosResumen = procedimientosNarrables.length > 0
      ? procedimientosNarrables
          .slice(0, 5)
          .map((p) => `${normalizarNombreOdontograma(p) || p.nombre}${p.pieza ? ` en pieza ${p.pieza}` : ''}${p.cara ? ` (${p.cara})` : ''} [${p.estado}]`)
          .join(', ')
      : 'sin procedimientos ejecutados ni aprobados durante la sesión';

    const planLongitudinal = persistentPlan.length > 0
      ? `Se mantiene plan longitudinal activo con ${persistentPlan.length} pendiente(s), priorizando ${persistentPlan
          .slice(0, 3)
          .map((item) => `${item.nombre}${item.pieza ? ` en pieza ${item.pieza}` : ''}`)
          .join(', ')}.`
      : 'No se identifican pendientes longitudinales activos para seguimiento en próximas sesiones.';

    const prescripcion = recetas.length > 0
      ? `Se emitieron ${recetas.length} receta(s): ${recetas.map((r) => `${r.medicamento} ${r.dosis}, ${r.frecuencia} por ${r.duracion}`).join('; ')}.`
      : 'No se generó prescripción farmacológica en esta consulta.';

    const cierreTecnico = `Cierre operativo: ${realizados.length} procedimiento(s) realizado(s), ${aprobados.length} aprobado(s), ${pendientes.length} pendiente(s), ${recetas.length} receta(s) emitida(s), con ${hallazgosActivos.length} hallazgo(s) activo(s) documentado(s).`;

    const valoracionClinicaIntegral = `Descripción clínica actual: ${descripcionClinicaActual} Valoración clínica integral: ${dolor} ${`El examen estomatológico reportó ${examenItems}${examenEstomatologico.observaciones ? `. Observaciones adicionales: ${examenEstomatologico.observaciones}` : ''}.`} ${`En el odontograma se registró ${hallazgosResumen}.`}`;

    return {
      estado_general: `Antecedentes clínicos relevantes: ${antecedentes} En la sesión se observó paciente ${actitud}, con higiene oral ${higiene} y alerta médica consignada como ${alertaMedica}.`,
      descripcion_clinica_actual: descripcionClinicaActual,
      valoracion_clinica: valoracionClinicaIntegral,
      evaluacion_dolor: dolor,
      examen_estomatologico: `El examen estomatológico reportó ${examenItems}${examenEstomatologico.observaciones ? `. Observaciones adicionales: ${examenEstomatologico.observaciones}` : ''}.`,
      odontograma: `En el odontograma se registró ${hallazgosResumen}.`,
      diagnostico: `La impresión diagnóstica codificada corresponde a ${diagnosticosResumen}.`,
      conducta_clinica: `La conducta clínica documentada en esta sesión fue ${procedimientosResumen}.`,
      plan_longitudinal: planLongitudinal,
      prescripcion: prescripcion,
      cierre_tecnico: cierreTecnico,
    };
  }, [
    antecedentSummary,
    estadoGeneral,
    evaluacionDolor,
    examenEstomatologico,
    hallazgosOdontograma,
    todosLosDiagnosticos,
    procedimientos,
    persistentPlan,
    recetas,
  ]);

  const generalContainerLastModified = useMemo(() => {
    const updatedAt = generalContainerLogic.containerUpdatedAt;
    const valoracionClinicaUpdatedAt = updatedAt.odontograma || updatedAt.examenEstomatologico || updatedAt.evaluacionDolor || generalContainerLogic.referenceConsultation?.date;

    return {
      estado_general: updatedAt.estadoGeneral,
      descripcion_clinica_actual: updatedAt.estadoGeneral,
      valoracion_clinica: valoracionClinicaUpdatedAt,
      evaluacion_dolor: updatedAt.evaluacionDolor,
      examen_estomatologico: updatedAt.examenEstomatologico,
      odontograma: updatedAt.odontograma,
      plan_tratamiento: updatedAt.planTratamiento,
      recetas: updatedAt.recetas,
    };
  }, [generalContainerLogic]);

  const generalContainerStateStatus = useMemo(() => ({
    estado_general: generalContainerLogic.changes.estadoGeneral ? 'actualizado' : 'sin_cambios',
    descripcion_clinica_actual: generalContainerLogic.changes.estadoGeneral ? 'actualizado' : 'sin_cambios',
    valoracion_clinica: (generalContainerLogic.changes.evaluacionDolor
      || generalContainerLogic.changes.examenEstomatologico
      || generalContainerLogic.changes.odontograma)
      ? 'actualizado'
      : 'sin_cambios',
    evaluacion_dolor: generalContainerLogic.changes.evaluacionDolor ? 'actualizado' : 'sin_cambios',
    examen_estomatologico: generalContainerLogic.changes.examenEstomatologico ? 'actualizado' : 'sin_cambios',
    odontograma: generalContainerLogic.changes.odontograma ? 'actualizado' : 'sin_cambios',
    plan_tratamiento: generalContainerLogic.changes.planTratamiento ? 'actualizado' : 'sin_cambios',
    recetas: generalContainerLogic.changes.recetas ? 'actualizado' : 'sin_cambios',
  }), [generalContainerLogic.changes]);

  const generalContinuitySummary = useMemo(() => {
    const fechaReferencia = generalContainerLogic.referenceConsultation?.date
      ? new Date(generalContainerLogic.referenceConsultation.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'la consulta previa registrada';

    const cambios = generalContainerLogic.changes;
    const bloquesActualizados: string[] = [];
    if (cambios.estadoGeneral) bloquesActualizados.push('estado general');
    if (cambios.evaluacionDolor) bloquesActualizados.push('evaluación de dolor');
    if (cambios.examenEstomatologico) bloquesActualizados.push('examen estomatológico');
    if (cambios.odontograma) bloquesActualizados.push('odontograma');
    if (cambios.planTratamiento) bloquesActualizados.push('plan de tratamiento');
    if (cambios.recetas) bloquesActualizados.push('prescripción');

    if (generalContainerLogic.isFirstVisit) {
      return 'Corresponde a consulta inicial de línea base, por lo que se documenta estado basal completo para seguimiento longitudinal.';
    }

    if (generalContainerLogic.isControl && !generalContainerLogic.hasMeaningfulChanges) {
      return `Control clínico sin cambios relevantes frente a ${fechaReferencia}, manteniendo continuidad terapéutica y vigilancia periódica.`;
    }

    if (generalContainerLogic.isControl && generalContainerLogic.hasMeaningfulChanges) {
      return `Control clínico con cambios relevantes frente a ${fechaReferencia}, principalmente en ${bloquesActualizados.join(', ')}.`;
    }

    if (generalContainerLogic.isUrgentOrPain) {
      return 'Consulta focalizada en control sintomático/urgencia, priorizando resolución local y estabilización clínica de la molestia principal.';
    }

    if (generalContainerLogic.hasMeaningfulChanges) {
      return `Evolución clínica con variaciones documentadas frente a ${fechaReferencia} en ${bloquesActualizados.join(', ')}.`;
    }

    return `Evolución clínica estable frente a ${fechaReferencia}, sin modificaciones sustanciales en contenedores principales.`;
  }, [generalContainerLogic]);

  const generateGeneralTechnicalSummary = useMemo(() => {
    const parrafos: string[] = [];
    const fechaActual = new Date();
    const diaSesion = fechaActual.getDate();
    const mesSesion = fechaActual.toLocaleDateString('es-CO', { month: 'long' });
    const anioSesion = fechaActual.getFullYear();
    const horaSesion = fechaActual.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const pacienteNombre = `${selectedPatient?.nombre || 'Paciente'} ${selectedPatient?.apellidos || ''}`.trim();
    const docId = (selectedPatient as any)?.cc
      || (selectedPatient as any)?.documento
      || (selectedPatient as any)?.identificacion
      || (selectedPatient as any)?.cedula
      || 'No registrado';
    const motivoPrincipal = motivoSeleccionado
      ? (motivoSeleccionado === 'otro'
        ? (motivo.trim() || 'Otro motivo no especificado')
        : (MOTIVO_LABELS_GENERAL[motivoSeleccionado] || motivoSeleccionado))
      : (motivo.trim() || 'valoración clínica general');

    parrafos.push(`El paciente ${pacienteNombre}, identificado con Cédula de ciudadanía número ${docId}, asiste el día ${diaSesion} del mes de ${mesSesion} de ${anioSesion}, a las ${horaSesion}, por ${motivoPrincipal.toLowerCase()}.`);

    const hallazgosActivos = hallazgosOdontograma.filter((h) => String(h.severidad || '').toLowerCase() !== 'externo');
    if (hallazgosActivos.length > 0) {
      const detalleHallazgos = hallazgosActivos
        .slice(0, 8)
        .map((h) => `${String(h.tipo || 'hallazgo').replace(/_/g, ' ')} en pieza ${h.diente}${h.superficie ? ` (${h.superficie})` : ''}`)
        .join(', ');
      parrafos.push(`En el odontograma se documentan ${hallazgosActivos.length} hallazgo(s) activo(s), con predominio de ${detalleHallazgos}.`);
    } else {
      parrafos.push('En el odontograma no se identifican hallazgos activos nuevos para esta sesión.');
    }

    const diagnosticosTexto = todosLosDiagnosticos.length > 0
      ? todosLosDiagnosticos.slice(0, 8).map((d) => `${d.codigo} (${d.nombre})`).join(', ')
      : 'sin diagnósticos CIE-10 manuales adicionales';
    parrafos.push(`La impresión diagnóstica de la cita corresponde a ${diagnosticosTexto}.`);

    const realizados = procedimientos.filter((p) => String(p.estado).toLowerCase() === 'realizado');
    const aprobados = procedimientos.filter((p) => String(p.estado).toLowerCase() === 'aprobado');
    const pendientes = procedimientos.filter((p) => ['sugerido', 'presupuestado'].includes(String(p.estado).toLowerCase()));
    if (realizados.length > 0 || aprobados.length > 0 || pendientes.length > 0) {
      parrafos.push(`La conducta clínica dejó ${realizados.length} procedimiento(s) realizado(s), ${aprobados.length} aprobado(s) y ${pendientes.length} pendiente(s) para seguimiento.`);
    } else {
      parrafos.push('No se registraron procedimientos ejecutados ni aprobados durante esta atención clínica.');
    }

    const higiene = String(estadoGeneral.higieneOral || 'Regular').toLowerCase();
    parrafos.push(`En el estado clínico actual, el paciente presenta higiene oral ${higiene}, y la descripción de tejidos blandos reporta que ${generalContainerSummaries.descripcion_clinica_actual}.`);
    parrafos.push(`Continuidad clínica: ${generalContinuitySummary}`);
    parrafos.push(`Al cierre, ${generalContainerSummaries.cierre_tecnico}`);

    return parrafos.join(' ');
  }, [selectedPatient, motivoSeleccionado, motivo, hallazgosOdontograma, todosLosDiagnosticos, procedimientos, estadoGeneral.higieneOral, generalContainerSummaries.descripcion_clinica_actual, generalContainerSummaries.cierre_tecnico, generalContinuitySummary]);

  const buildNarrativeText = useCallback(() => {
    const val = (input: unknown, fallback: string) => {
      const str = String(input ?? '').trim();
      return str ? str : fallback;
    };

    const nombreCompleto = [selectedPatient?.nombre, selectedPatient?.apellidos].filter(Boolean).join(' ') || 'Paciente sin nombre';
    const rawDocType = String(
      (selectedPatient as any)?.tipo_documento
      || (selectedPatient as any)?.tipoDocumento
      || (selectedPatient as any)?.document_type
      || (selectedPatient as any)?.documentType
      || 'CC'
    ).toUpperCase();
    const docTypeLabel = ({
      CC: 'Cédula de ciudadanía',
      TI: 'Tarjeta de identidad',
      CE: 'Cédula de extranjería',
      PASAPORTE: 'Pasaporte',
      NIT: 'NIT',
      RC: 'Registro civil',
    } as Record<string, string>)[rawDocType] || rawDocType;
    const docId = val(
      (selectedPatient as any)?.cc
      || (selectedPatient as any)?.documento
      || (selectedPatient as any)?.identificacion
      || (selectedPatient as any)?.cedula,
      'No registrado'
    );
    const consultationCode = val(
      initialData?.codigo_consulta,
      buildConsultationCode({
        consultationId: sessionId,
        consultationType: 'GENERAL',
        consultationDate: new Date().toISOString(),
      })
    );

    const fecha = sessionStartedAt.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const numCita = (selectedPatient?.consultas?.length || 0) + 1;

    const motivoPrincipal = motivoSeleccionado
      ? (motivoSeleccionado === 'otro'
        ? val(motivo, 'Otro motivo clínico')
        : (motivoSeleccionadoLabel || motivoSeleccionado))
      : val(motivo, 'Motivo no especificado');
    const motivoLibre = val(motivo, 'Sin relato adicional registrado');

    const antecedentes = antecedentSummary || 'Historia base aun no diligenciada.';
    const marcadoresUrgencia = motivoSeleccionado
      ? (motivoSeleccionado === 'otro' ? 'Otro (usar descripción libre)' : (MOTIVO_LABELS_GENERAL[motivoSeleccionado] || motivoSeleccionado))
      : 'Sin marcadores adicionales';

    const formatContainerLastUpdated = (value: unknown): string => {
      const raw = String(value || '').trim();
      if (!raw) return 'Sin registro previo';
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return 'Sin registro previo';
      return parsed.toLocaleString('es-CO');
    };

    const cie10Lines = todosLosDiagnosticos.length > 0
      ? todosLosDiagnosticos
          .map((d) => `  • ${d.codigo} — ${d.nombre}${d.tipo ? ` (${d.tipo})` : ''}`)
          .join('\n')
      : '  • Sin diagnósticos CIE-10 manuales registrados';

    const realizadosHoy = procedimientos.filter((p) => String(p.estado).toLowerCase() === 'realizado');
    const aprobadosHoy = procedimientos.filter((p) => String(p.estado).toLowerCase() === 'aprobado');
    const pendientesProx = procedimientos.filter((p) => ['sugerido', 'presupuestado'].includes(String(p.estado).toLowerCase()));
    const realizadosStr = realizadosHoy.length > 0
      ? realizadosHoy.map((p) => `  • ${p.nombre || 'Procedimiento'}${p.pieza ? ` — pieza ${p.pieza}` : ''}`).join('\n')
      : '  • Sin procedimientos realizados en esta sesión';
    const aprobadosStr = aprobadosHoy.length > 0
      ? aprobadosHoy.map((p) => `  • ${p.nombre || 'Procedimiento'}${p.pieza ? ` — pieza ${p.pieza}` : ''}`).join('\n')
      : '  • Sin procedimientos aprobados adicionales';
    const pendientesStr = pendientesProx.length > 0
      ? pendientesProx.map((p) => `  • ${p.nombre || 'Procedimiento'}${p.pieza ? ` — pieza ${p.pieza}` : ''} (${p.estado})`).join('\n')
      : '  • Sin procedimientos en lista de espera';

    return [
      'INFORME CLÍNICO ODONTOLÓGICO GENERAL',
      `I. DATOS DEL PACIENTE\nNombre: ${nombreCompleto}\nDocumento de identidad: ${docId}\nCódigo de consulta: ${consultationCode}\nFecha de atención: ${fecha}\nNúmero de consulta: ${numCita}`,
      `II. MOTIVO DE CONSULTA\nMotivo principal: ${motivoPrincipal}\nRelato del paciente: ${motivoLibre}\nMarcadores de urgencia: ${marcadoresUrgencia}`,
      `III. ANTECEDENTES Y CONTEXTO CLÍNICO\nDescripción clínica actual: ${generalContainerSummaries.descripcion_clinica_actual}\nHistorial clínico: ${antecedentes}`,
      `IV. ESTADO GENERAL Y VALORACIÓN CLÍNICA\nActitud del paciente: ${val(estadoGeneral.actitud, 'Sin dato')}\nHigiene oral observada: ${val(estadoGeneral.higieneOral, 'Sin dato')}\nAlerta médica: ${val(estadoGeneral.alertaMedica, 'Sin alertas médicas sistémicas de riesgo')}\nResumen clínico fluido del estado general: ${generalContainerSummaries.estado_general}\nResumen clínico fluido de valoración clínica: ${generalContainerSummaries.valoracion_clinica}`,
      `V. EVALUACIÓN DE DOLOR\n${generalContainerSummaries.evaluacion_dolor}`,
      `VI. EXAMEN ESTOMATOLÓGICO\n${generalContainerSummaries.examen_estomatologico}`,
      `VII. ODONTOGRAMA Y DIAGNÓSTICO CIE-10\nÚltima modificación del odontograma: ${formatContainerLastUpdated(generalContainerLastModified.odontograma)}\n${generalContainerSummaries.odontograma}\nDiagnósticos CIE-10:\n${cie10Lines}`,
      `VIII. CONDUCTA CLÍNICA\nProcedimientos realizados hoy:\n${realizadosStr}\nProcedimientos aprobados:\n${aprobadosStr}\nPendientes y presupuestados:\n${pendientesStr}`,
      `IX. PLAN LONGITUDINAL Y PRESCRIPCIÓN\n${generalContainerSummaries.plan_longitudinal}\n${generalContainerSummaries.prescripcion}\nCierre técnico: ${generalContainerSummaries.cierre_tecnico}${consentimiento ? ' Se deja constancia de consentimiento informado firmado para la atención actual.' : ''}`,
      `X. RESUMEN TÉCNICO AUTOMÁTICO\n${generateGeneralTechnicalSummary}`,
    ].join('\n\n');
  }, [
    selectedPatient,
    initialData,
    sessionId,
    sessionStartedAt,
    motivo,
    motivoSeleccionado,
    motivoSeleccionadoLabel,
    antecedentSummary,
    todosLosDiagnosticos,
    procedimientos,
    estadoGeneral,
    generalContinuitySummary,
    generalContainerLastModified,
    generalContainerSummaries,
    generateGeneralTechnicalSummary,
    consentimiento,
  ]);

  const narrativaClinicaSugerida = useMemo(() => buildNarrativeText(), [buildNarrativeText]);

  // Sincroniza automáticamente mientras no haya edición manual del documento.
  useEffect(() => {
    if (!hasUserEditedNarrative.current) {
      setEvolutionText(narrativaClinicaSugerida);
    }
  }, [narrativaClinicaSugerida]);

  // Nueva lógica robusta para sincronizar y guardar el odontograma
  const handleOdontogramaSync = useCallback((data: any, currentState?: any) => {
    if (!Array.isArray(data)) {
      setHallazgosOdontograma([]);
      return;
    }
    // Solo permitimos campos válidos y generamos los faltantes
    const hallazgosAGuardar = data.map((item: any) => {
      const id = item.id || `hgo_${item.diente}_${item.tipo || 'hallazgo'}_${item.superficie || 'general'}`.replace(/\s+/g, '_').toLowerCase();
      return {
        id,
        diente: item.diente,
        tipo: item.tipo || 'hallazgo',
        superficie: item.superficie || '',
        descripcion: item.descripcion || `Hallazgo en ${item.diente}`,
        severidad: item.severidad || '',
        fechaRegistro: item.fechaRegistro || new Date().toISOString(),
        cie10: item.cie10 || '',
        cdt: item.cdt || '',
        proceso: Boolean(item.proceso),
      };
    });
    setHallazgosOdontograma(hallazgosAGuardar);
    setLastOdontogramEditAt(new Date().toISOString());
    if (currentState && typeof currentState === 'object') {
      setOdontogramaState(currentState);
    }
  }, []);

  const aceptarSugerencias = useCallback(() => {
    if (procedimientosSugeridos.length === 0) return;
    const sugerenciasLimpias = procedimientosSugeridos.map((p) => ({
      ...p,
      nombre: normalizarNombreOdontograma(p),
    }));
    setProcedimientos(prev => [...prev, ...sugerenciasLimpias]);
    // No mostrar mensaje ni modal de confirmación
  }, [procedimientosSugeridos]);

  const handleEjecutarProcedimiento = useCallback((id: string) => {
    const objetivo = procedimientos.find((item) => item.id === id);
    if (!objetivo) return;
    if (String(objetivo.estado).toLowerCase() === 'realizado') {
      toastInfo('Este procedimiento ya está marcado como realizado.');
      return;
    }

    const nombreFinal = normalizarNombreOdontograma(objetivo) || 'Tratamiento';
    setProcedimientos((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, nombre: normalizarNombreOdontograma(item) || 'Tratamiento', estado: 'realizado' }
        : item
    )));

    setMensajeConfirmacion(`Se ejecutó: ${nombreFinal}.`);
    setShowConfirmModal(true);
    setTimeout(() => setShowConfirmModal(false), 2500);
  }, [procedimientos, toastInfo]);

  const handleMarcarTodoRealizado = useCallback(() => {
    const pendientes = procedimientos.filter((item) => ['sugerido', 'presupuestado', 'aprobado'].includes(String(item.estado).toLowerCase()));
    if (pendientes.length === 0) {
      toastInfo('No hay procedimientos pendientes para ejecutar.');
      return;
    }

    setProcedimientos((prev) => prev.map((item) => (
      ['sugerido', 'presupuestado', 'aprobado'].includes(String(item.estado).toLowerCase())
        ? { ...item, nombre: normalizarNombreOdontograma(item) || 'Tratamiento', estado: 'realizado' }
        : item
    )));

    setMensajeConfirmacion(`Se marcaron ${pendientes.length} procedimiento(s) como realizados.`);
    setShowConfirmModal(true);
    setTimeout(() => setShowConfirmModal(false), 2500);
  }, [procedimientos, toastInfo]);

  const actualizarProcedimiento = (id: string, campo: keyof Procedimiento, valor: any) => {
    if (campo === 'costo' && Number(valor) < 0) valor = 0;
    setProcedimientos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const importPersistentProcedure = useCallback((item: any) => {
    setProcedimientos((prev) => {
      const nextKey = buildProcedureStableKey(item, selectedPatient?.id);
      if (prev.some((procedure) => buildProcedureStableKey({ ...procedure, costoMaterial: procedure.costoMaterial ?? 0 }, selectedPatient?.id) === nextKey)) {
        return prev;
      }
      return [
        ...prev,
        {
          ...item,
          id: `plan_${crypto.randomUUID()}`,
          estado: item.estado === 'realizado' ? 'realizado' : 'aprobado',
          is_persistent: true,
        },
      ];
    });
    setActiveTab('procedimientos');
    // No mostrar toast ni alerta al cargar plan previo
  }, [selectedPatient?.id]);

  const pushToAgenda = useCallback((item: any) => {
    if (!selectedPatient?.id) return;

    setAgendaDraft({
      patientId: selectedPatient.id,
      patientName: `${selectedPatient.nombre || ''} ${selectedPatient.apellidos || ''}`.trim(),
      consultationType: item.consultationType || 'GENERAL',
      reason: item.nombre || 'Seguimiento clinico',
      durationMinutes: item.duracionEstimada || 60,
      source: 'general',
      sourceConsultationId: item.consultationId,
      sourceProcedureId: item.id,
      procedureLabel: item.nombre,
      notes: item.observaciones || item.cara || '',
    });
    setCurrentView('agenda');
    // toastInfo('Agenda pre-cargada con el tratamiento pendiente.'); // Eliminado: no mostrar notificación al abrir
    navigate('/');
  }, [navigate, selectedPatient, setAgendaDraft, setCurrentView, toastInfo]);

  // GUARDAR — Upsert idempotente con el sessionId generado al abrir la consulta
  // Nueva lógica robusta para guardar la consulta y el odontograma
  const handleGuardar = async () => {
    if (isSubmitting) return;
    if (!selectedPatient?.id) {
      toastError('No hay paciente seleccionado.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Generar código de consulta único
      const consultationCode = buildConsultationCode({
        consultationId: sessionId,
        consultationType: 'GENERAL',
        consultationDate: new Date().toISOString(),
      });
      // Validar y limpiar hallazgos antes de guardar
      const hallazgosLimpios = Array.isArray(hallazgosOdontograma)
        ? hallazgosOdontograma.map((h) => ({
            id: h.id,
            diente: h.diente,
            tipo: h.tipo,
            superficie: h.superficie,
            descripcion: h.descripcion,
            severidad: h.severidad,
            fechaRegistro: h.fechaRegistro,
            cie10: h.cie10,
            cdt: h.cdt,
            proceso: h.proceso,
          }))
        : [];
      // Preparar el objeto de sesión para guardar
      const sesionData = {
        id: sessionId,
        codigo_consulta: consultationCode,
        paciente_id: selectedPatient.id,
        tipo_consulta: 'GENERAL',
        hallazgos_odontograma: hallazgosLimpios,
        estado_odontograma: odontogramaState || initialData?.estado_odontograma || lastConsultation?.estado_odontograma || null,
        detalles_clinicos: attachConsultationCodeToDetails({
          motivo,
          motivo_categorizado: motivoSeleccionado,
          tags: motivoSeleccionado ? [motivoSeleccionado] : [],
          evolucion_clinica: evolutionText,
          examen_fisico: examenEstomatologico,
          dolor: {
            escala: evaluacionDolor.escala,
            detalles: {
              caracteristicas: evaluacionDolor.caracteristicas,
              desencadenantes: evaluacionDolor.desencadenantes,
              evolucion: evaluacionDolor.evolucion,
            },
          },
          plan_tratamiento: procedimientos.map((procedure) => ({
            ...procedure,
            is_persistent: procedure.is_persistent || ['sugerido', 'presupuestado', 'aprobado'].includes(String(procedure.estado).toLowerCase()),
          })),
          recetas,
          notas: estadoGeneral,
          diagnosticos_cie10: todosLosDiagnosticos,
          resumenes_containers: generalContainerSummaries,
          ultima_modificacion_containers: generalContainerLastModified,
          consentimiento_informado: consentimiento,
          workflow_summary: {
            antecedent_summary: antecedentSummary,
            pending_plan_count: persistentPlan.length,
            next_followup_days: persistentPlan.length > 0 ? 15 : 180,
            triage_stage: 'sesion_general',
            treatment_mode: 'consulta_general',
            next_consultation_reason: persistentPlan.length > 0 ? `Continuar ${persistentPlan[0].nombre}` : 'Control clinico segun evolucion',
            primary_treatment_label: procedimientos.find((procedure) => ['realizado', 'aprobado', 'presupuestado'].includes(String(procedure.estado).toLowerCase()))?.nombre || 'Valoracion general',
            closure_summary: currentGeneralClosureSummary,
            narrative_mode: generalContainerLogic.mode,
            continuity_status: generalContainerLogic.hasMeaningfulChanges ? 'con_cambios' : 'sin_cambios_relevantes',
            continuity_summary: generalContinuitySummary,
            container_changes: generalContainerLogic.changes,
            container_updated_at: generalContainerLogic.containerUpdatedAt,
            container_summaries: generalContainerSummaries,
            container_last_modified: generalContainerLastModified,
            container_state_status: generalContainerStateStatus,
            reference_consultation: generalContainerLogic.referenceConsultation,
          }
        }, consultationCode),
        tiempo_sesion: tiempo
      };

      if (onSave) {
        await onSave(sesionData);
      } else {
        // Upsert: si cae internet y se reenvía, no genera duplicados
        let { error } = await supabase
          .from('consultas_odontologicas')
          .upsert([sesionData], { onConflict: 'id' });

        if (error && shouldRetryWithoutConsultationCodeColumn(error)) {
          ({ error } = await supabase
            .from('consultas_odontologicas')
            .upsert([omitConsultationCodeColumn(sesionData)], { onConflict: 'id' }));
        }
        if (error) throw error;
      }

      setIsSaved(true);
      setSavedAt(new Date());
      // No mostrar toastSuccess aquí, solo exit confirm
      setShowExitConfirm(true);
    } catch (err: any) {
      console.error('Error al guardar consulta:', err);
      const message = err?.message || err?.error || JSON.stringify(err);
      toastError(`Error al guardar: ${message || 'Sin conexión con la base de datos.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => { array.includes(item) ? setArray(array.filter(i => i !== item)) : setArray([...array, item]); };

  const agregarDiagnosticoManual = (cie10: {codigo: string, nombre: string}) => {
    if (diagnosticosManuales.some(d => d.codigo === cie10.codigo)) return;
    setDiagnosticosManuales([...diagnosticosManuales, { id: `diag_${crypto.randomUUID()}`, codigo: cie10.codigo, nombre: cie10.nombre, tipo: 'principal' }]);
    setBusquedaCie10('');
  };

  const verificarSeguridadReceta = (medicamentoNuevo: string, dosisPropuesta: string): boolean => {
    setAlertaSeguridadReceta(null);
    if (!medicamentoNuevo.trim()) return true;

const edadPaciente = selectedPatient?.fecha_nacimiento ?
      new Date().getFullYear() - new Date(selectedPatient.fecha_nacimiento).getFullYear() : 30;

    if (edadPaciente < 12) {
      const isDosisAlta = dosisPropuesta.toLowerCase().includes('500') || dosisPropuesta.toLowerCase().includes('800') || medicamentoNuevo.toLowerCase().includes('500mg');
      const isAdultForm = dosisPropuesta.toLowerCase().includes('tableta') || dosisPropuesta.toLowerCase().includes('capsula');
      
      if (isDosisAlta || isAdultForm) {
        setAlertaSeguridadReceta(`RIESGO PEDIÁTRICO: El paciente tiene ${edadPaciente} años. Verifique la dosis en mg/kg. Las tabletas o dosis de 500mg están contraindicadas.`);
        return false;
      }
    }

    const alertas = (estadoGeneral.alertaMedica || '').toLowerCase();
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
      setRecetas([...recetas, {...nuevaReceta, id: `rec_${crypto.randomUUID()}`}]);
      setNuevaReceta({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
    }
  };

  // ── GENERADOR HTML PARA IMPRESIÓN ────────────────────────────────
  const generarHTMLImpresion = useCallback((tipo: 'receta' | 'presupuesto'): string => {
    const patientName = [selectedPatient?.nombre, selectedPatient?.apellidos].filter(Boolean).join(' ');
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const clinicName = 'EstDent — Clinica Odontologica';
    let bodyContent = '';

    if (tipo === 'receta') {
      bodyContent = recetas.length === 0
        ? '<p style="color:#888;text-align:center;padding:20px">No hay medicamentos prescritos.</p>'
        : recetas.map((r, i) => `
          <div class="med">
            <div class="med-num">${i + 1}</div>
            <div class="med-body">
              <div class="med-name">${r.medicamento}</div>
              <div class="med-detail">Dosis: <b>${r.dosis}</b> &bull; Frecuencia: <b>${r.frecuencia}</b> &bull; Duracion: <b>${r.duracion}</b></div>
              ${r.indicaciones ? `<div class="med-note">* ${r.indicaciones}</div>` : ''}
            </div>
          </div>`).join('');
    } else {
      const planActivo = procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado' || p.estado === 'presupuestado');
      const total = planActivo.reduce((s, p) => s + (Math.max(0, Number(p.costo) || 0)), 0);
      bodyContent = planActivo.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No hay procedimientos en el plan.</td></tr>'
        : planActivo.map(p => `<tr>
            <td>${p.nombre}</td>
            <td>${p.pieza ? `#${p.pieza}${p.cara ? ` &mdash; ${p.cara}` : ''}` : 'General'}</td>
            <td class="estado-${p.estado}">${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</td>
            <td style="text-align:right;font-weight:700">${p.costo > 0 ? formatCOP(p.costo) : '&mdash;'}</td>
          </tr>`).join('') +
          `<tr style="border-top:2px solid #0f172a">
            <td colspan="3" style="font-weight:800;font-size:14px;padding-top:12px">TOTAL</td>
            <td style="text-align:right;font-weight:900;font-size:14px;padding-top:12px">${formatCOP(total)}</td>
          </tr>`;
    }

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${tipo === 'receta' ? 'Receta Medica' : 'Presupuesto'} - ${patientName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;padding:40px;max-width:820px;margin:0 auto}
  @page{size:A4;margin:20mm}@media print{body{padding:0}}
  .header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #0071e3;margin-bottom:28px}
  .clinic-name{font-size:22px;font-weight:900;color:#0071e3;margin-bottom:4px}.clinic-sub{font-size:12px;color:#64748b}
  .doc-badge{background:#0071e3;color:#fff;font-size:13px;font-weight:800;padding:8px 18px;border-radius:8px;white-space:nowrap}
  .patient-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .field label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;display:block}.field p{font-size:14px;font-weight:700;color:#0f172a;margin-top:3px}
  .section-title{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
  .rx-badge{font-size:56px;font-weight:900;color:#0071e3;font-style:italic;line-height:1;margin-bottom:12px}
  .med{display:flex;gap:14px;padding:14px 0;border-bottom:1px dashed #e2e8f0;align-items:flex-start}.med:last-child{border-bottom:none}
  .med-num{width:30px;height:30px;background:#0071e3;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;margin-top:2px}
  .med-name{font-size:16px;font-weight:800;color:#0f172a;margin-bottom:5px}.med-detail{font-size:13px;color:#475569}.med-note{font-size:12px;color:#7c3aed;font-style:italic;margin-top:5px}
  .validity{margin-top:24px;font-size:12px;color:#94a3b8;font-style:italic;text-align:center;padding:10px;border:1px dashed #e2e8f0;border-radius:6px}
  table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0071e3;color:#fff;padding:11px 14px;text-align:left;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr:nth-child(even) td{background:#f8fafc}
  .estado-realizado{color:#059669;font-weight:700}.estado-aprobado{color:#0071e3;font-weight:700}.estado-presupuestado{color:#4338ca;font-weight:700}
  .footer{margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:80px}.sig-line{border-top:1px solid #0f172a;padding-top:8px;font-size:11px;color:#64748b;text-align:center}
</style></head><body>
<div class="header">
  <div><div class="clinic-name">${clinicName}</div><div class="clinic-sub">Generado el ${fecha}</div></div>
  <div class="doc-badge">${tipo === 'receta' ? 'RECETA MEDICA' : 'PRESUPUESTO DE TRATAMIENTO'}</div>
</div>
<div class="patient-box">
  <div class="field"><label>Paciente</label><p>${patientName}</p></div>
  <div class="field"><label>Documento</label><p>${selectedPatient?.cc || 'N/A'}</p></div>
  <div class="field"><label>Fecha de emision</label><p>${fecha}</p></div>
</div>
${tipo === 'receta'
  ? `<div class="rx-badge">Rx</div><div class="section-title">Medicamentos Prescritos</div>${bodyContent}<p class="validity">Valido por 30 dias a partir de la fecha de emision. No repetir sin nueva prescripcion medica.</p>`
  : `<div class="section-title">Plan de Tratamiento</div><table><thead><tr><th>Procedimiento</th><th>Ubicacion</th><th>Estado</th><th style="text-align:right">Valor</th></tr></thead><tbody>${bodyContent}</tbody></table>`
}
<div class="footer">
  <div class="sig-line">Firma del Odontologo Tratante</div>
  <div class="sig-line">Sello / Tarjeta Profesional</div>
</div></body></html>`;
  }, [selectedPatient, recetas, procedimientos]);

  const handleImprimir = useCallback((tipo: 'receta' | 'presupuesto') => {
    const html = generarHTMLImpresion(tipo);
    const win = window.open('', '_blank', 'width=920,height=720,scrollbars=yes');
    if (!win) { toastError('El navegador bloqueo la ventana emergente. Permite los pop-ups para imprimir.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }, [generarHTMLImpresion, toastError]);

  const handleWhatsApp = useCallback((tipo: 'receta' | 'presupuesto') => {
    const patientName = [selectedPatient?.nombre, selectedPatient?.apellidos].filter(Boolean).join(' ');
    const fecha = new Date().toLocaleDateString('es-CO');
    const lines: string[] = [];

    if (tipo === 'receta') {
      lines.push('*RECETA MEDICA \u2014 EstDent*');
      lines.push(`Paciente: *${patientName}*  |  CC: ${selectedPatient?.cc || 'N/A'}`);
      lines.push(`Fecha: ${fecha}`);
      lines.push('');
      lines.push('*MEDICAMENTOS:*');
      recetas.forEach((r, i) => {
        lines.push(`${i + 1}. *${r.medicamento}*`);
        lines.push(`   ${r.dosis} \u2014 ${r.frecuencia} durante ${r.duracion}`);
        if (r.indicaciones) lines.push(`   _${r.indicaciones}_`);
      });
      lines.push('');
      lines.push('_Valido 30 dias. No repetir sin nueva prescripcion._');
    } else {
      lines.push('*PRESUPUESTO DE TRATAMIENTO \u2014 EstDent*');
      lines.push(`Paciente: *${patientName}*  |  Fecha: ${fecha}`);
      lines.push('');
      lines.push('*PLAN DE TRATAMIENTO:*');
      const planActivo = procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado' || p.estado === 'presupuestado');
      planActivo.forEach((p, i) => {
        const ubicacion = p.pieza ? `pieza #${p.pieza}` : 'general';
        const valor = p.costo > 0 ? ` \u2014 ${formatCOP(p.costo)}` : '';
        lines.push(`${i + 1}. ${p.nombre} (${ubicacion})${valor}`);
      });
      const total = planActivo.reduce((s, p) => s + (Math.max(0, Number(p.costo) || 0)), 0);
      if (total > 0) { lines.push(''); lines.push(`*Total: ${formatCOP(total)}*`); }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }, [selectedPatient, recetas, procedimientos]);

  if (!selectedPatient) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.background }}>Cargando paciente...</div>;

  const patientCode = formatPatientSerial(selectedPatient.id || '');
  const initials = `${selectedPatient.nombre?.[0] || '?'}${selectedPatient.apellidos?.[0] || ''}`.toUpperCase();
  const pendientesEjecutablesCount = procedimientos.filter((item) => ['sugerido', 'presupuestado', 'aprobado'].includes(String(item.estado).toLowerCase())).length;

  const carasDisponibles = esDienteAnterior(nuevoProcedimiento.pieza || '') ? CARAS_ANTERIORES : CARAS_POSTERIORES;
  const clinicalAlerts = Array.from(new Set([
    selectedPatient?.clinical_history?.s4_penicilina ? 'Alergico a penicilina' : '',
    selectedPatient?.clinical_history?.s2_hipertension === 'Si' ? 'Hipertenso' : '',
    selectedPatient?.clinical_history?.s2_diabetes === 'Si' ? 'Diabetes' : '',
    selectedPatient?.clinical_history?.s5cv_marcapaso === 'Si' ? 'Portador de marcapasos' : '',
    selectedPatient?.clinical_history?.s4_latex ? 'Alergia a latex' : '',
    estadoGeneral.alertaMedica?.trim() || '',
  ].filter(Boolean)));

  return (
    <>
    <ToastContainer toasts={toasts} onClose={removeToast} />
    <ConfirmDialog
      isOpen={showExitConfirm}
      title="Consulta guardada"
      message="La consulta fue guardada exitosamente. ¿Desea finalizar la sesión clínica?"
      confirmLabel="Finalizar sesión"
      cancelLabel="Seguir editando"
      variant="primary"
      onConfirm={() => { setShowExitConfirm(false); onExit(); }}
      onCancel={() => { setShowExitConfirm(false); setIsSaved(false); }}
    />
    <div className="gc" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #f3f6fa 0%, #edf2f7 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        .gc {
          --gc-border-width: 1px;
          --gc-border-color: #dbe4ef;
        }
        .gc, .gc * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        
        /* Animations */
        @keyframes gcFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gcSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes gcPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes gcShake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        @keyframes gcCheckPop { 0% { transform: scale(0.8); } 100% { transform: scale(1); } }
        
        .gc-fade-in { animation: gcFadeIn 0.4s cubic-bezier(.4,0,.2,1) both; }
        .gc-slide-in { animation: gcSlideIn 0.3s ease both; }
        .gc-pulse { animation: gcPulse 2s infinite; }
        .gc-shake { animation: gcShake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        
        .gc-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          align-items: stretch;
        }
        .gc-grid-2 > * {
          min-width: 0;
          width: 100%;
        }
        @media (max-width: 900px) { .gc-grid-2 { grid-template-columns: 1fr; } }

        .gc-shell {
          width: calc(100% - 30px);
          max-width: none;
          margin-left: auto;
          margin-right: auto;
        }
        .gc-content-shell {
          width: 100%;
          max-width: none;
          margin-left: auto;
          margin-right: auto;
        }
        .gc-work-area {
          scrollbar-gutter: stable;
        }
        .gc-uniform-inset {
          padding-left: 0;
          padding-right: 0;
          box-sizing: border-box;
        }
        @media (max-width: 900px) {
          .gc-shell {
            width: calc(100% - 24px);
          }
          .gc-uniform-inset {
            padding-left: 0;
            padding-right: 0;
          }
        }
        .gc-top-stack {
          position: sticky;
          top: 0;
          z-index: 40;
          margin-top: 0;
          padding: 6px 0 8px;
          background: linear-gradient(180deg, rgba(243,246,250,0.98) 0%, rgba(243,246,250,0.9) 100%);
          backdrop-filter: blur(10px);
        }
        .gc-top-header {
          background: #ffffff;
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
        }
        .gc-header-alert-strip {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 18px;
          background: rgba(127, 29, 29, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 14px;
        }
        .gc-header-alert-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #7f1d1d;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .02em;
          box-shadow: 0 6px 14px rgba(127,29,29,.2);
        }
        .gc-top-nav {
          margin-top: 6px;
          border-radius: 12px;
        }
        .gc-action-chip {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid #dbe4ef;
          background: #fff;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .gc-card {
          --gc-accent: #64748b;
          --gc-accent-soft: #f8fafc;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
          transition: all .25s cubic-bezier(.4,0,.2,1);
          width: 100%;
          min-width: 0;
          height: 100%;
          align-self: stretch;
          position: relative;
          overflow: hidden;
        }
        .gc-card::before {
          content: none;
        }
        .gc-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.1); transform: translateY(-1px); }

        .gc-card--vital { --gc-accent: #64748b; --gc-accent-soft: #f8fafc; }
        .gc-card--reason { --gc-accent: #475569; --gc-accent-soft: #f8fafc; }
        .gc-card--pain { --gc-accent: #334155; --gc-accent-soft: #f8fafc; }
        .gc-card--exam { --gc-accent: #64748b; --gc-accent-soft: #f8fafc; }
        .gc-card--diagnosis { --gc-accent: #475569; --gc-accent-soft: #f8fafc; }
        .gc-card--plan { --gc-accent: #334155; --gc-accent-soft: #f8fafc; }
        .gc-card--rx { --gc-accent: #64748b; --gc-accent-soft: #f8fafc; }
        .gc-card--rx-current { --gc-accent: #475569; --gc-accent-soft: #f8fafc; }
        
        .gc-card-title {
          display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800;
          color: #1e293b; margin: -20px -20px 18px -20px; border: none;
          padding: 11px 16px; letter-spacing: .01em;
          border-radius: 12px 12px 0 0; background: #f8fafc; border-bottom: 1px solid #e8ecef;
        }
        
        .gc-form-group { margin-bottom: 16px; }
        .gc-label { 
          display: block; font-size: 11px; font-weight: 700; color: ${COLORS.textLight}; 
          text-transform: uppercase; margin-bottom: 6px; letter-spacing: .08em; 
        }
        .gc-input, .gc-select {
          width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0;
          border-radius: 10px; font-size: 14px; font-family: inherit;
          transition: all .2s cubic-bezier(.4,0,.2,1); background: #fff;
          color: ${COLORS.text}; box-sizing: border-box;
        }
        .gc-input:focus, .gc-select:focus {
          outline: none; border-color: #29b2e8; background: #fff;
          box-shadow: 0 0 0 3px rgba(41,178,232,.12); transform: translateY(-1px);
        }
        select.gc-input {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 38px;
          background-image:
            linear-gradient(45deg, transparent 50%, #64748b 50%),
            linear-gradient(135deg, #64748b 50%, transparent 50%);
          background-position:
            calc(100% - 18px) calc(50% - 2px),
            calc(100% - 12px) calc(50% - 2px);
          background-size: 6px 6px, 6px 6px;
          background-repeat: no-repeat;
        }
        select.gc-input option {
          background: #ffffff;
          color: #0f172a;
        }

        .gc-choice-chip {
          padding: 8px 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          transition: all .2s ease;
          border: 1px solid #d7e1ec;
          background: #f8fafd;
          color: #334155;
        }
        .gc-choice-chip:hover {
          background: #f1f5f9;
          border-color: #c5d2e1;
          transform: translateY(-1px);
        }
        .gc-choice-chip.active {
          background: #29b2e8;
          border-color: #29b2e8;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(41,178,232,.25);
        }

        .gc-check-item {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          cursor: pointer;
          color: #475569;
          font-weight: 600;
          transition: color .2s ease;
        }
        .gc-check-item:hover { color: #0f172a; }
        .gc-check-input {
          width: 18px;
          height: 18px;
          margin: 0;
          appearance: none;
          -webkit-appearance: none;
          border: 1.5px solid #9aa9bb;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          display: inline-grid;
          place-content: center;
          transition: all .2s ease;
        }
        .gc-check-input::after {
          content: '';
          width: 9px;
          height: 5px;
          border-left: 2px solid #fff;
          border-bottom: 2px solid #fff;
          transform: rotate(-45deg) scale(0);
          transition: transform .18s ease;
          margin-top: -1px;
        }
        .gc-check-input:checked {
          background: #29b2e8;
          border-color: #29b2e8;
          box-shadow: 0 3px 9px rgba(41,178,232,.35);
          animation: gcCheckPop .14s ease;
        }
        .gc-check-input:checked::after {
          transform: rotate(-45deg) scale(1);
        }

        .gc-tab-pane {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .gc-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
          overflow: hidden;
        }
        .gc-panel--narrative {
          border: 1px solid #dbe4ef;
          box-shadow: 0 12px 28px rgba(15,23,42,.1), 0 3px 10px rgba(15,23,42,.05);
        }
        .gc-panel-inner {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 16px;
          box-shadow: none;
        }
        .gc-table-shell {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
          background: #ffffff;
        }
        .gc-modal-shell {
          background: #ffffff;
          border: none;
          border-radius: 20px;
          box-shadow: 0 24px 42px rgba(15,23,42,.2);
        }
        
        .gc-nav {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
          position: relative;
          overflow-x: auto;
        }
        .gc-tab-btn {
          padding: 9px 15px;
          background: transparent;
          border: none;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all .2s ease;
          display: inline-flex;
          align-items: center;
          text-transform: uppercase;
          letter-spacing: .06em;
          position: relative;
          white-space: nowrap;
          border-radius: 9px;
          margin: 4px 3px;
        }
        .gc-tab-btn + .gc-tab-btn::before {
          content: none;
        }
        .gc-tab-btn:hover {
          color: #374151;
          background: #f8f9fa;
        }
        .gc-tab-btn.active {
          color: #ffffff;
          background: #64748b;
          box-shadow: 0 4px 12px rgba(100,116,139,.24);
        }
        .gc-tab-badge {
          margin-left: 6px;
          background: rgba(255,255,255,.26);
          color: #fff;
          border-radius: 999px;
          padding: 1px 7px;
          font-size: 9px;
          font-weight: 800;
          line-height: 1.2;
        }
        
        .gc-btn-primary { 
          display: flex; align-items: center; gap: 6px; padding: 10px 16px; 
          background: ${COLORS.primary}; color: #fff; border: none; border-radius: 10px; 
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s cubic-bezier(.34,1.56,.64,1); 
          box-shadow: 0 4px 12px rgba(0,113,227,.25); 
        }
        .gc-btn-primary:hover { background: ${COLORS.primaryDark}; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,113,227,.35); }
        
        .gc-btn-badge { 
          padding: 6px 14px; background: #fff; border: 1px solid ${COLORS.border}; 
          border-radius: 20px; font-size: 12px; font-weight: 600; color: ${COLORS.text}; 
          cursor: pointer; white-space: nowrap; transition: all .2s cubic-bezier(.4,0,.2,1); 
          display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,.03); 
        }
        .gc-btn-badge:hover { border-color: ${COLORS.primary}; color: ${COLORS.primary}; background: ${COLORS.primaryLight}; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,113,227,.15); }
        
        .gc-alert { 
          padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px; 
          font-size: 13px; font-weight: 600; margin-bottom: 16px; 
        }
        .gc-alert.error { background: ${COLORS.errorLight}; color: ${COLORS.error}; border: 1px solid rgba(239,68,68,.2); }
        .gc-alert.success { background: ${COLORS.successLight}; color: ${COLORS.success}; border: 1px solid rgba(16,185,129,.2); }
        .gc-alert.warning { background: ${COLORS.warningLight}; color: ${COLORS.warning}; border: 1px solid rgba(245,158,11,.2); }
      `}</style>

      <div className="no-print gc-shell gc-uniform-inset gc-top-stack gc-fade-in">
      {/* HEADER */}
      <header className="gc-top-header">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          
          {/* Cancelar — pastel red */}
          <button 
            onClick={() => setShowCancelModal(true)} 
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', background:'#fef2f2', border:'1.5px solid #fecdd3', borderRadius:9, color:'#e11d48', cursor:'pointer', transition:'all .15s', fontWeight:700, fontSize:12, fontFamily:'Inter,system-ui,sans-serif', boxShadow:'0 2px 6px rgba(225,29,72,.08)' }} 
            onMouseOver={e => { e.currentTarget.style.background='#fecdd3'; e.currentTarget.style.borderColor='#e11d48'; }} 
            onMouseOut={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.borderColor='#fecdd3'; }}
          >
            <ChevronLeft size={14} /> Cancelar
          </button>

          {/* Divider */}
          <div style={{ width:1, height:30, background:'#e2e8f0' }} />
          
          {/* Patient chip — neumorphic gray */}
          <div style={{ display:'flex', gap:11, alignItems:'center', padding:'6px 14px 6px 6px', background:'#edf1f5', borderRadius:12, border:'none', boxShadow:'0 6px 16px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.04)' }}>
            {/* Avatar — same dashboard/radar style */}
            <div style={{ width:48, height:48, borderRadius:13, background:'#adb5bd', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, fontFamily:'Inter,system-ui,sans-serif', boxShadow:'0 4px 14px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.1)', letterSpacing:'.02em', flexShrink:0 }}>
              {initials}
            </div>
            <div>
              <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, lineHeight:1.15, fontFamily:'Inter,system-ui,sans-serif', display:'flex', alignItems:'center', gap:6 }}>
                {selectedPatient.nombre} {selectedPatient.apellidos}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:2 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#64748b' }}><FileSignature size={10} style={{color:'#94a3b8'}} /> ID {patientCode}</span>
                <span style={{ color:'#cbd5e1' }}>·</span>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#64748b' }}><User size={10} style={{color:'#94a3b8'}} /> {selectedPatient.edad || '--'} años</span>
                <span style={{ color:'#cbd5e1' }}>·</span>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#64748b' }}><Heart size={10} style={{color:'#94a3b8'}} /> RH {formatPatientRh(selectedPatient.tipo_sangre_rh, '--')}</span>
                <span style={{ color:'#cbd5e1' }}>·</span>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#475569' }}><FileSignature size={10} style={{color:'#94a3b8'}} /> Consulta General</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Session timer */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#ffffff', borderRadius:10, border:'none', boxShadow:'0 6px 16px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.04)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px rgba(16,185,129,.4)' }} />
            <div style={{ display:'flex', flexDirection:'column' }}>
              <span style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.08em' }}>Sesión</span>
              <span style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:'#1e293b', lineHeight:1 }}>{formatTiempo()}</span>
            </div>
          </div>
          
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            {isLocked ? (
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 13px', background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:9, fontSize:12, fontWeight:700, color:'#92400e' }}>
                  <Lock size={14} /> Solo Lectura
                </div>
                <button
                  onClick={() => setShowNotaModal(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 13px', background:'#f1f5f9', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, fontWeight:700, color:'#475569', cursor:'pointer', fontFamily:'Inter,system-ui,sans-serif' }}
                >
                  <FileText size={13} style={{color:'#64748b'}} /> Nota Aclaratoria
                </button>
              </div>
            ) : (
              <button
                onClick={handleGuardar}
                disabled={isSubmitting}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
                  background: isSaved ? '#10b981' : '#29b2e8',
                  border:'none', borderRadius:9, fontSize:13, fontWeight:700, color:'#fff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily:'Inter,system-ui,sans-serif',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: isSaved ? '0 4px 14px rgba(16,185,129,.25)' : '0 4px 14px rgba(41,178,232,.25)',
                  transition:'all .15s',
                }}
              >
                {isSubmitting ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} /></> : (isSaved ? <CheckCircle size={15} /> : <Save size={15} />)}
                {isSubmitting ? ' Guardando...' : (isSaved ? ' Guardado' : ' Guardar')}
              </button>
            )}
            {isSaved && !isLocked && (
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#94a3b8', fontWeight:600 }}>
                <Clock size={10} /> Bloqueo en {minutosRestantes} min
              </div>
            )}
          </div>
        </div>
      </header>

      {clinicalAlerts.length > 0 && (
        <div className="gc-header-alert-strip">
          {clinicalAlerts.map((alert) => (
            <span key={alert} className="gc-header-alert-chip">
              <AlertTriangle size={14} /> {alert}
            </span>
          ))}
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN */}
      <div className="gc-nav gc-top-nav" style={{ display:'flex', width:'100%', padding:'0 6px', gap:0 }}>
        <button className={`gc-tab-btn ${activeTab === 'anamnesis' ? 'active' : ''}`} onClick={() => setActiveTab('anamnesis')}><ClipboardList size={14} /> Valoración Clínica</button>
        <button className={`gc-tab-btn ${activeTab === 'odontograma' ? 'active' : ''}`} onClick={() => setActiveTab('odontograma')}><Scan size={14} /> Odontograma {hallazgosOdontograma.length > 0 && <span className="gc-tab-badge">{hallazgosOdontograma.length}</span>}</button>
        <button className={`gc-tab-btn ${activeTab === 'procedimientos' ? 'active' : ''}`} onClick={() => setActiveTab('procedimientos')}><Scissors size={14} /> Procedimientos {procedimientosSugeridos.length > 0 && <span className="gc-tab-badge">{procedimientosSugeridos.length}</span>}</button>
        <button className={`gc-tab-btn ${activeTab === 'recetas' ? 'active' : ''}`} onClick={() => setActiveTab('recetas')}><Pill size={14} /> Recetas</button>
      </div>
      </div>

      {/* BANNERS DE BLOQUEO LEGAL */}
      {isSaved && !isLocked && minutosRestantes <= 10 && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
          <Clock size={14} /> Esta consulta se bloqueara en {minutosRestantes} minuto{minutosRestantes !== 1 ? 's' : ''} (Res. 1995 / HIPAA).
        </div>
      )}
      {isLocked && (
        <div style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#92400e', fontWeight: 700 }}>
          <Lock size={16} /> HISTORIAL BLOQUEADO — Res. 1995 / HIPAA: Transcurrieron 30 minutos desde el guardado. Modo Solo Lectura.
          <button
            onClick={() => setShowNotaModal(true)}
            style={{ marginLeft: 'auto', padding: '6px 16px', background: '#92400e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={12} /> Agregar Nota Aclaratoria
          </button>
        </div>
      )}

      {/* ÁREA DE TRABAJO */}
      <div className="no-print gc-work-area" style={{ flex: 1, overflow: 'auto', padding: '26px 15px 34px', background: 'transparent', position: 'relative' }}>
        {isLocked && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 20, cursor: 'not-allowed', background: 'rgba(248,250,252,0.3)' }}
            onClick={() => toastWarning('Historial clinico bloqueado (Res. 1995). Puede agregar una Nota Aclaratoria.')}
          />
        )}
        <div className="gc-content-shell gc-uniform-inset">

          {/* ── BANNER CARRY-OVER ──────────────────────────────────────── */}
          {showCarryOverBanner && carryOverPending.length > 0 && (
            <div style={{ marginBottom: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, boxShadow: '0 4px 16px rgba(245,158,11,0.1)' }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>📋</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                  {carryOverPending.length} tratamiento{carryOverPending.length > 1 ? 's' : ''} pendiente{carryOverPending.length > 1 ? 's' : ''} de la última visita
                </div>
                <div style={{ fontSize: 13, color: '#78350f', marginBottom: 10 }}>
                  {lastConsultation?.created_at && (
                    <>Última consulta: <strong>{new Date(lastConsultation.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>. </>
                  )}
                  Los siguientes procedimientos fueron presupuestados pero no se marcaron como realizados:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {carryOverPending.map((p, i) => (
                    <span key={i} style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                      {p.pieza ? `#${p.pieza} — ` : ''}{p.nombre}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setProcedimientos(prev => [...prev, ...carryOverPending]);
                      setShowCarryOverBanner(false);
                      toastSuccess(`${carryOverPending.length} tratamiento(s) migrado(s) al plan de hoy.`);
                    }}
                    style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✅ Importar al plan de hoy
                  </button>
                  <button
                    onClick={() => setShowCarryOverBanner(false)}
                    style={{ padding: '8px 14px', background: 'transparent', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ANAMNESIS */}
          <div style={getPanelStyle(activeTab === 'anamnesis')}>
            <div className="gc-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="gc-grid-2">
                <div className="gc-card gc-card--reason">
                  <h3 className="gc-card-title"><ClipboardList size={18} /> Motivo de Consulta de Hoy</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {[
                      { id: 'dolor', label: 'Dolor / Molestia', icon: AlertTriangle },
                      { id: 'control', label: 'Control Rutina', icon: CheckCircle },
                      { id: 'caries', label: 'Sospecha de Caries', icon: Search },
                      { id: 'fractura', label: 'Fractura Dental', icon: ShieldAlert },
                      { id: 'periodontal', label: 'Control Periodontal', icon: Activity },
                      { id: 'estetica', label: 'Estética', icon: Eye },
                      { id: 'trauma', label: 'Traumatismo', icon: Zap },
                      { id: 'protesis', label: 'Problema Prótesis', icon: Bone },
                      { id: 'otro', label: 'Otro', icon: FileText },
                    ].map(btn => {
                      const isSelected = motivoSeleccionado === btn.id;
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.id}
                          className={`gc-choice-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => setMotivoSeleccionado((prev) => (prev === btn.id ? '' : btn.id))}
                        >
                          <Icon size={14} /> {btn.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="gc-form-group"><label>Relato del Paciente</label><textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Sensibilidad al frío..." className="gc-input" /></div>
                  <div className="gc-form-group" style={{ marginBottom: 0 }}><label>Evolución clínica</label><textarea rows={2} value={evaluacionDolor.evolucion} onChange={e => setEvaluacionDolor({...evaluacionDolor, evolucion: e.target.value})} placeholder="Ej. Inició hace 3 días..." className="gc-input" /></div>
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fbff', color: '#1e3a8a', fontSize: 12, fontWeight: 600 }}>
                    Motivo categorizado: {motivoSeleccionadoLabel || 'No seleccionado'}
                  </div>
                </div>

                <div className="gc-card gc-card--pain">
                  <h3 className="gc-card-title" style={{ color: evaluacionDolor.escala > 6 ? COLORS.error : COLORS.text }}><Activity size={18} /> Escala y Análisis del Dolor</h3>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Tipo de Dolor</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{['Punzante', 'Sordo / Continuo', 'Irradiado', 'Pulsátil'].map(tipo => ( <label key={tipo} className="gc-check-item"><input className="gc-check-input" type="checkbox" checked={evaluacionDolor.caracteristicas.includes(tipo)} onChange={() => toggleArrayItem(evaluacionDolor.caracteristicas, (arr) => setEvaluacionDolor({...evaluacionDolor, caracteristicas: arr}), tipo)} /> {tipo}</label> ))}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Desencadenantes</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{['Al Frío', 'Al Calor', 'Al Masticar', 'Espontáneo / Nocturno'].map(tipo => ( <label key={tipo} className="gc-check-item"><input className="gc-check-input" type="checkbox" checked={evaluacionDolor.desencadenantes.includes(tipo)} onChange={() => toggleArrayItem(evaluacionDolor.desencadenantes, (arr) => setEvaluacionDolor({...evaluacionDolor, desencadenantes: arr}), tipo)} /> {tipo}</label> ))}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gc-card gc-card--vital gc-fade-in">
                <h3 className="gc-card-title" style={{ color: COLORS.primaryDark }}><Activity size={20} /> Condición General en Consulta</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px' }}>
                  <div className="gc-form-group">
                    <label>Actitud del Paciente</label>
                    <select className="gc-input" value={estadoGeneral.actitud} onChange={e => setEstadoGeneral({...estadoGeneral, actitud: e.target.value})}>
                      <option value="Colaborador">Colaborador / Tranquilo</option>
                      <option value="Ansioso">Ansioso / Temeroso</option>
                      <option value="Poco colaborador">Poco colaborador</option>
                      <option value="Dolor agudo">Con dolor agudo</option>
                    </select>
                  </div>
                  <div className="gc-form-group">
                    <label>Higiene Oral Observada</label>
                    <select className="gc-input" value={estadoGeneral.higieneOral} onChange={e => setEstadoGeneral({...estadoGeneral, higieneOral: e.target.value})}>
                      <option value="Buena">Buena (Sin placa evidente)</option>
                      <option value="Regular">Regular (Placa localizada)</option>
                      <option value="Mala">Mala (Placa generalizada / Cálculo)</option>
                    </select>
                  </div>
                  <div className="gc-form-group">
                    <label style={{ color: estadoGeneral.alertaMedica ? COLORS.error : COLORS.textLight }}>Alerta / Riesgo Médico Rápido</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className="gc-input" 
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

                  <div className="gc-form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                    <label>Descripción clínica editable</label>
                    <textarea
                      rows={2}
                      className="gc-input"
                      placeholder="Describe hallazgos clínicos de higiene, tejidos blandos y recomendaciones de esta sesión..."
                      value={estadoGeneral.descripcionClinica}
                      onChange={e => setEstadoGeneral({ ...estadoGeneral, descripcionClinica: e.target.value })}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>
                      Este texto alimenta el resumen técnico automático y la narrativa clínica del odontograma.
                    </p>
                  </div>
                </div>
              </div>

              <div className="gc-grid-2">
                <div className="gc-card gc-card--exam">
                  <h3 className="gc-card-title"><Microscope size={18} /> Examen Estomatológico (Tejidos Blandos y ATM)</h3>
                  <div className="gc-form-group"><label>Articulación Temporomandibular (ATM)</label><select className="gc-input" value={examenEstomatologico.atm} onChange={e => setExamenEstomatologico({...examenEstomatologico, atm: e.target.value})}><option value="Sin alteraciones">Sin alteraciones aparentes</option><option value="Chasquido articular">Chasquido articular</option><option value="Dolor a la palpacion">Dolor a la palpación</option><option value="Apertura limitada">Apertura limitada (&lt;40mm)</option><option value="Desviacion">Desviación en apertura/cierre</option></select></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="gc-form-group"><label>Labios</label><select className="gc-input" value={examenEstomatologico.labios} onChange={e => setExamenEstomatologico({...examenEstomatologico, labios: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Resequedad / Fisuras">Resequedad / Fisuras</option><option value="Lesion ulcerosa">Lesión ulcerosa</option><option value="Aumento de volumen">Aumento de volumen</option></select></div>
                    <div className="gc-form-group"><label>Carrillos / Mucosa Yugal</label><select className="gc-input" value={examenEstomatologico.carrillos} onChange={e => setExamenEstomatologico({...examenEstomatologico, carrillos: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Linea alba prominente">Línea alba prominente</option><option value="Mordisqueo">Mordisqueo</option><option value="Eritema">Eritema / Inflamación</option></select></div>
                    <div className="gc-form-group"><label>Lengua</label><select className="gc-input" value={examenEstomatologico.lengua} onChange={e => setExamenEstomatologico({...examenEstomatologico, lengua: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Saburral">Saburral</option><option value="Fisurada">Fisurada</option><option value="Geografica">Geográfica</option></select></div>
                    <div className="gc-form-group"><label>Paladar</label><select className="gc-input" value={examenEstomatologico.paladar} onChange={e => setExamenEstomatologico({...examenEstomatologico, paladar: e.target.value})}><option value="Sin alteraciones">Sin alteraciones</option><option value="Torus palatino">Torus palatino</option><option value="Estomatitis">Estomatitis protésica</option></select></div>
                  </div>
                  <div className="gc-form-group"><label>Piso de boca y Encías</label><select className="gc-input" value={examenEstomatologico.encias} onChange={e => setExamenEstomatologico({...examenEstomatologico, encias: e.target.value})}><option value="Sin alteraciones">Sin alteraciones (Rosa coral, firme)</option><option value="Gingivitis leve">Gingivitis leve (Eritema marginal)</option><option value="Gingivitis severa">Gingivitis severa (Sangrado espontáneo)</option><option value="Retraccion gingival">Retracción gingival localizada/general</option><option value="Torus mandibular">Torus mandibular</option></select></div>
                  <div className="gc-form-group" style={{ marginBottom: 0 }}><label>Hallazgos adicionales</label><textarea rows={2} value={examenEstomatologico.observaciones} onChange={e => setExamenEstomatologico({...examenEstomatologico, observaciones: e.target.value})} placeholder="Ej. Se observa lesión blanquecina no desprendible..." className="gc-input" /></div>
                </div>

                <div className="gc-card gc-card--diagnosis" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="gc-card-title"><BookOpen size={18} /> Impresión Diagnóstica y CIE-10</h3>
                  <div className="gc-panel-inner" style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Agregar Diagnóstico Manual</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} color={COLORS.textLight} style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input type="text" className="gc-input" placeholder="Buscar código o enfermedad..." style={{ paddingLeft: '40px' }} value={busquedaCie10} onChange={(e) => setBusquedaCie10(e.target.value)} />
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
          </div>

          {/* TAB 2: ODONTOGRAMA */}
          <div style={getPanelStyle(activeTab === 'odontograma')}>
            <div className="gc-fade-in gc-tab-pane">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {lastConsultation?.created_at && (
                  <button onClick={() => setActiveTab('anamnesis')} style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, fontWeight: 800, color: '#334155', cursor: 'pointer' }}>
                    Base previa · {new Date(lastConsultation.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </button>
                )}
                {lastConsultation?.detalles_clinicos?.workflow_summary?.primary_treatment_label && (
                  <button onClick={() => setActiveTab('procedimientos')} style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, fontWeight: 800, color: '#334155', cursor: 'pointer' }}>
                    Tratamiento previo · {lastConsultation.detalles_clinicos.workflow_summary.primary_treatment_label}
                  </button>
                )}
                {lastConsultation?.hallazgos_odontograma?.length > 0 && (
                  <button onClick={() => setActiveTab('odontograma')} style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: 11, fontWeight: 800, color: '#1d4ed8', cursor: 'pointer' }}>
                    Historial de marcas · {lastConsultation.hallazgos_odontograma.length}
                  </button>
                )}
              </div>
              <GeneralOdontogram
                key={`general-odonto-${hasInitialConsultationSeed ? initialData?.id || initialData?.created_at || 'seeded' : lastConsultation?.id || 'fresh'}`}
                onHistoryChange={handleOdontogramaSync}
                onChange={handleOdontogramaSync}
                onUpdate={handleOdontogramaSync}
                value={hallazgosOdontograma}
                birthDate={selectedPatient?.fecha_nacimiento}
                initialState={hasInitialConsultationSeed ? initialData?.estado_odontograma || undefined : odontogramaState || lastConsultation?.estado_odontograma || undefined}
                previousEstado={!hasInitialConsultationSeed ? lastConsultation?.estado_odontograma : undefined}
                previousHallazgos={lastConsultation?.hallazgos_odontograma}
              />

              <div className="gc-card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
                <div className="gc-card-title" style={{ margin: 0, borderRadius: '12px 12px 0 0', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} /> Informe clínico y resumen técnico
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isDocumentEditing ? (
                      <>
                        <button
                          onClick={() => { hasUserEditedNarrative.current = false; setEvolutionText(narrativaClinicaSugerida); }}
                          style={{ padding: '5px 12px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          ↺ Regenerar
                        </button>
                        <button
                          onClick={() => setIsDocumentEditing(false)}
                          style={{ padding: '5px 12px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <FileText size={12} /> Vista
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (!evolutionText) setEvolutionText(narrativaClinicaSugerida);
                          setIsDocumentEditing(true);
                        }}
                        style={{ padding: '5px 12px', border: '1px solid #e2e8f0', background: '#fff', color: '#374151', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                {isDocumentEditing && (
                  <div style={{ padding: '16px 20px 0' }}>
                    <textarea
                      value={evolutionText || narrativaClinicaSugerida}
                      onChange={e => { hasUserEditedNarrative.current = true; setEvolutionText(e.target.value); }}
                      style={{
                        width: '100%',
                        minHeight: 580,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: 13.5,
                        lineHeight: 1.85,
                        color: '#1f2937',
                        padding: '20px 24px',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: 10,
                        resize: 'vertical',
                        background: '#f8fbff',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {!isDocumentEditing && (
                  <div style={{ padding: '16px 20px 0' }}>
                    <div style={{
                      padding: '28px 34px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                      {(evolutionText || narrativaClinicaSugerida).split('\n\n').map((bloque, bIdx) => {
                        const lineas = bloque.split('\n');
                        if (!lineas.length || !lineas[0]) return null;
                        const primerLinea = lineas[0];
                        if (bIdx === 0) {
                          return (
                            <div key={bIdx} style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, color: '#0f172a', letterSpacing: '0.02em', paddingBottom: 18, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
                              {primerLinea}
                            </div>
                          );
                        }
                        return (
                          <div key={bIdx} style={{ marginBottom: 22 }}>
                            <div style={{ fontWeight: 800, fontSize: 11.5, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 5, borderBottom: '1.5px solid #e8ecf2' }}>
                              {primerLinea}
                            </div>
                            {lineas.slice(1).map((linea, lIdx) => {
                              if (!linea.trim()) return <div key={lIdx} style={{ height: 4 }} />;
                              if (linea.trimStart().startsWith('•')) {
                                return (
                                  <div key={lIdx} style={{ display: 'flex', gap: 8, paddingLeft: 8, fontSize: 13.5, color: '#374151', lineHeight: 1.7, marginBottom: 2 }}>
                                    <span style={{ color: '#64748b', flexShrink: 0 }}>•</span>
                                    <span>{linea.replace(/^\s*•\s*/, '')}</span>
                                  </div>
                                );
                              }
                              const ci = linea.indexOf(':');
                              if (ci > 0 && ci < 52) {
                                const etq = linea.slice(0, ci).trim();
                                const vl = linea.slice(ci + 1).trim();
                                if (!vl) {
                                  return <div key={lIdx} style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 8, marginBottom: 2 }}>{etq}</div>;
                                }
                                return (
                                  <div key={lIdx} style={{ fontSize: 13.5, color: '#1f2937', lineHeight: 1.75, marginBottom: 3 }}>
                                    <strong style={{ fontWeight: 700, color: '#0f172a' }}>{etq}:</strong>{' '}{vl}
                                  </div>
                                );
                              }
                              return <div key={lIdx} style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.75, marginBottom: 2 }}>{linea}</div>;
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 20px' }}>
                  <button
                    onClick={() => setActiveTab('procedimientos')}
                    className="gc-btn-primary"
                    style={{ padding: '10px 16px' }}
                  >
                    <Scissors size={15} /> Ir a Tratamientos y Cotización
                  </button>
                </div>
              </div>

              {hallazgosOdontograma.length > 0 && (
                <button onClick={() => setShowMigracionModal(true)} style={{ width: '100%', padding: '14px', background: COLORS.primaryLight, color: COLORS.primaryDark, border: `1px solid ${COLORS.primary}`, borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Eye size={18} /> Ver resumen de hallazgos automáticos ({diagnosticosOdontograma.length} diagnósticos, {procedimientosSugeridos.length} sugerencias)
                </button>
              )}
            </div>
          </div>

          {/* TAB 3: PROCEDIMIENTOS Y PRESUPUESTO */}
          <div style={getPanelStyle(activeTab === 'procedimientos')}>
            <div className="gc-fade-in gc-card gc-card--plan">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
                <h3 className="gc-card-title" style={{ margin: 0, border: 'none', padding: 0 }}><Scissors size={20} /> Plan de Tratamiento & Presupuesto</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleImprimir('presupuesto')}
                    disabled={procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0 ? 0.4 : 1 }}
                  >
                    <Download size={13} /> PDF Cotizacion
                  </button>
                  <button
                    onClick={() => handleWhatsApp('presupuesto')}
                    disabled={procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0 ? 0.4 : 1 }}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: consentimiento ? COLORS.successLight : COLORS.warningLight, color: consentimiento ? COLORS.success : COLORS.warning, padding: '10px 18px', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s', fontWeight: 700 }}>
                    <input className="gc-check-input" type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)} style={{ accentColor: COLORS.success, width: '18px', height: '18px' }} />
                    <FileSignature size={18} /> Consentimiento Informado Firmado
                  </label>
                </div>
              </div>

              {procedimientosSugeridos.length > 0 && (
                <div style={{ background: COLORS.infoLight, border: `1px solid ${COLORS.info}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.info, fontWeight: 700, fontSize: '14px' }}>
                    <Info size={20} /> Inteligencia Clínica: {procedimientosSugeridos.length} revisiones sugeridas por el Odontograma
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={aceptarSugerencias} style={{ padding: '8px 16px', background: COLORS.info, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}><Plus size={16} /> Importar Todos</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1fr 1fr 2fr 1fr 1fr 1fr auto', gap: '12px', background: COLORS.background, padding: '20px', borderRadius: '16px', marginBottom: '24px', border: `1px solid ${COLORS.border}`, alignItems: 'end' }}>
                <div className="gc-form-group" style={{ marginBottom: 0 }}><label>Procedimiento</label><input className="gc-input" type="text" placeholder="Ej. Limpieza" value={nuevoProcedimiento.nombre} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, nombre: e.target.value})} /></div>

                <div className="gc-form-group" style={{ marginBottom: 0 }}>
                  <label>Categoria clínica</label>
                  <select className="gc-input" value={nuevoProcedimiento.categoria} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, categoria: e.target.value})}>
                    {GENERAL_TREATMENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                
                <div className="gc-form-group" style={{ marginBottom: 0 }}>
                  <label>Pieza (FDI)</label>
                  <select className="gc-input" value={nuevoProcedimiento.pieza} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, pieza: e.target.value, cara: ''})}>
                    <option value="">General / N/A</option>
                    <optgroup label="Adultos">
                      {FDI_ADULTOS.map(p => <option key={`ad-${p}`} value={p}>{p}</option>)}
                    </optgroup>
                    <optgroup label="Niños">
                      {FDI_NINOS.map(p => <option key={`ni-${p}`} value={p}>{p}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div className="gc-form-group" style={{ marginBottom: 0 }}>
                  <label>Cara Anatomica</label>
                  <select className="gc-input" value={nuevoProcedimiento.cara} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, cara: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {carasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="gc-form-group" style={{ marginBottom: 0 }}><label>Observaciones</label><input className="gc-input" type="text" placeholder="Detalles..." value={nuevoProcedimiento.observaciones} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, observaciones: e.target.value})} /></div>
                
                <div className="gc-form-group" style={{ marginBottom: 0 }}>
                  <label>Estado</label>
                  <select className="gc-input" value={nuevoProcedimiento.estado} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, estado: e.target.value as any})}>
                    <option value="sugerido">Sugerido</option><option value="presupuestado">Presupuestado</option><option value="aprobado">Aprobado</option><option value="realizado">Realizado Hoy</option>
                  </select>
                </div>
                
                <div className="gc-form-group" style={{ marginBottom: 0 }}><label>Precio al Paciente</label><input className="gc-input" type="number" min="0" placeholder="0" value={nuevoProcedimiento.costo || ''} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, costo: Math.max(0, Number(e.target.value))})} /></div>

                <div className="gc-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: COLORS.textLight }}><PackageOpen size={11} /> Costo Material</label>
                  <input className="gc-input" type="number" min="0" placeholder="0 (opcional)" value={nuevoProcedimiento.costoMaterial || ''} onChange={e => setNuevoProcedimiento({...nuevoProcedimiento, costoMaterial: Math.max(0, Number(e.target.value))})} style={{ borderColor: (nuevoProcedimiento.costoMaterial || 0) > 0 ? '#d8b4fe' : COLORS.border }} />
                </div>
                
                <button className="gc-btn-primary" style={{ height: '44px', padding: '0 24px' }} onClick={() => {
                  if(nuevoProcedimiento.nombre && nuevoProcedimiento.nombre.trim() !== '') {
                    setProcedimientos([{ ...nuevoProcedimiento, id: `ptr_${crypto.randomUUID()}`, fecha: new Date().toLocaleDateString() } as Procedimiento, ...procedimientos]);
                    setNuevoProcedimiento({ nombre: '', pieza: '', cara: '', observaciones: '', categoria: 'Operatoria / Restauradora', costo: 0, costoMaterial: 0, estado: 'aprobado' });
                  }
                }}><Plus size={20} /> Añadir</button>
              </div>

              <div className="gc-table-shell">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: COLORS.background, color: COLORS.textLight, textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
                      <th style={{ padding: '16px' }}>Procedimiento</th><th style={{ padding: '16px' }}>Ubicacion</th><th style={{ padding: '16px' }}>Estado Workflow</th><th style={{ padding: '16px' }}>Precio / Rentabilidad</th><th style={{ padding: '16px', textAlign: 'right' }}>Accion</th>
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
                            {p.migradoDesdeOdontograma ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: toolColor.base }}>Tratamiento::</span>
                                <input type="text" value={normalizarNombreOdontograma(p)} placeholder="Escriba nombre" onChange={(e) => actualizarProcedimiento(p.id, 'nombre', e.target.value)} style={{ fontWeight: 800, fontSize: '14px', color: COLORS.text, background: 'transparent', border: 'none', width: '100%', outline: 'none', borderBottom: `1px dashed ${toolColor.base}` }} />
                              </div>
                            ) : (
                              <input type="text" value={p.nombre} placeholder="Nombre del tratamiento" onChange={(e) => actualizarProcedimiento(p.id, 'nombre', e.target.value)} style={{ fontWeight: 800, fontSize: '14px', color: COLORS.text, background: 'transparent', border: 'none', width: '100%', outline: 'none' }} />
                            )}
                            {p.categoria && <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', fontWeight: 700 }}>{p.categoria}</div>}
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
                            {(() => {
                              const precio = Math.max(0, Number(p.costo) || 0);
                              const mat    = Math.max(0, Number(p.costoMaterial) || 0);
                              const util   = precio - mat;
                              return (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '4px 8px', marginBottom: mat > 0 ? '6px' : 0 }}>
                                    <DollarSign size={14} color={COLORS.textLight} />
                                    <input type="number" min="0" value={p.costo || ''} onChange={(e) => actualizarProcedimiento(p.id, 'costo', e.target.value)} placeholder="0" style={{ border: 'none', outline: 'none', width: '90px', fontWeight: 800, color: COLORS.text, background: 'transparent', fontSize: '14px' }} />
                                  </div>
                                  {mat > 0 && (
                                    <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#faf5ff', borderRadius: '6px', padding: '3px 7px', border: '1px solid #e9d5ff' }}>
                                        <PackageOpen size={11} color="#9f67e4" />
                                        <span style={{ color: '#7c3aed', fontWeight: 700 }}>Mat: -{formatCOP(mat)}</span>
                                        <input type="number" min="0" value={p.costoMaterial || ''} onChange={(e) => actualizarProcedimiento(p.id, 'costoMaterial', Number(e.target.value))} style={{ border: 'none', outline: 'none', width: '70px', fontWeight: 700, color: '#7c3aed', background: 'transparent', fontSize: '11px' }} />
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: util >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '6px', padding: '3px 7px', border: `1px solid ${util >= 0 ? '#bbf7d0' : '#fca5a5'}` }}>
                                        <TrendingUp size={11} color={util >= 0 ? '#166534' : COLORS.error} />
                                        <span style={{ color: util >= 0 ? '#166534' : COLORS.error, fontWeight: 800 }}>
                                          Util: {formatCOP(util)}
                                          {precio > 0 && ` (${Math.round((util / precio) * 100)}%)`}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8 }}>
                              <button
                                onClick={() => handleEjecutarProcedimiento(p.id)}
                                disabled={String(p.estado).toLowerCase() === 'realizado'}
                                style={{
                                  background: String(p.estado).toLowerCase() === 'realizado' ? '#dcfce7' : '#ecfeff',
                                  border: `1px solid ${String(p.estado).toLowerCase() === 'realizado' ? '#86efac' : '#67e8f9'}`,
                                  color: String(p.estado).toLowerCase() === 'realizado' ? '#166534' : '#0e7490',
                                  cursor: String(p.estado).toLowerCase() === 'realizado' ? 'not-allowed' : 'pointer',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                                title={String(p.estado).toLowerCase() === 'realizado' ? 'Ya ejecutado' : 'Ejecutar este tratamiento'}
                              >
                                {String(p.estado).toLowerCase() === 'realizado' ? 'Ejecutado' : 'Ejecutar'}
                              </button>
                              <button onClick={() => setProcedimientos(procedimientos.filter(item => item.id !== p.id))} style={{ background: COLORS.errorLight, border: 'none', color: COLORS.error, cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#fca5a5'} onMouseOut={e => e.currentTarget.style.background = COLORS.errorLight}><Trash size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {procedimientos.length === 0 && ( <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: COLORS.textLight }}><div style={{ fontSize: '14px', fontWeight: 500 }}>El plan de tratamiento está vacío.</div></td></tr> )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleMarcarTodoRealizado}
                  disabled={pendientesEjecutablesCount === 0}
                  style={{
                    padding: '12px 24px',
                    background: pendientesEjecutablesCount === 0 ? '#f1f5f9' : '#0ea5e9',
                    border: `2px solid ${pendientesEjecutablesCount === 0 ? '#cbd5e1' : '#0284c7'}`,
                    color: pendientesEjecutablesCount === 0 ? '#94a3b8' : 'white',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: pendientesEjecutablesCount === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title={pendientesEjecutablesCount === 0 ? 'No hay procedimientos ejecutables pendientes' : 'Ejecutar todos los procedimientos pendientes'}
                >
                  <CheckCircle size={18} />
                  <span>Ejecutar Todo ({pendientesEjecutablesCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* TAB 4: RECETAS */}
          <div style={getPanelStyle(activeTab === 'recetas')}>
            <div className="gc-fade-in gc-grid-2">
              <div className="gc-card gc-card--rx">
                <h3 className="gc-card-title"><Pill size={18} /> Nueva Prescripción</h3>
                
                {alertaSeguridadReceta && (
                  <div className="shake" style={{ background: COLORS.errorLight, color: COLORS.error, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.error}`, marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', fontWeight: 700 }}>
                    <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>{alertaSeguridadReceta}</div>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: COLORS.textLight }}>Vademécum Rápido</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px 0' }}>
                    <button className="gc-btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Amoxicilina 500mg', dosis: '1 cápsula', frecuencia: 'Cada 8h', duracion: '7 días', indicaciones: 'Tomar después de comidas' }); verificarSeguridadReceta('Amoxicilina 500mg', '1 cápsula'); }}>Amoxicilina</button>
                    <button className="gc-btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Ibuprofeno 400mg', dosis: '1 tableta', frecuencia: 'Cada 8h', duracion: '3 días', indicaciones: 'Con alimentos' }); verificarSeguridadReceta('Ibuprofeno 400mg', '1 tableta'); }}>Ibuprofeno</button>
                    <button className="gc-btn-badge" onClick={() => { setNuevaReceta({ medicamento: 'Clindamicina 300mg', dosis: '1 cápsula', frecuencia: 'Cada 8h', duracion: '7 días', indicaciones: 'Con abundante agua' }); verificarSeguridadReceta('Clindamicina 300mg', '1 cápsula'); }}>Clindamicina</button>
                  </div>
                </div>
                
                <div className="gc-form-group"><input type="text" className="gc-input" placeholder="Medicamento" value={nuevaReceta.medicamento} onChange={e => { setNuevaReceta({...nuevaReceta, medicamento: e.target.value}); setAlertaSeguridadReceta(null); }} /></div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <input type="text" className="gc-input" placeholder="Dosis" value={nuevaReceta.dosis} onChange={e => { setNuevaReceta({...nuevaReceta, dosis: e.target.value}); setAlertaSeguridadReceta(null); }} />
                  <input type="text" className="gc-input" placeholder="Frecuencia" value={nuevaReceta.frecuencia} onChange={e => setNuevaReceta({...nuevaReceta, frecuencia: e.target.value})} />
                  <input type="text" className="gc-input" placeholder="Duración" value={nuevaReceta.duracion} onChange={e => setNuevaReceta({...nuevaReceta, duracion: e.target.value})} />
                </div>
                
                <div className="gc-form-group"><textarea rows={2} className="gc-input" placeholder="Indicaciones adicionales" value={nuevaReceta.indicaciones} onChange={e => setNuevaReceta({...nuevaReceta, indicaciones: e.target.value})} /></div>
                
                <button className="gc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={handleAgregarReceta}>
                  <Plus size={18} /> Agregar a la Receta
                </button>
              </div>

              <div className="gc-card gc-card--rx-current">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="gc-card-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}><Printer size={18} /> Receta Actual</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleImprimir('receta')}
                    disabled={recetas.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: recetas.length === 0 ? 'not-allowed' : 'pointer', opacity: recetas.length === 0 ? 0.4 : 1 }}
                  >
                    <Printer size={13} /> Imprimir / PDF
                  </button>
                  <button
                    onClick={() => handleWhatsApp('receta')}
                    disabled={recetas.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: recetas.length === 0 ? 'not-allowed' : 'pointer', opacity: recetas.length === 0 ? 0.4 : 1 }}
                  >
                    <MessageCircle size={13} /> WhatsApp Receta
                  </button>
                  <button
                    onClick={() => handleImprimir('presupuesto')}
                    disabled={procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0 ? 0.4 : 1 }}
                  >
                    <Download size={13} /> PDF Cotizacion
                  </button>
                  <button
                    onClick={() => handleWhatsApp('presupuesto')}
                    disabled={procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0 ? 0.4 : 1 }}
                  >
                    <MessageCircle size={13} /> WhatsApp Cotizacion
                  </button>
                </div>
                <div className="gc-panel-inner" style={{ background: '#fffbeb', minHeight: '200px', borderColor: '#fde68a' }}>
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

      {/* MODAL MIGRACIÓN */}
      {showMigracionModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="fade-in gc-modal-shell" style={{ width: '650px', maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><h2 style={{ margin: 0, color: COLORS.text, fontSize: '20px', fontWeight: 800 }}>Resumen Inteligente del Odontograma</h2><button onClick={() => setShowMigracionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textLight }}><X size={24} /></button></div>
            <p style={{ fontSize: '15px', color: COLORS.textLight, marginBottom: '24px' }}>El sistema ha analizado sus trazos en el odontograma y sugiere el siguiente plan de acción:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: COLORS.infoLight, padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.info}` }}>
                <h3 style={{ fontSize: '15px', margin: '0 0 12px 0', color: COLORS.info, fontWeight: 800 }}>{diagnosticosOdontograma.length} Diagnósticos derivados</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: COLORS.text, fontWeight: 500 }}>{diagnosticosOdontograma.map(d => <li key={d.id} style={{marginBottom: '6px'}}><strong>{d.codigo}</strong> - Pieza #{d.diente}</li>)}</ul>
              </div>
              <div style={{ background: COLORS.warningLight, padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.warning}` }}>
                <h3 style={{ fontSize: '15px', margin: '0 0 12px 0', color: '#b45309', fontWeight: 800 }}>{procedimientosSugeridos.length} Tratamientos a cotizar</h3>
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: COLORS.text, fontWeight: 500 }}>{procedimientosSugeridos.map(p => <li key={p.id} style={{marginBottom: '6px'}}>{(p.nombre || 'Tratamiento por definir')} (Pieza #{p.pieza})</li>)}</ul>
              </div>
            </div>
            <button onClick={() => { aceptarSugerencias(); setShowMigracionModal(false); setActiveTab('procedimientos'); }} style={{ marginTop: '24px', padding: '16px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '12px', width: '100%', cursor: 'pointer', fontWeight: 700, fontSize: '16px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>Importar al Plan de Tratamiento</button>
          </div>
        </div>
      )}

      {/* MODAL CANCELAR */}
      {showCancelModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in gc-modal-shell" style={{ width: '420px', maxWidth: '90%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: COLORS.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.error }}>
                <AlertTriangle size={24} />
              </div>
              <div><h2 style={{ margin: 0, color: COLORS.text, fontSize: '20px', fontWeight: 800 }}>¿Cancelar consulta?</h2></div>
            </div>
            <p style={{ fontSize: '15px', color: COLORS.textLight, marginBottom: '28px', lineHeight: 1.5, fontWeight: 500 }}>¿Estás seguro de que deseas abandonar esta sesión clínica? Los cambios no guardados se perderán.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ padding: '12px 20px', background: COLORS.background, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>Volver</button>
              <button onClick={onExit} style={{ padding: '12px 20px', background: COLORS.error, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>Sí, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST CONFIRMACIÓN (mantenido para compatibilidad con otros flujos) */}
      {showConfirmModal && (
        <div className="no-print" style={{ position: 'fixed', top: '24px', right: '24px', background: COLORS.success, color: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.3s ease-out' }}>
          <CheckCircle size={24} /><span style={{ fontSize: '15px', fontWeight: 600 }}>{mensajeConfirmacion}</span>
        </div>
      )}
      {/* MODAL NOTA ACLARATORIA */}
      {showNotaModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="gc-fade-in gc-modal-shell" style={{ width: '540px', maxWidth: '92%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '12px', flexShrink: 0 }}>
                <Lock size={22} color="#92400e" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: COLORS.text }}>Nota Aclaratoria</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: COLORS.textLight, fontWeight: 500, lineHeight: 1.4 }}>El historial supero el periodo de edicion (30 min, Res. 1995). Solo puede agregar notas sin modificar el registro original.</p>
              </div>
            </div>
            <textarea
              value={notaAclaratoria}
              onChange={e => setNotaAclaratoria(e.target.value)}
              rows={6}
              placeholder="Ej: Error en pieza registrada. El procedimiento se realizo en pieza 21, no 11. Aclaracion firmada por el Dr. ..."
              className="gc-input"
              style={{ resize: 'vertical', marginBottom: '16px', width: '100%', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowNotaModal(false); setNotaAclaratoria(''); }} style={{ padding: '10px 20px', background: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>Cancelar</button>
              <button
                disabled={!notaAclaratoria.trim()}
                onClick={async () => {
                  if (!notaAclaratoria.trim()) return;
                  const timestamp = new Date().toLocaleString('es-CO');
                  const updatedText = `${evolutionText}\n\n[NOTA ACLARATORIA \u2014 ${timestamp}]\n${notaAclaratoria}`;
                  hasUserEditedNarrative.current = true;
                  setEvolutionText(updatedText);
                  try {
                    await supabase.from('consultas_odontologicas').update({
                      detalles_clinicos: { evolucion_clinica: updatedText, nota_aclaratoria: notaAclaratoria, nota_aclaratoria_fecha: new Date().toISOString() }
                    }).eq('id', sessionId);
                    toastSuccess('Nota aclaratoria guardada en el expediente.');
                  } catch (_) {
                    toastWarning('Nota agregada localmente. Sincroniza si es necesario.');
                  }
                  setNotaAclaratoria('');
                  setShowNotaModal(false);
                }}
                style={{ padding: '10px 22px', background: !notaAclaratoria.trim() ? COLORS.border : COLORS.primary, color: 'white', border: 'none', borderRadius: '10px', cursor: notaAclaratoria.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s' }}
              >
                Guardar Nota en Expediente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
