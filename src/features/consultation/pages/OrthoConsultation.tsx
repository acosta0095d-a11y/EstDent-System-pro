import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../core/context/PatientContext';
import { supabase } from '../../../shared/lib/supabase';
import {
  attachConsultationCodeToDetails,
  buildConsultationCode,
  omitConsultationCodeColumn,
  shouldRetryWithoutConsultationCodeColumn,
} from '../../../shared/lib/consultationUtils';
import {
  appendAutoNote,
  buildProcedureStableKey,
  deriveMasterPlan,
  generateAutoNote,
  summarizeClinicalHistory,
} from '../../../shared/lib/clinicalWorkflow';
import { formatPatientRh } from '../../../shared/lib/patientRhUtils';
import { OrthoOdontogram } from '../components/OrthoOdontogram';
import { useToast, ToastContainer, ConfirmDialog } from '../../../shared/components/Toast';
import { 
  Save, ChevronLeft, Plus, Pill, Scissors, FileText, X, AlertCircle, CheckCircle, 
  Activity, ClipboardList, Stethoscope, Printer, Scan, AlertTriangle,
  Bone, Zap, Trash, DollarSign, CheckSquare, Search, BookOpen, User, Hash, ShieldAlert, Heart,
  Clock, Calendar, Gauge, SmilePlus, TrendingUp, PackageOpen,
  Lock, Download, MessageCircle, Info, Settings
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURACIÓN, TIPOS Y DICCIONARIOS ORTODÓNTICOS (AZUL PREMIUM)
// ============================================================================

const COLORS = {
  primary: '#29b2e8', primaryLight: '#e0f2fe', primaryDark: '#0e7da8', // Azul clínico suave
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
  if (t.includes('falla') || t.includes('despegado') || t.includes('recementado')) return { base: COLORS.error, pastel: COLORS.errorLight };
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
  { codigo: 'K00.0', nombre: 'Anodoncia' },
  { codigo: 'K00.1', nombre: 'Dientes supernumerarios' },
  { codigo: 'K00.2', nombre: 'Anomalías del tamaño y de la forma de los dientes' },
  { codigo: 'K00.4', nombre: 'Alteraciones en la formación de los dientes' },
  { codigo: 'K00.6', nombre: 'Alteraciones de la erupción dentaria' },
  { codigo: 'K00.7', nombre: 'Síndrome de erupción dentaria' },
  { codigo: 'K01.0', nombre: 'Dientes retenidos' },
  { codigo: 'K01.1', nombre: 'Dientes impactados' },
  { codigo: 'K02.1', nombre: 'Caries de dentina' },
  { codigo: 'K02.9', nombre: 'Caries dental, no especificada' },
  { codigo: 'K03.6', nombre: 'Depósitos en los dientes' },
  { codigo: 'K04.7', nombre: 'Absceso periapical sin fístula' },
  { codigo: 'K05.1', nombre: 'Gingivitis crónica' },
  { codigo: 'K05.3', nombre: 'Periodontitis crónica' },
  { codigo: 'K06.8', nombre: 'Otros trastornos especificados de la encía y reborde alveolar' },
  { codigo: 'K07.0', nombre: 'Anomalías evidentes del tamaño de los maxilares' },
  { codigo: 'K07.1', nombre: 'Anomalías de la relación maxilobasilar (Clase II/III)' },
  { codigo: 'K07.2', nombre: 'Anomalías de la relación de los arcos dentarios (maloclusión)' },
  { codigo: 'K07.3', nombre: 'Anomalías de la posición del diente (apiñamiento, diastema)' },
  { codigo: 'K07.4', nombre: 'Maloclusión, de tipo no especificado' },
  { codigo: 'K07.5', nombre: 'Anomalías dentofaciales funcionales' },
  { codigo: 'K07.6', nombre: 'Trastornos de la articulación temporomandibular' },
  { codigo: 'K07.8', nombre: 'Otras anomalías dentofaciales' },
  { codigo: 'K07.9', nombre: 'Anomalía dentofacial, no especificada' },
  { codigo: 'K08.0', nombre: 'Exfoliación de los dientes debida a causas sistémicas' },
  { codigo: 'K08.1', nombre: 'Pérdida de dientes por accidente, extracción o periodontopatía local' },
  { codigo: 'K08.3', nombre: 'Raíz dental retenida' },
  { codigo: 'K08.8', nombre: 'Otros trastornos especificados de los dientes y sus estructuras de soporte' },
  { codigo: 'M26.0', nombre: 'Anomalías mayores de la relación maxilar' },
  { codigo: 'M26.1', nombre: 'Anomalías de la relación entre maxilar y base del cráneo' },
  { codigo: 'M26.2', nombre: 'Anomalías de la relación de los arcos dentarios' },
  { codigo: 'M26.3', nombre: 'Anomalías de la posición dental' },
  { codigo: 'M26.4', nombre: 'Maloclusión, no especificada' },
  { codigo: 'M26.5', nombre: 'Anomalías dentofaciales funcionales' },
  { codigo: 'M26.6', nombre: 'Trastornos de la articulación temporomandibular' },
  { codigo: 'M26.7', nombre: 'Deformidades dentofaciales adquiridas' },
  { codigo: 'M26.8', nombre: 'Otras deformidades dentofaciales' },
  { codigo: 'M26.9', nombre: 'Deformidad dentofacial, no especificada' },
  { codigo: 'Z01.2', nombre: 'Examen odontológico completo' },
  { codigo: 'Z46.4', nombre: 'Prueba y ajuste de aparatos de ortodoncia' },
  { codigo: 'Z46.5', nombre: 'Prueba y ajuste de implantes y otros dispositivos dentales' },
  { codigo: 'Z97.2', nombre: 'Presencia de prótesis y dispositivos dentales' },
  { codigo: 'Z98.8', nombre: 'Otros estados postquirúrgicos especificados' },
];

const PROCEDURE_CATALOG = [
  { nombre: 'Resina Clase I', precio: 120000, cara: 'O', keys: ['resina', 'caries', 'clase i'] },
  { nombre: 'Resina Clase II', precio: 160000, cara: 'MO', keys: ['resina clase ii', 'interproximal'] },
  { nombre: 'Profilaxis y Fluorizacion', precio: 90000, cara: 'General', keys: ['profilaxis', 'higiene', 'fluor'] },
  { nombre: 'Recementado de Bracket', precio: 10000, cara: 'V', keys: ['bracket', 'recementado', 'despegado', 'falla'] },
  { nombre: 'Recementado de Tubo', precio: 10000, cara: 'V', keys: ['tubo', 'recementado', 'despegado', 'falla'] },
  { nombre: 'Cambio de Arco', precio: 70000, cara: 'General', keys: ['arco', 'alambre', 'niti'] },
  { nombre: 'Cambio de Ligaduras', precio: 30000, cara: 'General', keys: ['ligaduras', 'modulo', 'cauchos'] },
  { nombre: 'Ajuste de Alambre', precio: 0, cara: 'General', keys: ['ajuste', 'alambre', 'pincha'] },
  { nombre: 'Control Ortodontico Mensual', precio: 50000, cara: 'General', keys: ['control', 'mensualidad'] },
  { nombre: 'Consulta por Dolor Ortodóntico', precio: 0, cara: 'General', keys: ['dolor', 'molestia', 'consulta'] },
  { nombre: 'Consulta por Emergencia Ortodóntica', precio: 0, cara: 'General', keys: ['emergencia', 'urgencia'] },
  { nombre: 'Control de Retenedores', precio: 0, cara: 'General', keys: ['retenedores', 'retenedor'] },
  { nombre: 'Retiro de Aparatologia', precio: 0, cara: 'General', keys: ['retiro', 'brackets'] },
  { nombre: 'Sellante de Fosas y Fisuras', precio: 85000, cara: 'O', keys: ['sellante', 'fosas', 'fisuras'] },
];

// Tarifas para instalación de ortodoncia
const TARIFAS_ORTODONCIA = {
  BRACKET_SUPERIOR_COMPLETO: 1800000,  // Arco superior completo (14 brackets típicamente)
  BRACKET_INFERIOR_COMPLETO: 1600000,  // Arco inferior completo
  BRACKET_COMPLETO_AMBOS: 3200000,     // Instalación completa superior + inferior
  BRACKET_UNITARIO: 120000,            // Por bracket individual
  RECEMENTADO_BRACKET: 10000,          // Recementado de bracket caído (después de cortesías)
  CONTROL_MENSUAL: 50000,              // Consulta de control
  PRIMEROS_RECEMENTADOS_GRATIS: 5      // Primeros 5 recementados sin cargo
};

const MOTIVO_LABELS: Record<string, string> = {
  instalacion_inicial: 'Instalación Inicial de Aparatología Ortodóntica',
  control: 'Control Mensual de Ortodoncia',
  bracket_caido: 'Bracket/Tubo Desprendido',
  alambre_danado: 'Alambre Dañado o Pinchando',
  dolor: 'Dolor o Molestia con Aparatología',
  ajuste: 'Ajuste de Aparatología',
  emergencia: 'Emergencia Ortodóntica',
  retenedores: 'Control de Retenedores',
  otro: 'Otro (descrito por el paciente)',
};

const HIGIENE_ORAL_OPTIONS = [
  'Buena',
  'Regular leve',
  'Regular moderada',
  'Regular comprometida',
  'Mala',
];

const PLAN_INSTALACION_OPTIONS = [
  'Instalación completa inicial',
  'Instalación por arcada',
  'Instalación por sectores',
  'Proseguir instalación por fases',
  'Activación de aparatología ya instalada',
];

const ARCADA_INSTALACION_OPTIONS = [
  'Arcada superior',
  'Arcada inferior',
  'Ambas arcadas',
  'Sector anterior',
  'Sector posterior',
  'Segmento específico',
];

const normalizeHigieneOralLevel = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return 'Regular moderada';
  const normalized = raw.toLowerCase();

  if (normalized === 'buena' || normalized === 'good') return 'Buena';
  if (normalized === 'regular leve') return 'Regular leve';
  if (normalized === 'regular moderada' || normalized === 'regular') return 'Regular moderada';
  if (normalized === 'regular comprometida' || normalized === 'regular baja') return 'Regular comprometida';
  if (normalized === 'mala' || normalized === 'deficiente') return 'Mala';

  return 'Regular moderada';
};

const getHigieneDescriptionTemplate = (higiene: string): string => {
  const nivel = normalizeHigieneOralLevel(higiene);

  if (nivel === 'Buena') {
    return 'Encias en buen estado clinico, sin inflamacion relevante y con adecuada tecnica de higiene oral.';
  }
  if (nivel === 'Regular leve') {
    return 'Higiene oral aceptable, con placa localizada minima. Se refuerzan indicaciones preventivas para mantener estabilidad gingival.';
  }
  if (nivel === 'Regular moderada') {
    return 'Higiene oral regular, con acúmulo moderado de placa en sectores puntuales. Se recomienda mejorar tecnica de cepillado y uso de implementos interproximales.';
  }
  if (nivel === 'Regular comprometida') {
    return 'Higiene oral comprometida, con signos de inflamacion gingival leve a moderada. Se indica reforzar higiene diaria y control cercano.';
  }

  return 'Higiene oral deficiente, con placa abundante e inflamacion gingival. Requiere intervencion educativa intensiva y seguimiento prioritario.';
};

const normalizeDescriptionText = (value: unknown): string => String(value || '').trim().replace(/[.\s]+$/, '');

const buildPerfilFacialSummary = (perfil: any): string => {
  return `Paciente con perfil sagital ${perfil.perfilSagital.toLowerCase()}, simetría facial ${perfil.simetria.toLowerCase()}, competencia labial ${perfil.competenciaLabial.toLowerCase()}, ángulo nasolabial ${perfil.anguloNasolabial.toLowerCase()}, tercio inferior ${perfil.tercioBajoCara.toLowerCase()} y tipo facial ${perfil.tipoCara.toLowerCase()}.`;
};

const buildTratamientoActivoSummary = (arco: any, esPrimeraVez: boolean): string => {
  const calibre = String(arco?.calibre || 'sin calibre definido').trim();
  const fase = String(arco?.faseTratamiento || 'sin fase definida').trim();
  const planInstalacion = String(arco?.planInstalacion || 'sin plan de instalación detallado').trim();
  const arcada = String(arco?.arcadaInstalacion || 'sin arcada especificada').trim();
  const detalle = String(arco?.detalleInstalacion || '').trim();
  const notas = String(arco?.notasTratamiento || '').trim();

  const bloqueInstalacion = esPrimeraVez
    ? `Plan de sesión: ${planInstalacion}. Arcada o sector: ${arcada}${detalle ? ` (${detalle})` : ''}.`
    : '';

  return `${bloqueInstalacion ? `${bloqueInstalacion} ` : ''}Se registra calibre ${calibre}, en fase ${fase}${notas ? `. Nota clínica: ${notas}` : ''}.`.trim();
};

const buildOclusionSummary = (examen: any): string => {
  const overjet = String(examen?.overjet || 'pendiente').trim();
  const overbite = String(examen?.overbite || 'pendiente').trim();
  const observaciones = String(examen?.observaciones || '').trim();
  return `Oclusión actual: molar derecha ${examen?.claseMolarDer || 'No evaluable'}, molar izquierda ${examen?.claseMolarIzq || 'No evaluable'}, canina derecha ${examen?.claseCaninaDer || 'No evaluable'}, canina izquierda ${examen?.claseCaninaIzq || 'No evaluable'}, overjet ${overjet}, overbite ${overbite} y línea media ${examen?.lineaMedia || 'Centrada'}${observaciones ? `. Observaciones: ${observaciones}` : ''}.`;
};

const formatContainerLastUpdated = (iso: string | null | undefined): string => {
  if (!iso) return 'Sin registro previo';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro previo';
  return parsed.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ═══════════════════════════════════════════════════════════════════
// TIPOS Y CONFIGURACIÓN DE RADIOLOGÍA (MÓDULO DIAMOND)
// ═══════════════════════════════════════════════════════════════════

const RADIOLOGIA_TIPOS = [
  { id: 'Panoramica', label: 'Radiografía Panorámica' },
  { id: 'Cefalometrica', label: 'Radiografía Cefalométrica' },
  { id: 'Lateral', label: 'Radiografía Lateral de Cráneo' },
  { id: 'Periapical', label: 'Radiografía Periapical' },
  { id: 'Carpiana', label: 'Radiografía de Mano y Muñeca' },
  { id: 'Progreso', label: 'Radiografía de Progreso' },
  { id: 'CBCT', label: 'Tomografía Computarizada (CBCT)' },
];

// Smart Triggers por Motivo de Consulta
const RADIOLOGIA_SMART_TRIGGERS: Record<string, { tipos: string[], justificacion: string }> = {
  instalacion_inicial: {
    tipos: ['Panoramica', 'Cefalometrica', 'Lateral', 'Carpiana'],
    justificacion: 'Se solicita paquete radiográfico inicial para registro basal. Necesario para análisis cefalométrico y valoración del desarrollo óseo y dental del paciente.'
  },
  bracket_caido: {
    tipos: ['Periapical'],
    justificacion: 'Se solicita radiografía periapical para valorar la integridad radicular y soporte óseo de la pieza. La caída reiterada del bracket puede indicar problemas radioulares subyacentes.'
  },
  dolor: {
    tipos: ['Panoramica'],
    justificacion: 'Se solicita radiografía panorámica para descartar reabsorción radicular, contacto con terceros molares o patología ósea asociada al movimiento ortodóncico.'
  },
  control: {
    tipos: [],
    justificacion: 'Control mensual de rutina. Sin indicación inmediata de radiografía.'
  },
  alambre_danado: {
    tipos: ['Periapical'],
    justificacion: 'Se solicita radiografía para valorar si existe lesión radicular o trauma óseo por el alambre dañado.'
  },
  ajuste: {
    tipos: [],
    justificacion: 'Ajuste de aparatología de rutina. Sin indicación de imagen diagnóstica.'
  },
  emergencia: {
    tipos: ['Panoramica', 'Periapical'],
    justificacion: 'Emergencia ortodóntica requiere evaluación radiográfica para determinar causa raíz y plan de tratamiento.'
  },
  retenedores: {
    tipos: [],
    justificacion: 'Control de retenedores. Sin indicación radiográfica actualmente.'
  },
};

// Template de Consentimientos Dinámicos por Escenario
const CONSENTIMIENTO_TEMPLATES: Record<string, string> = {
  instalacion_inicial: `CONSENTIMIENTO INFORMADO PARA ESTUDIOS RADIOGRÁFICOS ORTODÓNCICOS

El paciente declara comprender:
• La necesidad de estudios radiográficos (Panorámica, Cefalométrica, Lateral y Radiografía de Mano) para evaluación completa de su caso.
• Que la radiación ionizante es mínima y necesaria para establecer un diagnóstico certero.
• Que estos estudios permitirán al ortodoncista evaluar la relación maxilar, el desarrollo óseo, la presencia de dientes supernumerarios o impactados, y establecer el plan de tratamiento más seguro.
• Los riesgos inherentes al tratamiento ortodóncico incluyen potencial reabsorción radicular, descalcificación, y cambios en la posición de los incisivos inferiores.

Autoriza la solicitud y ejecución de estos estudios radiográficos.`,

  bracket_caido: `CONSENTIMIENTO INFORMADO PARA RADIOGRAFÍA PERIAPICAL

El paciente declara comprender:
• Que la radiografía periapical es necesaria para evaluar la integridad de la raíz y el soporte óseo del diente afectado.
• Que la caída reiterada del bracket puede estar asociada a un problema radiular, anclaje óseo deficiente, o parafunción (hábito de morder).
• Que el cemento usado en ortodoncia, si bien es biocompatible, puede debilitar el esmalte con cementaciones repetidas.
• Que el costo del recementado es responsabilidad del paciente si se debe a causas mecánicas (alimentación, higiene inadecuada, parafunción).

Autoriza la solicitud de esta radiografía para evaluación diagnóstica.`,

  dolor: `CONSENTIMIENTO INFORMADO PARA RADIOGRAFÍA PANORÁMICA (EVALUACIÓN DE DOLOR)

El paciente declara comprender:
• Que el dolor durante el tratamiento ortodóncico puede deberse a varios factores: reabsorción radicular, contacto óseo/dental anormal, o trauma local.
• Que la radiografía panorámica es necesaria para descartar reabsorción radicular, una complicación potencial del movimiento dental.
• Que la reabsorción radicular puede ser irreversible si no se detecta a tiempo, y puede afectar la longevidad dental a largo plazo.
• Que el tratamiento ortodóncico conlleva riesgo inherente de reabsorción radicular en un pequeño porcentaje de pacientes, particularmente con fuerzas excesivas o tratamientos prolongados.

Autoriza la solicitud de esta radiografía diagnóstica.`,

  exodoncia: `CONSENTIMIENTO INFORMADO PARA RADIOGRAFÍA (EVALUACIÓN PREVIA A EXTRACCIÓN)

El paciente declara comprender:
• Que la extracción de piezas dentales (premolares u otros) se realiza con fines ortodóncicos para aliviar apiñamiento y mejorar la oclusión.
• Que la radiografía es necesaria para evaluar la posición, raíces, y anatomía de las piezas a extraer.
• Los riesgos de extracción incluyen: infección, hemorragia, daño a nervios adyacentes (infra-alveolar, lingual), y alveolitis (alvéolo seco).
• Que el daño al nervio puede resultar en parestesia permanente (alteración de sensibilidad) de labio, mentón o lengua.
• Que la extracción no es reversible.

Autoriza la solicitud de radiografía y la subsecuente extracción dentaria.`,

  reabsorcion: `ADVERTENCIA Y CONSENTIMIENTO SOBRE RIESGO DE REABSORCIÓN RADICULAR

El paciente declara comprender:
• Que la reabsorción radicular es una complicación potencial de cualquier movimiento dental ortodóncico.
• Que ciertos factores aumentan el riesgo: edad avanzada, antecedente de trauma dental, parafunción (mordida del labio/mejilla), mala higiene, enfermedad periodontal.
• Que la reabsorción radicular es generalmente irreversible y puede afectar la longevidad de los dientes.
• Que el monitoreo radiográfico periódico es fundamental para detectarla tempranamente.

Autoriza el tratamiento con esta advertencia comprendida.`,

  general: `CONSENTIMIENTO INFORMADO PARA ESTUDIOS RADIOGRÁFICOS

El paciente declara comprender:
• La necesidad del estudio radiográfico para evaluación diagnóstica y planificación del tratamiento ortodóncico.
• Que la radiación ionizante utilizada es mínima y está dentro de los estándares de seguridad radiológica internacional.
• Que estos estudios permiten al ortodoncista detectar anomalías óseas, dentales, y radiulares que de otro modo pasarían desapercibidas.
• Los riesgos inherentes al tratamiento ortodóncico, incluyendo potencial reabsorción radicular, descalcificación, y cambios en la posición dental.

Autoriza la solicitud y ejecución de los estudios radiográficos necesarios.`
};

interface HallazgoOdontograma { id: string; diente: string; tipo: string; cara?: string; descripcion: string; severidad: string; }
interface Procedimiento { id: string; nombre: string; pieza: string; accesorio: string; observaciones: string; fecha: string; migradoDesdeOdontograma?: boolean; hallazgoOrigen?: string; tipoHallazgo?: string; estado: 'sugerido' | 'presupuestado' | 'aprobado' | 'realizado'; costo: number; costoMaterial?: number; costoPendiente?: boolean; precioNoAplica?: boolean; is_persistent?: boolean; }
interface Diagnostico { id: string; codigo: string; nombre: string; tipo: 'principal' | 'secundario' | 'hallazgo'; diente?: string; migradoDesdeOdontograma?: boolean; tipoHallazgo?: string; }
interface Receta { id: string; medicamento: string; dosis: string; frecuencia: string; duracion: string; indicaciones: string; }

interface RadiologiaOrden {
  id: string;
  tipo: 'Panoramica' | 'Cefalometrica' | 'Periapical' | 'CBCT' | 'Lateral' | 'Carpiana' | 'Progreso';
  motivo: string;
  justificacion_automatica: string;
  piezas_solicitadas?: string[];  // Para periapical específico
  consentimiento_texto: string;
  consentimiento_aceptado: boolean;
  consentimiento_aceptado_at?: string;
  firma_digital_base64?: string;
  firma_digital_timestamp?: string;
  orden_pdf_url?: string;
  imagen_subida_url?: string;
  estado: 'pendiente' | 'realizado' | 'archivado';
  creado_en: string;
  paciente_id: string;
  consulta_id: string;
}

interface DiagnosticAlerta {
  tipo: 'dolor' | 'movil' | 'reabsorcion' | 'apiñamiento' | 'simetria' | 'raiz';
  diente: string;
  descripcion: string;
  severidad: 'leve' | 'moderado' | 'severo';
  timestamp: string;
}

interface ConsultaPayload {
  paciente_id: string;
  tipo_consulta: 'GENERAL' | 'ORTODONCIA';
  hallazgos_odontograma: HallazgoOdontograma[];
  estado_odontograma: {
    teethData: Record<string, any>;
    connections: any[];
    last_edit_at?: string;
  };
  detalles_clinicos: {
    anamnesis: {
      motivo: string;
      motivoSeleccionado: string; // Cambiado a string simple
      estadoGeneral: any;
      evolucionClinica: string;
    };
    perfil_facial?: any;
    arco_actual?: any;
    examen: any;
    evolucion_clinica?: string;
    plan_tratamiento: Procedimiento[];
    recetario: Receta[];
    ordenes_radiologia?: RadiologiaOrden[];
    diagnosticos_alertas?: DiagnosticAlerta[];
    consentimiento_informado?: {
      firmado: boolean;
      signed_at?: string | null;
    };
    workflow_summary?: Record<string, any>;
  };
  tiempo_sesion: number;
}

interface Props { 
  onExit: () => void; 
  initialData?: any;
  onSave?: (data: ConsultaPayload) => Promise<void>;
}

const formatCOP = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const getFacesArray = (tooth: any): any[] => {
  if (!tooth || !tooth.faces || typeof tooth.faces !== 'object') return [];
  return Object.values(tooth.faces);
};

const toothHasBase = (tooth: any): boolean => {
  return getFacesArray(tooth).some((face: any) => Boolean(face?.base));
};

const toothAuxCount = (tooth: any): number => {
  return getFacesArray(tooth).reduce((total: number, face: any) => {
    return total + (Array.isArray(face?.auxiliares) ? face.auxiliares.length : 0);
  }, 0);
};

const extractToothNumbers = (value: any): string[] => {
  const matches = String(value || '').match(/\d+/g) || [];
  return Array.from(new Set(matches.map((n) => String(n))));
};

const isRecementadoExecutedProcedure = (procedure: any): boolean => {
  const estado = String(procedure?.estado || '').toLowerCase();
  if (estado !== 'realizado') return false;
  const bucket = `${procedure?.nombre || ''} ${procedure?.hallazgoOrigen || ''} ${procedure?.tipoHallazgo || ''}`.toLowerCase();
  return bucket.includes('recement');
};

const normalizeResolvedRecementadoStates = (
  teethData: Record<string, any>,
  procedures: any[]
): Record<string, any> => {
  if (!teethData || typeof teethData !== 'object') return {};

  const piezasRecementadas = new Set<string>();
  (procedures || []).forEach((procedure) => {
    if (!isRecementadoExecutedProcedure(procedure)) return;
    extractToothNumbers(procedure?.pieza).forEach((pieza) => piezasRecementadas.add(pieza));
  });

  if (piezasRecementadas.size === 0) return teethData;

  const next: Record<string, any> = { ...teethData };
  piezasRecementadas.forEach((pieza) => {
    const tooth = next[pieza];
    if (!tooth) return;

    let changed = false;
    const cloned = { ...tooth } as any;

    if (cloned.base?.state === 'recementado') {
      cloned.base = { ...cloned.base, state: 'instalado' };
      changed = true;
    }

    if (cloned.faces && typeof cloned.faces === 'object') {
      const nextFaces: Record<string, any> = { ...cloned.faces };
      Object.keys(nextFaces).forEach((faceKey) => {
        const face = nextFaces[faceKey];
        if (!face?.base) return;
        if (face.base.state === 'recementado' || face.base.state === 'recementado_ejecutado') {
          nextFaces[faceKey] = {
            ...face,
            base: { ...face.base, state: 'instalado' },
            color: '#FFFFFF',
          };
          changed = true;
        }
      });
      if (changed) cloned.faces = nextFaces;
    }

    if (changed) next[pieza] = cloned;
  });

  return next;
};

// ============================================================================
// 2. COMPONENTE PRINCIPAL (ORTODONCIA TRADUCTOR)
// ============================================================================

export const OrthoConsultation = ({ onExit, initialData, onSave }: Props) => {
  const navigate = useNavigate();
  const {
    selectedPatient,
    setSelectedPatient,
    patients,
    setPatients,
    loadPatientById,
    setCurrentView,
    setAgendaDraft,
    saveConsultation,
  } = usePatient();
  
  // ID de sesión estable — generado al montar, persiste para upsert idempotente
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('anamnesis');
  const [tiempo, setTiempo] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMigracionModal, setShowMigracionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [pendingExecutionProcedureId, setPendingExecutionProcedureId] = useState<string | null>(null);
  const [showExecuteAllConfirm, setShowExecuteAllConfirm] = useState(false);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');
  const [previousHigieneOral, setPreviousHigieneOral] = useState<string>('');
  const [showHigieneRojaAlert, setShowHigieneRojaAlert] = useState(false);
  const [lastInheritedMeta, setLastInheritedMeta] = useState<{ date?: string; code?: string; summary?: string } | null>(null);
  const [consentimientoFirmadoAt, setConsentimientoFirmadoAt] = useState<string | null>(
    initialData?.detalles_clinicos?.consentimiento_informado?.signed_at || null
  );
  
  // Estados para tracking de ajustes durante la sesión
  const [hasAlambreAdjustment, setHasAlambreAdjustment] = useState(false);
  const [hasLigatureChange, setHasLigatureChange] = useState(false);

  useEffect(() => {
    if (!selectedPatient?.id) return;
    if (selectedPatient.consultas !== undefined && selectedPatient.clinical_history !== undefined) return;

    loadPatientById(selectedPatient.id).catch((error) => {
      console.error('[OrthoConsultation] No se pudo hidratar el caso clinico:', error);
    });
  }, [selectedPatient?.id, selectedPatient?.consultas, selectedPatient?.clinical_history, loadPatientById]);
  
  // Estados Anamnesis Orto
  const [motivo, setMotivo] = useState('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(''); // Cambiado a string simple (solo un motivo)
  const [estadoGeneral, setEstadoGeneral] = useState({
    higieneOral: 'Regular moderada',
    estadoAparatos: 'Buen estado',
    alertaMedica: '',
    descripcionHigiene: getHigieneDescriptionTemplate('Regular moderada'),
  });
  const [evolucionClinica, setEvolucionClinica] = useState('');
  const [evolucionTexto, setEvolucionTexto] = useState('');
  const [isDocumentEditing, setIsDocumentEditing] = useState(false);
  const [lastOdontogramEditAt, setLastOdontogramEditAt] = useState<string | null>(null);
  
  // Ref para navegación de secciones
  const tablaProcedimientosRef = useRef<HTMLDivElement>(null);
  const workAreaRef = useRef<HTMLDivElement>(null);
  
  // esPrimeraVezOrtodoncia ahora se calcula automáticamente basado en el motivo
  const esPrimeraVezOrtodoncia = motivoSeleccionado === 'instalacion_inicial';
  const hasOdontogramaHistory = Boolean(lastOdontogramEditAt || lastInheritedMeta?.date);
  const [proximaVisita, setProximaVisita] = useState<string>('');
  const [previousOdontogramSnapshot, setPreviousOdontogramSnapshot] = useState<any>(null);
  
  // Estados Examen Orto Especializado
  const [examenOrto, setExamenOrto] = useState({ 
    claseMolarDer: 'No evaluable', claseMolarIzq: 'No evaluable', 
    claseCaninaDer: 'No evaluable', claseCaninaIzq: 'No evaluable', 
    overjet: '', overbite: '', lineaMedia: 'Centrada', observaciones: '' 
  });
  const [busquedaCie10, setBusquedaCie10] = useState('');
  const [showCie10Dropdown, setShowCie10Dropdown] = useState(false);
  
  // Estados de Listas
  const [hallazgosOdontograma, setHallazgosOdontograma] = useState<HallazgoOdontograma[]>([]);
  const [orthoTeethData, setOrthoTeethData] = useState<Record<string, any>>({});
  const [orthoConnections, setOrthoConnections] = useState<any[]>([]);
  const [orthoSyncVersion, setOrthoSyncVersion] = useState(0);
  // Contador de recementados por paciente: 5 primeros son gratis, luego 10.000 c/u
  const RECEMENTADOS_GRATIS = 5;
  const PRECIO_RECEMENTADO = 10000;
  const [recementadosContador, setRecementadosContador] = useState<number>(() => {
    const pid = initialData?.paciente_id || '';
    if (!pid) return 0;
    return parseInt(localStorage.getItem(`rec_count_${pid}`) || '0', 10);
  });

  useEffect(() => {
    const pid = selectedPatient?.id || initialData?.paciente_id || '';
    if (!pid) {
      setRecementadosContador(0);
      return;
    }
    setRecementadosContador(parseInt(localStorage.getItem(`rec_count_${pid}`) || '0', 10));
  }, [selectedPatient?.id, initialData?.paciente_id]);

  const [diagnosticosManuales, setDiagnosticosManuales] = useState<Diagnostico[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);

  // MÓDULO DIAMOND: Órdenes Radiológicas y Diagnóstico
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologiaOrden[]>([]);
  const [diagnosticAlertas, setDiagnosticAlertas] = useState<DiagnosticAlerta[]>([]);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticModalTab, setDiagnosticModalTab] = useState<'solicitud' | 'consentimiento'>('solicitud');
  const [selectedRxType, setSelectedRxType] = useState('Panoramica');
  const [selectedRxPiezas, setSelectedRxPiezas] = useState<string[]>([]);
  const [rxJustificacionAuto, setRxJustificacionAuto] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentimientoTexto, setConsentimientoTexto] = useState('');
  const [consentimientoAceptado, setConsentimientoAceptado] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const [firmaDigitalBase64, setFirmaDigitalBase64] = useState<string | null>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const [nuevoProcedimiento, setNuevoProcedimiento] = useState<Partial<Procedimiento>>({
    nombre: '', pieza: '', accesorio: '', observaciones: '',
    costo: 0, costoMaterial: 0,
    estado: 'sugerido',
    costoPendiente: false,
    precioNoAplica: false,
  });
  const [nuevaReceta, setNuevaReceta] = useState({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
  const [alertaSeguridadReceta, setAlertaSeguridadReceta] = useState<string | null>(null);

  const [quickHallazgoNarrative, setQuickHallazgoNarrative] = useState('');

  // Props para OrthoOdontogram
  const handleOdontogramUpdate = (data: any) => {
    setHallazgosOdontograma(data);
  };
  const odontogramValue = hallazgosOdontograma;

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
        || initialData.detalles
        || initialData.motivo
        || initialData.hallazgosOdontograma?.length
        || initialData.hallazgos_odontograma?.length
        || initialData.procedimientos?.length
      )
    ),
    [initialData]
  );

  // ── ANÁLISIS FACIAL (Anamnesis Dinámica TEMA 4) ────────────────────────
  const [perfilFacial, setPerfilFacial] = useState({
    perfilSagital: 'Recto',        // Recto | Convexo | Cóncavo
    simetria: 'Simétrico',          // Simétrico | Asimétrico Der | Asimétrico Izq
    competenciaLabial: 'Competente',// Competente | Incompetente | Forzada
    anguloNasolabial: 'Normal',     // Agudo | Normal | Obtuso
    tercioBajoCara: 'Proporcionado',// Disminuido | Proporcionado | Aumentado
    tipoCara: 'Mesoprosopo',        // Leptoprosopo | Mesoprosopo | Euriprosopo
  });

  // ── SEGUIMIENTO DE ARCO ACTUAL (TEMA 4) ───────────────────────────────
  const [arcoActual, setArcoActual] = useState({
    calibre: '',
    faseTratamiento: 'Nivelación y Alineamiento',
    planInstalacion: 'Instalación completa inicial',
    arcadaInstalacion: 'Ambas arcadas',
    detalleInstalacion: '',
    notasTratamiento: '',
  });

  const [perfilFacialResumen, setPerfilFacialResumen] = useState(() => buildPerfilFacialSummary({
    perfilSagital: 'Recto',
    simetria: 'Simétrico',
    competenciaLabial: 'Competente',
    anguloNasolabial: 'Normal',
    tercioBajoCara: 'Proporcionado',
    tipoCara: 'Mesoprosopo',
  }));
  const [perfilFacialUpdatedAt, setPerfilFacialUpdatedAt] = useState<string | null>(null);

  const [tratamientoActivoResumen, setTratamientoActivoResumen] = useState(() => buildTratamientoActivoSummary({
    calibre: '',
    faseTratamiento: 'Nivelación y Alineamiento',
    planInstalacion: 'Instalación completa inicial',
    arcadaInstalacion: 'Ambas arcadas',
    detalleInstalacion: '',
    notasTratamiento: '',
  }, false));
  const [tratamientoActivoUpdatedAt, setTratamientoActivoUpdatedAt] = useState<string | null>(null);

  const [oclusionResumen, setOclusionResumen] = useState(() => buildOclusionSummary({
    claseMolarDer: 'No evaluable',
    claseMolarIzq: 'No evaluable',
    claseCaninaDer: 'No evaluable',
    claseCaninaIzq: 'No evaluable',
    overjet: '',
    overbite: '',
    lineaMedia: 'Centrada',
    observaciones: '',
  }));
  const [oclusionUpdatedAt, setOclusionUpdatedAt] = useState<string | null>(null);
  
  // ── MOTIVO INTELIGENTE: Cálculo automático basado en estado ─────────────
  const motivoInteligente = useMemo(() => {
    const tieneBases = Object.values(orthoTeethData).some((diente: any) => toothHasBase(diente));
    const tieneFallas = hallazgosOdontograma.some((h) => h.severidad === 'recementado');
    
    if (!tieneBases) return 'Instalación de Aparatología';
    if (tieneFallas) return 'Control Mensual + Urgencia (Reposición)';
    return 'Control Mensual de Ortodoncia';
  }, [orthoTeethData, hallazgosOdontograma]);

  const currentOrthoClosureSummary = useMemo(() => {
    const activeBases = Object.values(orthoTeethData || {}).filter((tooth: any) => toothHasBase(tooth)).length;
    const activeAuxiliaries = Object.values(orthoTeethData || {}).reduce((total: number, tooth: any) => total + toothAuxCount(tooth), 0);
    const activeConnections = Array.isArray(orthoConnections) ? orthoConnections.length : 0;
    const completedProcedures = procedimientos.filter((procedure) => ['realizado', 'aprobado'].includes(String(procedure.estado || '').toLowerCase()));
    const plannedProcedures = procedimientos.filter((procedure) => ['presupuestado', 'sugerido'].includes(String(procedure.estado || '').toLowerCase()));

    const segments: string[] = [];
    if (activeBases > 0) segments.push(`${activeBases} base${activeBases === 1 ? '' : 's'} activas`);
    if (activeAuxiliaries > 0) segments.push(`${activeAuxiliaries} auxiliares en boca`);
    if (activeConnections > 0) segments.push(`${activeConnections} arco/conexion${activeConnections === 1 ? '' : 'es'} funcionales`);
    if (arcoActual.calibre) segments.push(`arco ${arcoActual.calibre}`);
    if (arcoActual.faseTratamiento) segments.push(`fase ${arcoActual.faseTratamiento}`);
    if (String(arcoActual.notasTratamiento || '').trim()) segments.push('nota clínica registrada');

    const hardwareText = segments.length
      ? `La aparatologia se dejo con ${segments.join(', ')}.`
      : 'No se registraron componentes activos en el odontograma ortodontico.';


    const performedText = completedProcedures.length
      ? `Se ejecutaron ${completedProcedures.length} procedimiento${completedProcedures.length === 1 ? '' : 's'}: ${completedProcedures.slice(0, 3).map((procedure: any) => procedure.nombre).join(', ')}.`
      : 'No se cerraron procedimientos adicionales en esta sesion.';

    const pendingText = plannedProcedures.length
      ? `Quedaron pendientes ${plannedProcedures.length} accion${plannedProcedures.length === 1 ? '' : 'es'}: ${plannedProcedures.slice(0, 3).map((procedure: any) => procedure.nombre).join(', ')}.`
      : 'No quedaron acciones pendientes inmediatas fuera del plan maestro.';

    return `${hardwareText} ${performedText} ${pendingText}`;
  }, [orthoTeethData, orthoConnections, procedimientos, arcoActual]);

  const inheritedProcedureSummary = useMemo(() => {
    const realizados = procedimientos.filter((procedure) => String(procedure.estado).toLowerCase() === 'realizado');
    if (realizados.length > 0) {
      return `En la sesion actual se estan registrando ${realizados.length} procedimiento${realizados.length === 1 ? '' : 's'} activo${realizados.length === 1 ? '' : 's'}: ${realizados.slice(0, 3).map((procedure) => procedure.nombre).join(', ')}.`;
    }

    const activeBrackets = Object.values(orthoTeethData || {}).filter((tooth: any) => toothHasBase(tooth)).length;
    const activeConnections = Array.isArray(orthoConnections) ? orthoConnections.length : 0;

    if (activeBrackets > 0 || activeConnections > 0) {
      return `El odontograma ortodontico cargo la aparatologia tal como quedo la ultima vez: ${activeBrackets} bracket${activeBrackets === 1 ? '' : 's'} o bases activas y ${activeConnections} conexion${activeConnections === 1 ? '' : 'es'} clinica${activeConnections === 1 ? '' : 's'} en seguimiento.`;
    }

    return 'El odontograma ortodontico esta listo para iniciar la secuencia del tratamiento y guardar como queda la aparatologia al cierre de esta cita.';
  }, [procedimientos, orthoTeethData, orthoConnections]);

  const activeOrthoBases = useMemo(
    () => Object.values(orthoTeethData || {}).filter((tooth: any) => toothHasBase(tooth)).length,
    [orthoTeethData]
  );

  const activeOrthoConnections = useMemo(
    () => Array.isArray(orthoConnections) ? orthoConnections.length : 0,
    [orthoConnections]
  );

  const consentimientoFirmado = Boolean(consentimientoFirmadoAt);

  const autoPerfilFacialResumen = useMemo(
    () => buildPerfilFacialSummary(perfilFacial),
    [perfilFacial]
  );

  const autoTratamientoActivoResumen = useMemo(
    () => buildTratamientoActivoSummary(arcoActual, esPrimeraVezOrtodoncia),
    [arcoActual, esPrimeraVezOrtodoncia]
  );

  const autoOclusionResumen = useMemo(
    () => buildOclusionSummary(examenOrto),
    [examenOrto]
  );

  const lastAutoPerfilSummaryRef = useRef<string>(autoPerfilFacialResumen);
  const lastAutoTratamientoSummaryRef = useRef<string>(autoTratamientoActivoResumen);
  const lastAutoOclusionSummaryRef = useRef<string>(autoOclusionResumen);

  useEffect(() => {
    setPerfilFacialResumen((prev) => {
      const actual = String(prev || '').trim();
      const previousAuto = String(lastAutoPerfilSummaryRef.current || '').trim();
      const shouldReplace = !actual || actual === previousAuto;
      lastAutoPerfilSummaryRef.current = autoPerfilFacialResumen;
      return shouldReplace ? autoPerfilFacialResumen : prev;
    });
  }, [autoPerfilFacialResumen]);

  useEffect(() => {
    setTratamientoActivoResumen((prev) => {
      const actual = String(prev || '').trim();
      const previousAuto = String(lastAutoTratamientoSummaryRef.current || '').trim();
      const shouldReplace = !actual || actual === previousAuto;
      lastAutoTratamientoSummaryRef.current = autoTratamientoActivoResumen;
      return shouldReplace ? autoTratamientoActivoResumen : prev;
    });
  }, [autoTratamientoActivoResumen]);

  useEffect(() => {
    setOclusionResumen((prev) => {
      const actual = String(prev || '').trim();
      const previousAuto = String(lastAutoOclusionSummaryRef.current || '').trim();
      const shouldReplace = !actual || actual === previousAuto;
      lastAutoOclusionSummaryRef.current = autoOclusionResumen;
      return shouldReplace ? autoOclusionResumen : prev;
    });
  }, [autoOclusionResumen]);

  const nowIso = () => new Date().toISOString();

  const handlePerfilFacialChange = useCallback((field: string, value: string) => {
    setPerfilFacial((prev) => ({ ...prev, [field]: value }));
    setPerfilFacialUpdatedAt(nowIso());
  }, []);

  const handleArcoActualChange = useCallback((field: string, value: string) => {
    setArcoActual((prev) => ({ ...prev, [field]: value }));
    setTratamientoActivoUpdatedAt(nowIso());
  }, []);

  const handleExamenOrtoChange = useCallback((field: string, value: string) => {
    setExamenOrto((prev) => ({ ...prev, [field]: value }));
    setOclusionUpdatedAt(nowIso());
  }, []);

  const toggleDiagnosticoCie10 = useCallback((cie: { codigo: string; nombre: string }) => {
    setDiagnosticosManuales((prev) => {
      const existe = prev.some((diagnostico) => diagnostico.codigo === cie.codigo);
      if (existe) {
        return prev.filter((diagnostico) => diagnostico.codigo !== cie.codigo);
      }
      return [
        ...prev,
        {
          id: `diag_${crypto.randomUUID()}`,
          codigo: cie.codigo,
          nombre: cie.nombre,
          tipo: 'principal',
        },
      ];
    });
  }, []);

  const perfilFacialUltimaModificacion = useMemo(
    () => formatContainerLastUpdated(perfilFacialUpdatedAt),
    [perfilFacialUpdatedAt]
  );

  const tratamientoActivoUltimaModificacion = useMemo(
    () => formatContainerLastUpdated(tratamientoActivoUpdatedAt),
    [tratamientoActivoUpdatedAt]
  );

  const oclusionUltimaModificacion = useMemo(
    () => formatContainerLastUpdated(oclusionUpdatedAt),
    [oclusionUpdatedAt]
  );

  // VÁLVULAS DE SEGURIDAD
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const hasSeenOdontogramaSyncRef = useRef(false);
  const hasUserEditedNarrative = useRef(false);

  useEffect(() => {
    setShowHigieneRojaAlert(previousHigieneOral === 'Mala' && estadoGeneral.higieneOral === 'Mala');
  }, [previousHigieneOral, estadoGeneral.higieneOral]);

  // CARGAR DATOS PREVIOS
  useEffect(() => {
    if (!isInitialLoadDone && hasInitialConsultationSeed && initialData) {
      if (initialData.motivo) setMotivo(initialData.motivo);
      if (initialData.motivoSeleccionado) setMotivoSeleccionado(initialData.motivoSeleccionado);
      if (initialData.estadoGeneral) {
        const incomingEstadoGeneral = initialData.estadoGeneral || {};
        const higieneNormalizada = normalizeHigieneOralLevel(incomingEstadoGeneral.higieneOral);
        const descripcionPersistida = normalizeDescriptionText(
          incomingEstadoGeneral.descripcionHigiene || incomingEstadoGeneral.alertaMedica
        );

        setEstadoGeneral({
          ...incomingEstadoGeneral,
          higieneOral: higieneNormalizada,
          estadoAparatos: incomingEstadoGeneral.estadoAparatos || 'Buen estado',
          alertaMedica: incomingEstadoGeneral.alertaMedica || '',
          descripcionHigiene: descripcionPersistida || getHigieneDescriptionTemplate(higieneNormalizada),
        });
      }
      if (initialData.evolucionClinica) setEvolucionClinica(initialData.evolucionClinica);
      const incomingExamen = initialData.examenOrto || initialData.detalles_clinicos?.examen;
      if (incomingExamen) {
        const nextExamen = {
          ...examenOrto,
          ...incomingExamen,
        };
        setExamenOrto(nextExamen);
        setOclusionResumen(
          normalizeDescriptionText(incomingExamen.resumen_fluido || incomingExamen.resumenFluido)
          || normalizeDescriptionText(initialData.detalles_clinicos?.anamnesis?.resumenes_containers?.evolucion_oclusal)
          || buildOclusionSummary(nextExamen)
        );
        setOclusionUpdatedAt(
          incomingExamen.ultima_modificacion
          || incomingExamen.updated_at
          || initialData.detalles_clinicos?.anamnesis?.ultima_modificacion_containers?.evolucion_oclusal
          || null
        );
      }
      if (initialData.diagnosticosManuales) setDiagnosticosManuales(initialData.diagnosticosManuales);
      if (initialData.procedimientos) setProcedimientos(initialData.procedimientos);
      if (initialData.recetas) setRecetas(initialData.recetas);
      if (initialData.detalles_clinicos?.ordenes_radiologia) setRadiologyOrders(initialData.detalles_clinicos.ordenes_radiologia);
      if (initialData.detalles_clinicos?.diagnosticos_alertas) setDiagnosticAlertas(initialData.detalles_clinicos.diagnosticos_alertas);
      if (initialData.hallazgosOdontograma) setHallazgosOdontograma(initialData.hallazgosOdontograma);
      const savedNarrative = initialData.detalles_clinicos?.anamnesis?.evolucionNarrativa;
      if (savedNarrative) {
        hasUserEditedNarrative.current = true;
        setEvolucionTexto(savedNarrative);
      }
      if (initialData.estado_odontograma) {
        const normalizedTeethData = normalizeResolvedRecementadoStates(
          initialData.estado_odontograma.teethData || {},
          initialData.detalles_clinicos?.plan_tratamiento || initialData.procedimientos || []
        );
        setOrthoTeethData(normalizedTeethData);
        setOrthoConnections(initialData.estado_odontograma.connections || []);
        setPreviousOdontogramSnapshot(initialData.estado_odontograma);
        // Restaurar la fecha de última modificación del odontograma guardada
        const savedOdontogramDate = initialData.estado_odontograma.last_edit_at || initialData.created_at;
        if (savedOdontogramDate) setLastOdontogramEditAt(savedOdontogramDate);
      }
      if (initialData.perfil_facial || initialData.detalles_clinicos?.perfil_facial) {
        const incomingPerfil = initialData.perfil_facial || initialData.detalles_clinicos.perfil_facial;
        const nextPerfil = {
          ...perfilFacial,
          ...incomingPerfil,
        };
        setPerfilFacial(nextPerfil);
        setPerfilFacialResumen(
          normalizeDescriptionText(incomingPerfil.resumen_fluido || incomingPerfil.resumenFluido)
          || normalizeDescriptionText(initialData.detalles_clinicos?.anamnesis?.resumenes_containers?.perfil_facial)
          || buildPerfilFacialSummary(nextPerfil)
        );
        setPerfilFacialUpdatedAt(
          incomingPerfil.ultima_modificacion
          || incomingPerfil.updated_at
          || initialData.detalles_clinicos?.anamnesis?.ultima_modificacion_containers?.perfil_facial
          || null
        );
      }
      if (initialData.arco_actual || initialData.detalles_clinicos?.arco_actual) {
        const incomingArco = initialData.arco_actual || initialData.detalles_clinicos.arco_actual;
        const nextArco = { ...arcoActual, ...(incomingArco || {}) };
        setArcoActual(nextArco);
        setTratamientoActivoResumen(
          normalizeDescriptionText(incomingArco?.resumen_fluido || incomingArco?.resumenFluido)
          || normalizeDescriptionText(initialData.detalles_clinicos?.anamnesis?.resumenes_containers?.tratamiento_activo)
          || buildTratamientoActivoSummary(nextArco, motivoSeleccionado === 'instalacion_inicial')
        );
        setTratamientoActivoUpdatedAt(
          incomingArco?.ultima_modificacion
          || incomingArco?.updated_at
          || initialData.detalles_clinicos?.anamnesis?.ultima_modificacion_containers?.tratamiento_activo
          || null
        );
      }
      if (initialData.detalles_clinicos?.consentimiento_informado?.signed_at) {
        setConsentimientoFirmadoAt(initialData.detalles_clinicos.consentimiento_informado.signed_at);
      }
      // esPrimeraVezOrtodoncia is now computed from motivoSeleccionado
      if (initialData.detalles_clinicos?.proxima_visita) {
        setProximaVisita(initialData.detalles_clinicos.proxima_visita);
      }
      setLastInheritedMeta({
        date: initialData.created_at,
        code: initialData.codigo_consulta || initialData.detalles_clinicos?.codigo_consulta,
        summary: initialData.detalles_clinicos?.workflow_summary?.closure_summary || initialData.detalles_clinicos?.evolucion_clinica || '',
      });
      setPreviousHigieneOral(normalizeHigieneOralLevel(initialData.detalles?.anamnesis?.estadoGeneral?.higieneOral || ''));
      setIsInitialLoadDone(true);
    }
  }, [initialData, isInitialLoadDone, hasInitialConsultationSeed]);

  // Herencia Inteligente: cargar el último estado si no hay initialData
  useEffect(() => {
    const cargarUltimoEstado = async () => {
      if (!hasInitialConsultationSeed && selectedPatient?.id && !isInitialLoadDone) {
        const { data: ultima, error } = await supabase
          .from('consultas_odontologicas')
          .select('id, creado_en, codigo_consulta, estado_odontograma, detalles_clinicos')
          .eq('paciente_id', selectedPatient.id)
          .eq('tipo_consulta', 'ORTODONCIA')
          .order('creado_en', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('No se pudo cargar última consulta:', error);
          setIsInitialLoadDone(true);
          return;
        }

        if (ultima) {
          const normalizedTeethData = normalizeResolvedRecementadoStates(
            ultima.estado_odontograma?.teethData || {},
            ultima.detalles_clinicos?.plan_tratamiento || []
          );
          setOrthoTeethData(normalizedTeethData);
          setOrthoConnections(ultima.estado_odontograma?.connections || []);
          if (Array.isArray(ultima.detalles_clinicos?.ordenes_radiologia)) {
            setRadiologyOrders(ultima.detalles_clinicos.ordenes_radiologia);
          }
          // Restaurar fecha del odontograma de la última consulta
          const lastOdoDate = ultima.estado_odontograma?.last_edit_at || ultima.creado_en;
          if (lastOdoDate) setLastOdontogramEditAt(lastOdoDate);
          setPreviousHigieneOral(normalizeHigieneOralLevel(ultima.detalles_clinicos?.anamnesis?.estadoGeneral?.higieneOral || ''));
          // Cargar arco y perfil facial anteriores
          const dc = ultima.detalles_clinicos || {};
          if (dc.arco_actual) {
            const nextArco = { ...arcoActual, ...dc.arco_actual };
            setArcoActual(nextArco);
            setTratamientoActivoResumen(
              normalizeDescriptionText(dc.arco_actual.resumen_fluido || dc.arco_actual.resumenFluido)
              || normalizeDescriptionText(dc.anamnesis?.resumenes_containers?.tratamiento_activo)
              || buildTratamientoActivoSummary(nextArco, false)
            );
            setTratamientoActivoUpdatedAt(
              dc.arco_actual.ultima_modificacion
              || dc.arco_actual.updated_at
              || dc.anamnesis?.ultima_modificacion_containers?.tratamiento_activo
              || null
            );
          }
          if (dc.perfil_facial) {
            const nextPerfil = { ...perfilFacial, ...dc.perfil_facial };
            setPerfilFacial(nextPerfil);
            setPerfilFacialResumen(
              normalizeDescriptionText(dc.perfil_facial.resumen_fluido || dc.perfil_facial.resumenFluido)
              || normalizeDescriptionText(dc.anamnesis?.resumenes_containers?.perfil_facial)
              || buildPerfilFacialSummary(nextPerfil)
            );
            setPerfilFacialUpdatedAt(
              dc.perfil_facial.ultima_modificacion
              || dc.perfil_facial.updated_at
              || dc.anamnesis?.ultima_modificacion_containers?.perfil_facial
              || null
            );
          }
          if (dc.examen) {
            const nextExamen = { ...examenOrto, ...dc.examen };
            setExamenOrto(nextExamen);
            setOclusionResumen(
              normalizeDescriptionText(dc.examen.resumen_fluido || dc.examen.resumenFluido)
              || normalizeDescriptionText(dc.anamnesis?.resumenes_containers?.evolucion_oclusal)
              || buildOclusionSummary(nextExamen)
            );
            setOclusionUpdatedAt(
              dc.examen.ultima_modificacion
              || dc.examen.updated_at
              || dc.anamnesis?.ultima_modificacion_containers?.evolucion_oclusal
              || null
            );
          }
          setLastInheritedMeta({
            date: ultima.creado_en,
            code: ultima.codigo_consulta || dc.codigo_consulta,
            summary: dc.workflow_summary?.closure_summary || dc.evolucion_clinica || '',
          });
          setMensajeConfirmacion('Cargando base de la cita anterior...');
          setShowConfirmModal(true);
          setTimeout(() => setShowConfirmModal(false), 1800);
        }

        setIsInitialLoadDone(true);
      }
    };

    cargarUltimoEstado();
  }, [selectedPatient?.id, hasInitialConsultationSeed, isInitialLoadDone]);

  // Ocultación limpia de pestañas para evitar artefactos visuales al colapsar paneles
  const getPanelStyle = (visible: boolean): React.CSSProperties => (
    visible ? {} : { display: 'none' }
  );

  // ==========================================================================
  // 3. INTELIGENCIA BIDIRECCIONAL (ODONTOGRAMA -> FORMULARIO)
  // ==========================================================================

  const handleOdontogramaSync = useCallback((hallazgos: any[], rawState?: { teethData?: Record<string, any>, connections?: any[], isUserChange?: boolean }) => {
    if (!hallazgos || !Array.isArray(hallazgos)) return;

    setHallazgosOdontograma(hallazgos);

    if (rawState) {
      setOrthoTeethData(rawState.teethData || {});
      setOrthoConnections(rawState.connections || []);
    }

    // Solo actualizar la fecha si fue una acción real del usuario (no carga inicial)
    if (rawState?.isUserChange === true) {
      setLastOdontogramEditAt(new Date().toISOString());
    }

    // Auto-detección de fallas: actualizar estado de aparatos sin forzar motivo.
    const fallas = hallazgos.filter((h) => String(h?.severidad || '').toLowerCase() === 'recementado');
    if (fallas.length > 0) {
      setEstadoGeneral(prev => ({ ...prev, estadoAparatos: 'Falla mayor' }));
    }
  }, []);

  const odontogramaUltimaModificacion = useMemo(() => {
    const iso = lastOdontogramEditAt || lastInheritedMeta?.date;
    if (!iso) return 'Sin registro';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return 'Sin registro';
    return dt.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [lastOdontogramEditAt, lastInheritedMeta?.date]);

  // 2. AGRUPACIÓN Y SUGERENCIAS DE COBRO INTELIGENTE
  const procedimientosSugeridos = useMemo(() => {
    const sugerencias: Procedimiento[] = [];
    const motivoActivo = motivoSeleccionado || '';

    const fallasAparatologia = hallazgosOdontograma.filter((h) => {
      if (h.severidad === 'recementado_ejecutado') return false;
      const texto = `${h.tipo || ''} ${h.descripcion || ''} ${h.severidad || ''}`.toLowerCase();
      const tieneFalla = ['recementado', 'despegado', 'caido', 'caído'].some((w) => texto.includes(w));
      const aplicaOrto = ['bracket', 'tubo', 'alambre', 'arco'].some((w) => texto.includes(w));
      return tieneFalla && aplicaOrto;
    });

    const recementadosPendientes = fallasAparatologia.filter((h) => {
      if (h.severidad === 'recementado_ejecutado') return false;
      const texto = `${h.tipo || ''} ${h.descripcion || ''} ${h.severidad || ''}`.toLowerCase();
      return h.severidad === 'recementado' || texto.includes('recementado') || texto.includes('despegado');
    });

    const piezasFalla = Array.from(new Set(recementadosPendientes.map((f) => String(f.diente || '')).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
    const totalFallas = recementadosPendientes.length;
    const gratisDisponibles = Math.max(0, RECEMENTADOS_GRATIS - recementadosContador);
    const recementadosGratis = Math.min(totalFallas, gratisDisponibles);
    const recementadosCobrables = Math.max(0, totalFallas - recementadosGratis);
    const costoRecementado = recementadosCobrables * PRECIO_RECEMENTADO;
    const piezasTexto = piezasFalla.length > 0 ? piezasFalla.join(', ') : 'por confirmar';

    if (motivoActivo === 'control') {
      sugerencias.push({
        id: 'sug-motivo-control-base',
        nombre: 'Control Mensual de Ortodoncia',
        pieza: 'General',
        accesorio: 'Consulta',
        observaciones: 'Consulta de control mensual regular',
        fecha: new Date().toLocaleDateString(),
        estado: 'sugerido',
        costo: TARIFAS_ORTODONCIA.CONTROL_MENSUAL,
        costoPendiente: false,
        precioNoAplica: false,
        migradoDesdeOdontograma: false,
        hallazgoOrigen: 'motivo-control-base',
        tipoHallazgo: 'Control mensual',
      });

      if (totalFallas > 0) {
        sugerencias.push({
          id: 'sug-motivo-control-recementado',
          nombre: 'Recementado de Brackets/Tubos detectados en Control',
          pieza: piezasTexto,
          accesorio: `${totalFallas} evento(s)`,
          observaciones: `Control mensual con novedad: ${totalFallas} evento(s). Cortesía disponible: ${recementadosGratis}. Cobrables: ${recementadosCobrables} x ${formatCOP(PRECIO_RECEMENTADO)}.`,
          fecha: new Date().toLocaleDateString(),
          estado: 'sugerido',
          costo: costoRecementado,
          costoPendiente: false,
          precioNoAplica: costoRecementado === 0,
          migradoDesdeOdontograma: true,
          hallazgoOrigen: 'motivo-control-recementado',
          tipoHallazgo: 'Recementado por falla',
        });
      }
    }

    if (motivoActivo === 'bracket_caido') {
      if (totalFallas > 0) {
        sugerencias.push({
          id: 'sug-motivo-bracket-recementado',
          nombre: 'Recementado de Brackets/Tubos',
          pieza: piezasTexto,
          accesorio: `${totalFallas} evento(s)`,
          observaciones: `Se documentan ${totalFallas} evento(s) de recementado. Cortesía disponible: ${recementadosGratis}. Cobrables: ${recementadosCobrables} x ${formatCOP(PRECIO_RECEMENTADO)}.`,
          fecha: new Date().toLocaleDateString(),
          estado: 'sugerido',
          costo: costoRecementado,
          costoPendiente: false,
          precioNoAplica: costoRecementado === 0,
          migradoDesdeOdontograma: true,
          hallazgoOrigen: 'motivo-bracket-recementado',
          tipoHallazgo: 'Recementado por desprendimiento',
        });
      } else {
        sugerencias.push({
          id: 'sug-motivo-bracket-recementado-manual',
          nombre: 'Recementado de Bracket/Tubo (pendiente de pieza)',
          pieza: 'Por confirmar',
          accesorio: 'Bracket/Tubo',
          observaciones: 'No hay hallazgo activo en odontograma; confirmar pieza clínica antes de ejecutar.',
          fecha: new Date().toLocaleDateString(),
          estado: 'sugerido',
          costo: gratisDisponibles > 0 ? 0 : PRECIO_RECEMENTADO,
          costoPendiente: true,
          precioNoAplica: gratisDisponibles > 0,
          migradoDesdeOdontograma: false,
          hallazgoOrigen: 'motivo-bracket-recementado-manual',
          tipoHallazgo: 'Recementado a confirmar',
        });
      }
    }

    if (['alambre_danado', 'dolor', 'ajuste', 'emergencia', 'retenedores'].includes(motivoActivo)) {
      const nombreConsulta: Record<string, string> = {
        alambre_danado: 'Consulta por Alambre Dañado/Pinchando',
        dolor: 'Consulta por Dolor/Molestia Ortodóntica',
        ajuste: 'Consulta por Ajuste de Aparatología',
        emergencia: 'Consulta por Emergencia Ortodóntica',
        retenedores: 'Consulta por Control de Retenedores',
      };
      sugerencias.push({
        id: `sug-motivo-${motivoActivo}-consulta`,
        nombre: nombreConsulta[motivoActivo] || 'Consulta Ortodóntica',
        pieza: 'General',
        accesorio: 'Consulta',
        observaciones: 'Definir si aplica cobro adicional o dejar N/A según criterio clínico/comercial.',
        fecha: new Date().toLocaleDateString(),
        estado: 'sugerido',
        costo: 0,
        costoPendiente: true,
        precioNoAplica: false,
        migradoDesdeOdontograma: false,
        hallazgoOrigen: `motivo-${motivoActivo}-consulta`,
        tipoHallazgo: 'Consulta clínica',
      });
    }

    return sugerencias.filter((sug) => {
      const sugKey = buildProcedureStableKey({ ...sug, costoMaterial: sug.costoMaterial ?? 0 }, selectedPatient?.id);
      return !procedimientos.some((p) => {
        if (sug.hallazgoOrigen && p.hallazgoOrigen === sug.hallazgoOrigen) return true;
        return buildProcedureStableKey({ ...p, costoMaterial: p.costoMaterial ?? 0 }, selectedPatient?.id) === sugKey;
      });
    });
  }, [hallazgosOdontograma, procedimientos, motivoSeleccionado, selectedPatient?.id, recementadosContador, RECEMENTADOS_GRATIS, PRECIO_RECEMENTADO]);

  // Limpieza de procedimientos si se borran en el odontograma
  useEffect(() => {
    if (hallazgosOdontograma.length >= 0) {
      setProcedimientos(prev => prev.filter(proc => {
        if (!proc.migradoDesdeOdontograma) return true; 
        if (proc.estado === 'realizado' || proc.estado === 'aprobado') return true; 
        if (String(proc.hallazgoOrigen || '').startsWith('motivo-')) return true;
        if (proc.hallazgoOrigen === 'multiple-fallas') return hallazgosOdontograma.filter(h => h.id.startsWith('falla-')).length > 1;
        return hallazgosOdontograma.some(h => h.id === proc.hallazgoOrigen);
      }));
    }
  }, [hallazgosOdontograma]);

  // Novedad automática: cuando se marca recementado en odontograma, se refleja en procedimientos
  useEffect(() => {
    const fallasRecementado = hallazgosOdontograma.filter((hallazgo) => {
      if (hallazgo.severidad !== 'recementado') return false;
      const detalle = `${hallazgo.tipo || ''} ${hallazgo.descripcion || ''}`.toLowerCase();
      return detalle.includes('bracket') || detalle.includes('tubo');
    });

    setProcedimientos((prev) => {
      const keep = prev.filter((proc) => {
        const origen = String(proc.hallazgoOrigen || '');
        if (!origen.startsWith('motivo-auto-recementado')) return true;
        return proc.estado === 'realizado' || proc.estado === 'aprobado';
      });

      if (fallasRecementado.length === 0) return keep;

      const piezas = Array.from(new Set(
        fallasRecementado
          .map((hallazgo) => String(hallazgo.diente || '').trim())
          .filter(Boolean)
      )).sort((a, b) => Number(a) - Number(b));

      const totalFallas = fallasRecementado.length;
      const gratisDisponibles = Math.max(0, RECEMENTADOS_GRATIS - recementadosContador);
      const recementadosGratis = Math.min(totalFallas, gratisDisponibles);
      const recementadosCobrables = Math.max(0, totalFallas - recementadosGratis);
      const costoRecementado = recementadosCobrables * PRECIO_RECEMENTADO;
      const piezasTexto = piezas.length > 0 ? piezas.join(', ') : 'por confirmar';

      const hallazgoOrigen = `motivo-auto-recementado-${piezas.join('-') || 'sin-piezas'}-${totalFallas}`;
      if (keep.some((proc) => proc.hallazgoOrigen === hallazgoOrigen)) {
        return keep;
      }

      const autoNovedad: Procedimiento = {
        id: `auto_rec_${crypto.randomUUID()}`,
        nombre: 'Recementado de Brackets/Tubos (Novedad de Odontograma)',
        pieza: piezasTexto,
        accesorio: `${totalFallas} evento(s)`,
        observaciones: `Novedad automática detectada. Cortesía disponible: ${recementadosGratis}. Cobrables: ${recementadosCobrables} x ${formatCOP(PRECIO_RECEMENTADO)}.`,
        fecha: new Date().toLocaleDateString(),
        estado: 'sugerido',
        costo: costoRecementado,
        costoMaterial: 0,
        costoPendiente: false,
        precioNoAplica: costoRecementado === 0,
        migradoDesdeOdontograma: true,
        hallazgoOrigen,
        tipoHallazgo: 'Recementado por falla',
      };

      return [autoNovedad, ...keep];
    });
  }, [hallazgosOdontograma, recementadosContador, RECEMENTADOS_GRATIS, PRECIO_RECEMENTADO]);


  // ==========================================================================
  // 4. OTROS MEMOS Y HANDLERS
  // ==========================================================================

  const resultadosCie10 = useMemo(() => {
    const term = busquedaCie10.trim().toLowerCase();
    if (!term) return CIE10_ORTODONCIA.slice(0, 12);
    return CIE10_ORTODONCIA.filter((cie) =>
      cie.codigo.toLowerCase().includes(term)
      || cie.nombre.toLowerCase().includes(term)
    );
  }, [busquedaCie10]);

  const resumenFinanciero = useMemo(() => {
    return procedimientos.reduce((totales, proc) => {
      const precioComputable = !proc.costoPendiente && !proc.precioNoAplica;
      const costoValido = precioComputable ? Math.max(0, Number(proc.costo) || 0) : 0;
      const matValido   = Math.max(0, Number(proc.costoMaterial) || 0);
      if (proc.estado === 'presupuestado' || proc.estado === 'sugerido' || proc.estado === 'aprobado') totales.presupuesto += costoValido;
      else if (proc.estado === 'realizado') { totales.realizadoHoy += costoValido; totales.totalMateriales += matValido; }
      return totales;
    }, { presupuesto: 0, realizadoHoy: 0, totalMateriales: 0 });
  }, [procedimientos]);

  const pendientesEjecutablesCount = useMemo(
    () => procedimientos.filter((p) => ['sugerido', 'presupuestado', 'aprobado'].includes(p.estado) && (!p.costoPendiente || p.precioNoAplica)).length,
    [procedimientos]
  );

  const TARIFA_BASE_CONTROL_ORTODONCIA = 50000;
  const TARIFA_RECEMENTADO_BRACKET = PRECIO_RECEMENTADO;

  const hallazgosBracketDesprendido = useMemo(() => {
    return hallazgosOdontograma.filter((hallazgo) => {
      if (hallazgo.severidad === 'recementado_ejecutado') return false;
      const detalle = `${hallazgo.tipo || ''} ${hallazgo.descripcion || ''} ${hallazgo.severidad || ''}`.toLowerCase();
      const esFalla = detalle.includes('recementado') || detalle.includes('despegado') || detalle.includes('caido') || detalle.includes('caído');
      const comprometeBracket = detalle.includes('bracket') || detalle.includes('tubo');
      return esFalla && comprometeBracket;
    });
  }, [hallazgosOdontograma]);

  const recargosPorBracketsDesprendidos = hallazgosBracketDesprendido.length * TARIFA_RECEMENTADO_BRACKET;
  const totalEstimadoSesionDocumentada = TARIFA_BASE_CONTROL_ORTODONCIA + recargosPorBracketsDesprendidos;

  const hallazgoToSuggestion = useCallback((hallazgo: HallazgoOdontograma) => {
    const tag = `${hallazgo.tipo || ''} ${hallazgo.descripcion || ''} ${hallazgo.severidad || ''}`.toLowerCase();
    const esSistemaActivo =
      (hallazgo.severidad === 'instalado' || tag.includes('sistema activo')) &&
      ['arco', 'cadeneta', 'resorte', 'sistema'].some((word) => tag.includes(word));

    if (esSistemaActivo) {
      return null;
    }

    if (hallazgo.severidad === 'recementado_ejecutado') {
      return {
        nombre: `Recementado documentado - Pieza ${hallazgo.diente}`,
        precio: 0,
        cara: hallazgo.cara || 'V',
        hallazgo: hallazgo.tipo || 'recementado ejecutado'
      };
    }
    if (tag.includes('retirado') || tag.includes('retiro')) {
      return { nombre: 'Registro de Retiro de Aparatología', precio: 0, cara: hallazgo.cara || 'General', hallazgo: hallazgo.tipo || 'retiro clínico documentado' };
    }
    if (tag.includes('caries')) {
      return { nombre: 'Resina Clase I', precio: 120000, cara: 'O', hallazgo: 'caries' };
    }
    if (hallazgo.severidad === 'recementado' || tag.includes('recementado') || tag.includes('despegado')) {
      // Contador: primeros RECEMENTADOS_GRATIS son gratis, luego PRECIO_RECEMENTADO c/u
      const gratisRestantes = Math.max(0, RECEMENTADOS_GRATIS - recementadosContador);
      const estaConsultaEsGratis = gratisRestantes > 0;
      const precio = estaConsultaEsGratis ? 0 : PRECIO_RECEMENTADO;
      const labelContador = estaConsultaEsGratis
        ? ` (${gratisRestantes} gratis restante${gratisRestantes !== 1 ? 's' : ''})`
        : ` (tarifa normal - ${formatCOP(PRECIO_RECEMENTADO)})`;
      return {
        nombre: `Recementado de Bracket - Pieza ${hallazgo.diente}${labelContador}`,
        precio,
        cara: hallazgo.cara || 'V',
        hallazgo: hallazgo.tipo || 'bracket despegado'
      };
    }
    if (tag.includes('arco') || tag.includes('alambre')) {
      return { nombre: 'Cambio de Arco', precio: 70000, cara: 'General', hallazgo: hallazgo.tipo || 'ajuste de arco' };
    }
    if (tag.includes('placa') || tag.includes('higiene')) {
      return { nombre: 'Profilaxis y Fluorizacion', precio: 90000, cara: 'General', hallazgo: hallazgo.tipo || 'compromiso de higiene' };
    }
    return { nombre: 'Control Ortodontico Mensual', precio: 120000, cara: 'General', hallazgo: hallazgo.tipo || 'hallazgo clinico' };
  }, [recementadosContador]);

  const hallazgoSmartSuggestions = useMemo(() => {
    return hallazgosOdontograma.map((hallazgo) => {
      const suggestion = hallazgoToSuggestion(hallazgo);
      if (!suggestion) return null;
      return {
        pieza: hallazgo.diente || 'N/A',
        hallazgo: suggestion.hallazgo,
        sugerencia: suggestion.nombre,
        precio: suggestion.precio,
        cara: suggestion.cara,
      };
    }).filter(Boolean) as Array<{ pieza: string; hallazgo: string; sugerencia: string; precio: number; cara: string }>;
  }, [hallazgosOdontograma, hallazgoToSuggestion]);

  const hallazgosPendientesTexto = useMemo(() => {
    if (!hallazgoSmartSuggestions.length) {
      return 'Hallazgos pendientes: sin novedades detectadas en odontograma para este control.';
    }
    const list = hallazgoSmartSuggestions
      .slice(0, 4)
      .map((item) => `${item.hallazgo} en pieza ${item.pieza}`)
      .join(', ');
    return `Hallazgos pendientes: ${list}.`;
  }, [hallazgoSmartSuggestions]);

  // Análisis inteligente del odontograma para pricing automático
  const analisisOdontogramaParaProcedimientos = useMemo(() => {
    const dientes = Object.values(orthoTeethData || {});
    const bracketsSuperiores = dientes.filter((d: any) => {
      const num = parseInt(String(d.number || '0'));
      return num >= 11 && num <= 28 && Object.values(d.faces || {}).some((f: any) => f?.base);
    });
    const bracketsInferiores = dientes.filter((d: any) => {
      const num = parseInt(String(d.number || '0'));
      return num >= 31 && num <= 48 && Object.values(d.faces || {}).some((f: any) => f?.base);
    });
    const totalBrackets = bracketsSuperiores.length + bracketsInferiores.length;

    const bracketsCaidosHallazgos = hallazgosOdontograma.filter((h) => {
      if (h.severidad === 'recementado_ejecutado') return false;
      const texto = `${h.severidad || ''} ${h.tipo || ''} ${h.descripcion || ''}`.toLowerCase();
      const esFalla = ['recementado', 'despegado', 'caido', 'caído'].some((s) => texto.includes(s));
      const esEventoOrto = ['bracket', 'tubo', 'alambre', 'arco'].some((s) => texto.includes(s));
      return esFalla && esEventoOrto;
    });

    return {
      bracketsSuperiores: bracketsSuperiores.length,
      bracketsInferiores: bracketsInferiores.length,
      totalBrackets,
      bracketsCaidos: bracketsCaidosHallazgos.length,
      bracketsCaidosDetalle: bracketsCaidosHallazgos, // Array completo para uso en migración
      tieneSuperiores: bracketsSuperiores.length > 0,
      tieneInferiores: bracketsInferiores.length > 0,
      esArcoCompleto: totalBrackets >= 20, // Consideramos completo si tiene al menos 20 brackets
    };
  }, [orthoTeethData, hallazgosOdontograma]);

  // ═══════════════════════════════════════════════════════════════════
  // MÓDULO DIAMOND: SMART RX TRIGGERS Y GENERADOR DE CONSENTIMIENTOS
  // ═══════════════════════════════════════════════════════════════════

  // Memoria de Smart RX Suggestions basado en Motivo
  const radiologiaSugerida = useMemo(() => {
    if (!motivoSeleccionado) return { tipos: [], justificacion: '' };
    
    const triggers = RADIOLOGIA_SMART_TRIGGERS[motivoSeleccionado] || {
      tipos: [],
      justificacion: 'No hay indicación radiográfica actualmente.'
    };
    
    return triggers;
  }, [motivoSeleccionado]);

  const piezasRxDesdeOdontograma = useMemo(() => {
    return Object.values(orthoTeethData || {})
      .filter((diente: any) => !diente?.ausente && Boolean(diente?.diagnosticos?.rx_req) && Boolean(diente?.number))
      .map((diente: any) => String(diente.number))
      .sort((a, b) => Number(a) - Number(b));
  }, [orthoTeethData]);

  const detalleRxDesdeOdontograma = useMemo(() => {
    const hallazgos = Array.isArray(hallazgosOdontograma) ? hallazgosOdontograma : [];
    return piezasRxDesdeOdontograma.map((pieza) => {
      const hallazgosPieza = hallazgos.filter((h: any) => String(h?.diente || '') === pieza);
      const caras = Array.from(new Set(hallazgosPieza.map((h: any) => String(h?.cara || '').trim()).filter(Boolean)));
      return {
        pieza,
        caras,
        hallazgos: hallazgosPieza.map((h: any) => String(h?.descripcion || h?.tipo || '')).filter(Boolean),
      };
    });
  }, [piezasRxDesdeOdontograma, hallazgosOdontograma]);

  // Generador de Consentimiento Dinámico por Escenario
  const generarConsentimiento = useCallback((tipoRx: string, motivo: string): string => {
    // Primero verifica si hay un template específico por motivo
    if (CONSENTIMIENTO_TEMPLATES[motivo]) {
      return CONSENTIMIENTO_TEMPLATES[motivo];
    }
    
    // Luego verifica si hay coincidencias en palabras clave
    if (motivo.includes('exodoncia') || tipoRx.includes('Pre-extracción')) {
      return CONSENTIMIENTO_TEMPLATES['exodoncia'];
    }
    
    if (motivo.includes('reabsorcion') || motivo === 'dolor') {
      return CONSENTIMIENTO_TEMPLATES['reabsorcion'];
    }
    
    // Default: template general
    return CONSENTIMIENTO_TEMPLATES['general'];
  }, []);

  // Generador de Justificación Automática para Orden RX
  const generarJustificacionRx = useCallback((tipoRx: string, motivo: string, dientesAfectados?: string[]): string => {
    const pacienteNombre = selectedPatient?.nombre || 'Paciente';
    const fechaFormato = new Date().toLocaleDateString('es-CO', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const baseText = `Se solicita estudio radiográfico de ${tipoRx} del paciente ${pacienteNombre} (${fechaFormato}).`;
    
    const motivoTextos: Record<string, string> = {
      instalacion_inicial: 'Motivo: Instalación inicial de aparatología ortodóncica. Se requiere registro basal completo para análisis cefalométrico, evaluación del desarrollo óseo dental y planificación del tratamiento.',
      control: 'Motivo: Control mensual de rutina. Evaluación de progreso del tratamiento.',
      bracket_caido: `Motivo: Caída de bracket en pieza(s) ${dientesAfectados?.join(', ') || 'X'}. Se requiere valorar integridad radicular y soporte óseo para descartar patología subyacente.`,
      dolor: 'Motivo: Dolor o molestia con aparatología. Se requiere descartar reabsorción radicular, contacto anómalo con estructuras óseas/dentales, o trauma local.',
      alambre_danado: 'Motivo: Alambre dañado o pinchando. Se requiere valorar si existe lesión radicular o trauma óseo secundario.',
      emergencia: 'Motivo: Emergencia ortodóncica. Se requiere evaluación radiográfica urgente para determinar causa y plan de intervención inmediato.',
      ajuste: 'Motivo: Ajuste de aparatología. Sin indicación radiográfica actualmente.',
      retenedores: 'Motivo: Control de retenedores post-tratamiento. Sin indicación radiográfica actualmente.',
    };
    
    const motivoTexto = motivoTextos[motivo] || 'Evaluación diagnóstica.';
    return `${baseText} ${motivoTexto}`;
  }, [selectedPatient]);

  // Procedimiento automático basado en análisis del odontograma y motivo clínico
  const procedimientoAutomaticoOrtodoncia = useMemo(() => {
    if (esPrimeraVezOrtodoncia && analisisOdontogramaParaProcedimientos.totalBrackets > 0) {
      // Primera vez: calcular según arcos instalados
      const items: Procedimiento[] = [];
      
      if (analisisOdontogramaParaProcedimientos.tieneSuperiores && analisisOdontogramaParaProcedimientos.tieneInferiores) {
        items.push({
          id: 'auto-instalacion-completa',
          nombre: 'Instalación Completa de Aparatología Ortodóntica',
          pieza: 'Ambos arcos',
          accesorio: `${analisisOdontogramaParaProcedimientos.totalBrackets} brackets`,
          observaciones: `Superior: ${analisisOdontogramaParaProcedimientos.bracketsSuperiores} brackets, Inferior: ${analisisOdontogramaParaProcedimientos.bracketsInferiores} brackets`,
          fecha: new Date().toLocaleDateString(),
          estado: 'presupuestado',
          costo: TARIFAS_ORTODONCIA.BRACKET_COMPLETO_AMBOS,
          migradoDesdeOdontograma: true,
          hallazgoOrigen: 'primera-instalacion-completa',
          tipoHallazgo: 'Instalación inicial'
        });
      } else if (analisisOdontogramaParaProcedimientos.tieneSuperiores) {
        items.push({
          id: 'auto-instalacion-superior',
          nombre: 'Instalación de Aparatología - Arco Superior',
          pieza: 'Superior',
          accesorio: `${analisisOdontogramaParaProcedimientos.bracketsSuperiores} brackets`,
          observaciones: `Instalación inicial arco superior`,
          fecha: new Date().toLocaleDateString(),
          estado: 'presupuestado',
          costo: TARIFAS_ORTODONCIA.BRACKET_SUPERIOR_COMPLETO,
          migradoDesdeOdontograma: true,
          hallazgoOrigen: 'primera-instalacion-superior',
          tipoHallazgo: 'Instalación inicial superior'
        });
      } else if (analisisOdontogramaParaProcedimientos.tieneInferiores) {
        items.push({
          id: 'auto-instalacion-inferior',
          nombre: 'Instalación de Aparatología - Arco Inferior',
          pieza: 'Inferior',
          accesorio: `${analisisOdontogramaParaProcedimientos.bracketsInferiores} brackets`,
          observaciones: `Instalación inicial arco inferior`,
          fecha: new Date().toLocaleDateString(),
          estado: 'presupuestado',
          costo: TARIFAS_ORTODONCIA.BRACKET_INFERIOR_COMPLETO,
          migradoDesdeOdontograma: true,
          hallazgoOrigen: 'primera-instalacion-inferior',
          tipoHallazgo: 'Instalación inicial inferior'
        });
      }
      
      return items;
    } else if (!esPrimeraVezOrtodoncia) {
      // Consulta no inicial: sugerencias por motivo SIN ejecutar automáticamente.
      const items: Procedimiento[] = [];
      const motivoActivo = motivoSeleccionado || '';
      if (!motivoActivo) return [];

      const fallasRecementado = (analisisOdontogramaParaProcedimientos.bracketsCaidosDetalle || []).filter((h: any) => {
        const text = `${h?.severidad || ''} ${h?.tipo || ''} ${h?.descripcion || ''}`.toLowerCase();
        return String(h?.severidad || '').toLowerCase() === 'recementado' || text.includes('recementado') || text.includes('despegado');
      });
      const totalFallas = fallasRecementado.length;
      const gratisDisponibles = Math.max(0, RECEMENTADOS_GRATIS - recementadosContador);
      const recementadosGratis = Math.min(totalFallas, gratisDisponibles);
      const recementadosCobrables = Math.max(0, totalFallas - recementadosGratis);
      const costoRecementado = recementadosCobrables * PRECIO_RECEMENTADO;
      const piezasDetectadas = Array.from(new Set(
        fallasRecementado.map((h: any) => String(h?.diente || '')).filter(Boolean)
      )).sort((a, b) => Number(a) - Number(b));
      const piezasTexto = piezasDetectadas.length > 0 ? piezasDetectadas.join(', ') : 'por confirmar';

      if (motivoActivo === 'control') {
        items.push({
          id: 'auto-control-mensual-base',
          nombre: 'Control Mensual de Ortodoncia',
          pieza: 'General',
          accesorio: 'Consulta',
          observaciones: 'Control mensual normal de seguimiento clínico',
          fecha: new Date().toLocaleDateString(),
          estado: 'sugerido',
          costo: TARIFAS_ORTODONCIA.CONTROL_MENSUAL,
          costoPendiente: false,
          precioNoAplica: false,
          migradoDesdeOdontograma: false,
          hallazgoOrigen: 'motivo-control-base',
          tipoHallazgo: 'Control mensual',
        });

        if (totalFallas > 0) {
          items.push({
            id: 'auto-control-mensual-recementado',
            nombre: 'Recementado de Brackets/Tubos detectados en Control',
            pieza: piezasTexto,
            accesorio: `${totalFallas} evento(s)`,
            observaciones: `Novedad durante control mensual. Cortesía disponible: ${recementadosGratis}. Cobrables: ${recementadosCobrables} x ${formatCOP(PRECIO_RECEMENTADO)}.`,
            fecha: new Date().toLocaleDateString(),
            estado: 'sugerido',
            costo: costoRecementado,
            costoPendiente: false,
            precioNoAplica: costoRecementado === 0,
            migradoDesdeOdontograma: true,
            hallazgoOrigen: 'motivo-control-recementado',
            tipoHallazgo: 'Recementado por falla',
          });
        }
      }

      if (motivoActivo === 'bracket_caido') {
        items.push({
          id: 'auto-bracket-caido-recementado',
          nombre: 'Recementado de Brackets/Tubos',
          pieza: piezasTexto,
          accesorio: `${Math.max(totalFallas, 1)} evento(s)`,
          observaciones: totalFallas > 0
            ? `Consulta por bracket/tubo caído. Cortesía disponible: ${recementadosGratis}. Cobrables: ${recementadosCobrables} x ${formatCOP(PRECIO_RECEMENTADO)}.`
            : 'No hay piezas activas en odontograma; confirmar pieza antes de ejecutar.',
          fecha: new Date().toLocaleDateString(),
          estado: 'sugerido',
          costo: totalFallas > 0 ? costoRecementado : (gratisDisponibles > 0 ? 0 : PRECIO_RECEMENTADO),
          costoPendiente: totalFallas === 0,
          precioNoAplica: (totalFallas > 0 && costoRecementado === 0) || (totalFallas === 0 && gratisDisponibles > 0),
          migradoDesdeOdontograma: true,
          hallazgoOrigen: 'motivo-bracket-recementado',
          tipoHallazgo: 'Recementado por desprendimiento',
        });
      }

      if (['alambre_danado', 'dolor', 'ajuste', 'emergencia', 'retenedores'].includes(motivoActivo)) {
        const nombrePorMotivo: Record<string, string> = {
          alambre_danado: 'Consulta por Alambre Dañado/Pinchando',
          dolor: 'Consulta por Dolor/Molestia Ortodóntica',
          ajuste: 'Consulta por Ajuste de Aparatología',
          emergencia: 'Consulta por Emergencia Ortodóntica',
          retenedores: 'Consulta por Control de Retenedores',
        };
        items.push({
          id: `auto-consulta-${motivoActivo}`,
          nombre: nombrePorMotivo[motivoActivo] || 'Consulta Ortodóntica',
          pieza: 'General',
          accesorio: 'Consulta',
          observaciones: 'Consulta clínica. Definir cobro manual o marcar N/A según criterio de la sesión.',
          fecha: new Date().toLocaleDateString(),
          estado: 'sugerido',
          costo: 0,
          costoPendiente: true,
          precioNoAplica: false,
          migradoDesdeOdontograma: false,
          hallazgoOrigen: `motivo-${motivoActivo}-consulta`,
          tipoHallazgo: 'Consulta clínica',
        });
      }

      return items;
    }
    
    return [];
  }, [esPrimeraVezOrtodoncia, analisisOdontogramaParaProcedimientos, motivoSeleccionado, recementadosContador, RECEMENTADOS_GRATIS, PRECIO_RECEMENTADO]);

  const procedureAutocomplete = useMemo(() => {
    const term = String(nuevoProcedimiento.nombre || '').trim().toLowerCase();
    if (!term) return PROCEDURE_CATALOG.slice(0, 6);
    return PROCEDURE_CATALOG.filter((item) =>
      item.nombre.toLowerCase().includes(term) || item.keys.some((key) => key.includes(term))
    ).slice(0, 8);
  }, [nuevoProcedimiento.nombre]);

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
      .filter((item) => !currentProcedureKeys.has(item.stableKey))
      .slice(0, 6);
  }, [selectedPatient?.consultas, selectedPatient?.id, currentProcedureKeys]);

  const sessionNarrative = useMemo(() => {
    let draft = '';
    draft = appendAutoNote(draft, `Control ortodontico para ${selectedPatient?.nombre || 'paciente'} ${selectedPatient?.apellidos || ''}.`);
    if (motivo) draft = appendAutoNote(draft, `Motivo de consulta: ${motivo}.`);
    if (estadoGeneral.estadoAparatos) draft = appendAutoNote(draft, `Estado general de aparatologia: ${estadoGeneral.estadoAparatos}.`);
    procedimientos
      .filter((procedure) => ['aprobado', 'realizado'].includes(String(procedure.estado).toLowerCase()))
      .forEach((procedure) => {
        draft = appendAutoNote(draft, generateAutoNote({
          tool: procedure.nombre || procedure.accesorio,
          tooth: procedure.pieza,
          surface: procedure.accesorio,
          kind: 'ORTODONCIA',
        }));
      });
    if (persistentPlan.length > 0) {
      draft = appendAutoNote(draft, `Pendientes longitudinales activos: ${persistentPlan.slice(0, 3).map((item) => item.nombre).join(', ')}.`);
    }
    return draft;
  }, [selectedPatient?.nombre, selectedPatient?.apellidos, motivo, estadoGeneral.estadoAparatos, procedimientos, persistentPlan]);
  
  const irATratamientosTop = useCallback(() => {
    setActiveTab('procedimientos');
    setTimeout(() => {
      workAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 30);
  }, []);

  // ── GENERADOR DE EVOLUCIÓN AUTOMÁTICA (Enfoque clínico profesional) ──────
  const generateEvolucionAutomatica = useMemo(() => {
    const parrafos: string[] = [];
    const fechaActual = new Date();
    const diaSesion = fechaActual.getDate();
    const mesSesion = fechaActual.toLocaleDateString('es-CO', { month: 'long' });
    const anioSesion = fechaActual.getFullYear();
    const horaSesion = fechaActual.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const pacienteNombre = `${selectedPatient?.nombre || 'Paciente'} ${selectedPatient?.apellidos || ''}`.trim();
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
    const docId = (selectedPatient as any)?.cc
      || (selectedPatient as any)?.documento
      || (selectedPatient as any)?.identificacion
      || (selectedPatient as any)?.cedula
      || '';
    const motivoPrincipal = motivoSeleccionado
      ? (motivoSeleccionado === 'otro'
        ? (motivo.trim() || 'Otro motivo no especificado')
        : (MOTIVO_LABELS[motivoSeleccionado] || motivoSeleccionado))
      : (motivo.trim() || motivoInteligente || 'control de ortodoncia');

    const TOOL_NAMES: Record<string, string> = {
      bracket_metal: 'Bracket Metálico',
      bracket_zafiro: 'Bracket Estético',
      bracket_autoligable: 'Bracket Autoligable',
      tubo: 'Tubo Molar',
      banda: 'Banda Ortodóntica',
      modulo: 'Módulo',
      ligadura_metalica: 'Ligadura Metálica',
      boton: 'Botón',
      bite_turbo: 'Bite Turbo',
      arco_niti: 'Arco NiTi',
      arco_acero: 'Arco Acero',
      cadeneta: 'Cadeneta',
      resorte: 'Resorte',
    };
    const FACE_NAMES: Record<string, string> = {
      vestibular: 'vestibular',
      lingual: 'lingual',
      oclusal: 'oclusal',
      mesial: 'mesial',
      distal: 'distal',
    };

    const formatPiezas = (items: string[]) => {
      const piezas = [...new Set(items)].sort((a, b) => Number(a) - Number(b));
      if (piezas.length === 0) return '';
      if (piezas.length === 1) return piezas[0];
      if (piezas.length === 2) return `${piezas[0]} y ${piezas[1]}`;
      return `${piezas.slice(0, -1).join(', ')} y ${piezas[piezas.length - 1]}`;
    };
    const formatPiezasComa = (items: string[]) => {
      const piezas = [...new Set(items)].sort((a, b) => Number(a) - Number(b));
      return piezas.join(', ');
    };

    const parseIso = (iso?: string | null) => {
      if (!iso) return null;
      const ts = new Date(iso).getTime();
      return Number.isNaN(ts) ? null : ts;
    };

    const referenciaSesionIso = initialData?.created_at || lastInheritedMeta?.date || null;
    const referenciaTs = parseIso(referenciaSesionIso);
    const fueActualizadoEnEstaCita = (iso?: string | null) => {
      const updatedTs = parseIso(iso);
      if (!updatedTs) return false;
      if (!referenciaTs) return true;
      return updatedTs > (referenciaTs + 60_000);
    };

    const cambioFacial = fueActualizadoEnEstaCita(perfilFacialUpdatedAt);
    const cambioTratamiento = fueActualizadoEnEstaCita(tratamientoActivoUpdatedAt);
    const cambioOclusion = fueActualizadoEnEstaCita(oclusionUpdatedAt);

    const identificacion = docId ? `${docTypeLabel} número ${docId}` : 'documento no registrado';
    parrafos.push(`El paciente ${pacienteNombre}, identificado con ${identificacion}, asiste el día ${diaSesion} del mes de ${mesSesion} de ${anioSesion}, a las ${horaSesion}, por ${motivoPrincipal.toLowerCase()}.`);

    const teethDataForNarrative = normalizeResolvedRecementadoStates(orthoTeethData || {}, procedimientos || []);
    const inventarioBase: Record<string, { toolName: string; porCara: Record<string, Set<string>> }> = {};
    const inventarioAux: Record<string, Set<string>> = {};
    let totalBasesCount = 0;
    const fallasActivas: Array<{ diente: string; cara: string; toolId: string }> = [];
    const piezasConBaseSet = new Set<string>();

    Object.values(teethDataForNarrative || {}).forEach((d: any) => {
      if (d?.ausente) return;
      const toothNum = String(d?.number || '');
      Object.entries(d?.faces || {}).forEach(([faceName, faceData]: [string, any]) => {
        if (faceData?.base) {
          totalBasesCount++;
          piezasConBaseSet.add(toothNum);
          const toolId = faceData.base.id || 'bracket_metal';
          const toolName = TOOL_NAMES[toolId] || toolId;
          const cara = FACE_NAMES[faceName] || faceName;
          if (!inventarioBase[toolId]) inventarioBase[toolId] = { toolName, porCara: {} };
          if (!inventarioBase[toolId].porCara[cara]) inventarioBase[toolId].porCara[cara] = new Set<string>();
          inventarioBase[toolId].porCara[cara].add(toothNum);
          if (faceData.base.state === 'recementado') {
            fallasActivas.push({ diente: toothNum, cara, toolId });
          }
        }
        (faceData?.auxiliares || []).forEach((aux: any) => {
          const toolName = TOOL_NAMES[aux.id] || aux.id;
          if (!inventarioAux[toolName]) inventarioAux[toolName] = new Set<string>();
          inventarioAux[toolName].add(toothNum);
        });
      });
    });

    const piezasConBase = Array.from(piezasConBaseSet).sort((a, b) => Number(a) - Number(b));
    const conexionesActivas = orthoConnections.filter((c: any) => c.state === 'instalado');

    if (totalBasesCount > 0) {
      const esBracketTool = (toolId: string) => toolId.startsWith('bracket_');
      const desgloseBase = Object.entries(inventarioBase)
        .map(([toolId, data]) => {
          const bloques = Object.entries(data.porCara)
            .map(([cara, piezasSet]) => {
              const piezas = formatPiezas(Array.from(piezasSet));
              if (esBracketTool(toolId)) {
                return `en cara ${cara} de ${piezasSet.size > 1 ? 'las piezas' : 'la pieza'} ${piezas}`;
              }
              return `${piezasSet.size > 1 ? 'en las piezas' : 'en la pieza'} ${formatPiezasComa(Array.from(piezasSet))}`;
            })
            .join(', ');
          return `${data.toolName} ${bloques}`;
        })
        .join(', ');

      parrafos.push(`En el odontograma se documenta aparatología activa en ${piezasConBase.length} piezas, con ${totalBasesCount} bases registradas en seguimiento, y la distribución principal incluye ${desgloseBase}.`);

      if (Object.keys(inventarioAux).length > 0) {
        const auxDesc = Object.entries(inventarioAux)
          .map(([toolName, piezasSet]) => `${toolName} en piezas ${formatPiezasComa(Array.from(piezasSet))}`)
          .join(', ');
        parrafos.push(`También se registran auxiliares clínicos, con ${auxDesc}, como parte del control mecánico de la sesión.`);
      }

      if (fallasActivas.length > 0) {
        const activos = Math.max(0, totalBasesCount - fallasActivas.length);
        parrafos.push(`Del total de componentes, ${activos} se reportan estables y ${fallasActivas.length} presentan novedad de desprendimiento.`);
      }
    } else {
      parrafos.push('En el odontograma no se observan bases activas, por lo que la sesión se mantiene en fase de valoración o preparación clínica.');
    }

    if (conexionesActivas.length > 0) {
      const conexionesPorTool: Record<string, Set<string>> = {};
      conexionesActivas.forEach((c: any) => {
        if (!conexionesPorTool[c.toolId]) conexionesPorTool[c.toolId] = new Set<string>();
        (c.teeth || []).forEach((pieza: string) => conexionesPorTool[c.toolId].add(String(pieza)));
      });
      const connDesc = Object.entries(conexionesPorTool)
        .map(([toolId, piezasSet]) => `${TOOL_NAMES[toolId] || toolId} en piezas ${formatPiezasComa(Array.from(piezasSet))}`)
        .join(', ');
      parrafos.push(`La mecánica activa se sostiene con ${connDesc}.`);
    }

    const fallas = [...fallasActivas];
    const retirosSesion = hallazgosOdontograma.filter((h) => h.severidad === 'retirado');
    const realizados = procedimientos.filter((p) => p.estado === 'realizado');
    const recementadosEjecutados = realizados.filter((p) => String(p.nombre || '').toLowerCase().includes('recement'));

    if (fallas.length > 0) {
      const detalleFallas = fallas
        .map((f) => {
          const toolName = TOOL_NAMES[f.toolId] || 'aparatología';
          const detalleCara = f.toolId.startsWith('bracket_') ? ` en cara ${f.cara}` : '';
          return `desprendimiento de ${toolName} en pieza ${f.diente}${detalleCara}`;
        })
        .join(', ');
      if (recementadosEjecutados.length > 0) {
        parrafos.push(`Durante la revisión se identificaron ${detalleFallas}, y en la misma cita se realizó corrección clínica con recolocación de los elementos comprometidos.`);
      } else {
        parrafos.push(`Durante la revisión se identificaron ${detalleFallas}, por lo que se deja trazabilidad para la conducta mecánica siguiente.`);
      }
    }

    if (recementadosEjecutados.length > 0) {
      const detalleRecementados = recementadosEjecutados
        .map((proc) => `${proc.nombre} en pieza ${String(proc.pieza || '').trim() || 'no especificada'}`)
        .join(', ');
      parrafos.push(`En esta sesión quedaron ejecutados los siguientes recementados, ${detalleRecementados}.`);
    }

    if (retirosSesion.length > 0) {
      const detalleRetiros = retirosSesion
        .map((retiro) => {
          const tipo = String(retiro.tipo || 'aparatología');
          const esBracket = tipo.toLowerCase().includes('bracket');
          return `${tipo} retirado de pieza ${retiro.diente}${esBracket && retiro.cara ? ` en ${retiro.cara}` : ''}`;
        })
        .join(', ');
      parrafos.push(`Además, se documentaron retiros clínicos, incluyendo ${detalleRetiros}.`);
    }

    if (realizados.length > 0) {
      const acciones = realizados
        .map((p) => {
          const nombre = String(p.nombre || '').toLowerCase();
          if (nombre.includes('recement')) return `recolocación en pieza ${p.pieza || 'no especificada'}`;
          if (nombre.includes('instalación')) return `instalación de ${p.accesorio || 'aparatología'} en pieza ${p.pieza || 'no especificada'}`;
          if (nombre.includes('retiro')) return `retiro de ${p.accesorio || 'aparatología'} en pieza ${p.pieza || 'no especificada'}`;
          return String(p.nombre || 'procedimiento clínico');
        })
        .join(', ');
      parrafos.push(`Como parte de la conducta terapéutica, se ejecutaron ${acciones}.`);
    }

    const ajustesRealizados: string[] = [];
    if (hasAlambreAdjustment) ajustesRealizados.push('ajuste de arco');
    if (hasLigatureChange) ajustesRealizados.push('cambio de ligaduras o módulos elásticos');
    if (ajustesRealizados.length > 0) {
      parrafos.push(`También se registraron ${ajustesRealizados.join(' y ')}, de acuerdo con la respuesta clínica observada.`);
    }

    const resumenFacialActual = normalizeDescriptionText(perfilFacialResumen) || buildPerfilFacialSummary(perfilFacial);
    const resumenTratamientoActual = normalizeDescriptionText(tratamientoActivoResumen) || buildTratamientoActivoSummary(arcoActual, esPrimeraVezOrtodoncia);
    const resumenOclusionActual = normalizeDescriptionText(oclusionResumen) || buildOclusionSummary(examenOrto);

    if (esPrimeraVezOrtodoncia) {
      const planInstalacion = String(arcoActual.planInstalacion || '').trim();
      const arcadaInstalacion = String(arcoActual.arcadaInstalacion || '').trim();
      const detalleInstalacion = String(arcoActual.detalleInstalacion || '').trim();
      const detalleArcada = detalleInstalacion ? `${arcadaInstalacion} (${detalleInstalacion})` : arcadaInstalacion;

      parrafos.push(`Al tratarse de una primera instalación, el análisis facial se describió de la siguiente manera, ${resumenFacialActual}.`);
      parrafos.push(`El tratamiento activo se definió con ${resumenTratamientoActual}${planInstalacion || arcadaInstalacion ? `, y el plan operativo quedó orientado a ${planInstalacion || 'instalación progresiva'} en ${detalleArcada || 'arcada por definir'}` : ''}.`);
      parrafos.push(`La evaluación oclusal inicial se consignó así, ${resumenOclusionActual}.`);
    } else {
      if (cambioFacial) {
        parrafos.push(`Durante este control se actualizó el análisis facial, quedando registrado que ${resumenFacialActual}.`);
      } else {
        parrafos.push('El análisis facial se mantiene estable respecto del último control, sin cambios clínicamente relevantes en esta cita.');
      }

      if (cambioTratamiento) {
        parrafos.push(`En esta sesión se registró avance en la mecánica activa, con el siguiente resultado, ${resumenTratamientoActual}.`);
      } else {
        const calibreActual = String(arcoActual.calibre || '').trim() || 'sin calibre definido';
        const faseActual = String(arcoActual.faseTratamiento || '').trim() || 'sin fase definida';
        parrafos.push(`El tratamiento activo se mantiene en continuidad, con calibre ${calibreActual} y fase ${faseActual}, sin ajustes estructurales nuevos en el contenedor clínico.`);
      }

      if (cambioOclusion) {
        parrafos.push(`La evolución de la oclusión tuvo actualización clínica en esta cita, quedando descrita así, ${resumenOclusionActual}.`);
      } else {
        parrafos.push('La evolución oclusal permanece en seguimiento con parámetros clínicos comparables al control anterior, sin variaciones mayores documentadas.');
      }
    }

    const higieneNivel = normalizeHigieneOralLevel(estadoGeneral.higieneOral);
    const higieneEtiqueta = esPrimeraVezOrtodoncia ? 'higiene oral' : 'higiene oral con aparatología';
    const descripcionHigiene = normalizeDescriptionText((estadoGeneral as any).descripcionHigiene) || getHigieneDescriptionTemplate(higieneNivel);
    parrafos.push(`En el estado clínico actual, el paciente presenta ${higieneEtiqueta} ${higieneNivel.toLowerCase()}, y la descripción de tejidos blandos reporta que ${descripcionHigiene}.`);

    const pendientes = procedimientos.filter((p) => ['sugerido', 'presupuestado', 'aprobado'].includes(p.estado));
    if (motivoSeleccionado === 'control' && realizados.length === 0 && fallas.length === 0 && !hasAlambreAdjustment && !hasLigatureChange && !cambioFacial && !cambioTratamiento && !cambioOclusion) {
      parrafos.push('La consulta de control transcurrió sin novedades adicionales, por lo que se mantiene el plan activo con seguimiento periódico habitual.');
    } else if (motivoSeleccionado === 'bracket_caido') {
      parrafos.push('La consulta se orientó a resolver la eventualidad mecánica reportada y se dejaron indicaciones para mantener estabilidad hasta el próximo control.');
    } else if (pendientes.length > 0) {
      parrafos.push(`Al cierre de la sesión quedan ${pendientes.length} acciones pendientes para próximas citas, alineadas con la secuencia terapéutica definida.`);
    } else {
      parrafos.push('Al cierre, el paciente continúa en tratamiento activo y se mantiene la conducta ortodóntica según el plan clínico trazado.');
    }

    return parrafos.join(' ');
  }, [motivoInteligente, motivoSeleccionado, motivo, selectedPatient, hallazgosOdontograma, procedimientos, arcoActual, estadoGeneral, orthoTeethData, orthoConnections, hasAlambreAdjustment, hasLigatureChange, esPrimeraVezOrtodoncia, perfilFacial, perfilFacialResumen, tratamientoActivoResumen, examenOrto, oclusionResumen, perfilFacialUpdatedAt, tratamientoActivoUpdatedAt, oclusionUpdatedAt, initialData?.created_at, lastInheritedMeta?.date]);

  const narrativaClinicaSugerida = useMemo(() => {
    const val = (v: unknown, fallback: string) => {
      const s = String(v ?? '').trim();
      return (s && s.toLowerCase() !== 'no evaluable') ? s : fallback;
    };

    // I. DATOS DEL PACIENTE
    const nombreCompleto = `${selectedPatient?.nombre || ''} ${selectedPatient?.apellidos || ''}`.trim() || 'Paciente sin nombre';
    const docId = val(
      (selectedPatient as any)?.documento || (selectedPatient as any)?.cc ||
      (selectedPatient as any)?.identificacion || (selectedPatient as any)?.cedula,
      'No registrado'
    );
    const codigoConsulta = val(
      lastInheritedMeta?.code || initialData?.codigo_consulta,
      `ORTO-${sessionId.slice(0, 8).toUpperCase()}`
    );
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const numCita = (selectedPatient?.consultas?.length || 0) + 1;

    // II. MOTIVO DE CONSULTA
    const motivoDesdeMarcadores = motivoSeleccionado
      ? (motivoSeleccionado === 'otro'
        ? (motivo.trim() || 'Otro motivo no clasificado')
        : (MOTIVO_LABELS[motivoSeleccionado] || motivoSeleccionado))
      : '';
    const motivoFinal = val(motivoDesdeMarcadores || motivoInteligente, 'Control ortodóntico mensual');
    const motivoLibre = val(motivo, 'Sin relato adicional registrado');
    const motivosStr = motivoSeleccionado
      ? (motivoSeleccionado === 'otro' ? 'Otro (usar descripción libre)' : (MOTIVO_LABELS[motivoSeleccionado] || motivoSeleccionado))
      : 'Sin marcadores adicionales';

    // III. ANTECEDENTES Y ALERTAS
    const higieneNivel = normalizeHigieneOralLevel(estadoGeneral.higieneOral);
    const higieneEtiqueta = esPrimeraVezOrtodoncia ? 'Higiene oral' : 'Higiene oral con aparatología';
    const descripcionHigiene = val(
      normalizeDescriptionText((estadoGeneral as any).descripcionHigiene),
      getHigieneDescriptionTemplate(higieneNivel)
    );
    const antecedentes = antecedentSummary || 'Sin antecedentes clínicos previos registrados en el sistema';

    // IV. ANÁLISIS FACIAL
    const facialResumenNarrativo = val(
      normalizeDescriptionText(perfilFacialResumen),
      buildPerfilFacialSummary(perfilFacial)
    );
    const facialLines = [
      `Perfil sagital: ${perfilFacial.perfilSagital}`,
      `Simetría facial: ${perfilFacial.simetria}`,
      `Competencia labial: ${perfilFacial.competenciaLabial}`,
      `Ángulo nasolabial: ${perfilFacial.anguloNasolabial}`,
      `Tercio inferior de cara: ${perfilFacial.tercioBajoCara}`,
      `Tipo facial: ${perfilFacial.tipoCara}`,
      `Resumen clínico fluido: ${facialResumenNarrativo}`,
      ...(!esPrimeraVezOrtodoncia
        ? [`Última actualización del análisis facial: ${formatContainerLastUpdated(perfilFacialUpdatedAt)}`]
        : []),
    ].join('\n');

    // V. ESTADO DEL TRATAMIENTO ACTIVO
    const arcoStr = val(arcoActual.calibre, 'No especificado');
    const tratamientoResumenNarrativo = val(
      normalizeDescriptionText(tratamientoActivoResumen),
      buildTratamientoActivoSummary(arcoActual, esPrimeraVezOrtodoncia)
    );
    const tratamientoLines = [
      `Calibre del arco actual: ${arcoStr}`,
      `Fase del tratamiento: ${val(arcoActual.faseTratamiento, 'No especificada')}`,
      ...(esPrimeraVezOrtodoncia
        ? [
            `Plan clínico inicial: ${val(arcoActual.planInstalacion, 'No especificado')}`,
            `Arcada o sector a intervenir: ${val(arcoActual.arcadaInstalacion, 'No especificado')}${String(arcoActual.detalleInstalacion || '').trim() ? ` (${String(arcoActual.detalleInstalacion).trim()})` : ''}`,
          ]
        : []),
      `Nota clínica del tratamiento: ${val(arcoActual.notasTratamiento, 'Escriba evolución, respuesta biológica, cooperación del paciente, ajustes previstos, etc.')}`,
      `Resumen clínico fluido del tratamiento activo: ${tratamientoResumenNarrativo}`,
      `${higieneEtiqueta}: ${higieneNivel}`,
      `Descripción clínica de higiene y encías: ${descripcionHigiene}`,
      `Estado general de aparatología: ${estadoGeneral.estadoAparatos}`,
      `Como quedó la aparatología: ${inheritedProcedureSummary}`,
      ...(!esPrimeraVezOrtodoncia
        ? [`Última actualización del tratamiento activo: ${formatContainerLastUpdated(tratamientoActivoUpdatedAt)}`]
        : []),
    ].join('\n');

    // VI. ODONTOGRAMA — APARATOLOGÍA
    const formatoTool = (id: string) => String(id || 'aparatologia')
      .split('_')
      .join(' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
    const formatoCara = (cara: string) => {
      const map: Record<string, string> = {
        vestibular: 'vestibular',
        lingual: 'lingual',
        oclusal: 'oclusal',
        mesial: 'mesial',
        distal: 'distal',
        global: 'general',
      };
      return map[cara] || cara;
    };
    const formatoEstado = (estado: string) => {
      const s = String(estado || '').toLowerCase();
      if (s === 'recementado') return 'despegado';
      if (s === 'recementado_ejecutado') return 'recementado en sesión';
      if (s === 'fracturado') return 'fracturado';
      if (s === 'instalado') return 'instalado';
      return estado || 'sin estado';
    };

    const dientes = Object.values(orthoTeethData || {}) as any[];
    
    const piezasAusentesList = dientes.filter((t: any) => t?.ausente);
    const basesActivas: Array<{ pieza: string; cara: string; toolId: string; state: string }> = [];
    const auxiliaresActivos: Array<{ pieza: string; cara: string; toolId: string; state: string }> = [];

    dientes.forEach((tooth: any) => {
      if (!tooth || tooth.ausente) return;

      let encontroBaseEnCaras = false;
      let encontroAuxEnCaras = false;
      const faces = tooth?.faces || {};

      Object.entries(faces).forEach(([faceName, faceData]: [string, any]) => {
        if (faceData?.base) {
          encontroBaseEnCaras = true;
          basesActivas.push({
            pieza: String(tooth.number || ''),
            cara: faceName,
            toolId: String(faceData.base.id || 'aparatologia'),
            state: String(faceData.base.state || 'instalado'),
          });
        }
        const auxArr = Array.isArray(faceData?.auxiliares) ? faceData.auxiliares : [];
        auxArr.forEach((aux: any) => {
          encontroAuxEnCaras = true;
          auxiliaresActivos.push({
            pieza: String(tooth.number || ''),
            cara: faceName,
            toolId: String(aux?.id || 'auxiliar'),
            state: String(aux?.state || 'instalado'),
          });
        });
      });

      // Compatibilidad con estructura legacy del diente
      if (!encontroBaseEnCaras && tooth?.base) {
        basesActivas.push({
          pieza: String(tooth.number || ''),
          cara: 'global',
          toolId: String(tooth.base.id || 'aparatologia'),
          state: String(tooth.base.state || 'instalado'),
        });
      }
      if (!encontroAuxEnCaras && Array.isArray(tooth?.auxiliares)) {
        tooth.auxiliares.forEach((aux: any) => {
          auxiliaresActivos.push({
            pieza: String(tooth.number || ''),
            cara: 'global',
            toolId: String(aux?.id || 'auxiliar'),
            state: String(aux?.state || 'instalado'),
          });
        });
      }
    });
    const odontogramaTieneContenido =
      dientes.length > 0 ||
      orthoConnections.length > 0 ||
      hallazgosOdontograma.length > 0;

    const baseDetalle = basesActivas.length > 0
      ? basesActivas
          .sort((a, b) => Number(a.pieza) - Number(b.pieza))
          .map((b) => `  • Pieza ${b.pieza} (${formatoCara(b.cara)}): ${formatoTool(b.toolId)} — ${formatoEstado(b.state)}`)
          .join('\n')
      : (odontogramaTieneContenido
        ? '  • Sin bases/brackets activos en este control'
        : '  • Sin registro de aparatología cargado en odontograma');

    const auxiliaresDetalle = auxiliaresActivos.length > 0
      ? auxiliaresActivos
          .sort((a, b) => Number(a.pieza) - Number(b.pieza))
          .map((a) => `  • Pieza ${a.pieza} (${formatoCara(a.cara)}): ${formatoTool(a.toolId)} — ${formatoEstado(a.state)}`)
          .join('\n')
      : '  • Sin auxiliares activos registrados';

    const ausentesStr = piezasAusentesList.length > 0
      ? piezasAusentesList.map((t: any) => `Pieza ${t.number}`).join(', ')
      : 'Ninguna';

    const conexionesResumen = orthoConnections.length > 0
      ? orthoConnections
          .map((c: any) => {
            const desde = c?.teeth?.[0] || 'N/A';
            const hasta = c?.teeth?.[c.teeth.length - 1] || 'N/A';
            return `  • ${formatoTool(String(c?.toolId || 'conexion'))}: ${desde} a ${hasta} — ${String(c?.state || 'instalado')}`;
          })
          .join('\n')
      : '  • Sin arcos ni sistemas de conexión activos';

    const fallasDesdeHallazgos = hallazgosOdontograma
      .filter((h) => h.severidad === 'recementado' || String(h.severidad || '').toLowerCase() === 'despegado')
      .map((f) => ({
        key: `${f.diente}-${f.cara || 'global'}-${f.tipo || 'aparatologia'}`,
        texto: `  • ${f.tipo} en pieza ${f.diente}${f.cara ? ` (${formatoCara(f.cara)})` : ''} — despegado`,
      }));

    const estadosFalla = new Set(['recementado', 'fracturado', 'despegado']);
    const fallasDesdeEstado = [...basesActivas, ...auxiliaresActivos]
      .filter((item) => estadosFalla.has(String(item.state || '').toLowerCase()))
      .map((item) => ({
        key: `${item.pieza}-${item.cara}-${item.toolId}`,
        texto: `  • ${formatoTool(item.toolId)} en pieza ${item.pieza} (${formatoCara(item.cara)}) — ${formatoEstado(item.state)}`,
      }));

    const fallasUnicasMap = new Map<string, string>();
    [...fallasDesdeHallazgos, ...fallasDesdeEstado].forEach((item) => {
      if (!fallasUnicasMap.has(item.key)) fallasUnicasMap.set(item.key, item.texto);
    });
    const fallasDetectadas = Array.from(fallasUnicasMap.values());

    const fallasStr = fallasDetectadas.length > 0
      ? fallasDetectadas.join('\n')
      : '  • Sin fallas de aparatología detectadas en esta sesión';

    const odontogramaLines = [
      `Última modificación del odontograma: ${odontogramaUltimaModificacion}`,
      `Bases/brackets activos: ${basesActivas.length}`,
      baseDetalle,
      `Auxiliares activos: ${auxiliaresActivos.length}`,
      auxiliaresDetalle,
      `Sistemas de conexión: ${orthoConnections.length}`,
      conexionesResumen,
      `Piezas ausentes: ${ausentesStr}`,
      `Hallazgos de falla:`,
      fallasStr,
    ].join('\n');

    // VII. EVALUACIÓN OCLUSAL
    const oclusalLines = [
      `Clase molar derecha: ${val(examenOrto.claseMolarDer, 'No evaluada')}`,
      `Clase molar izquierda: ${val(examenOrto.claseMolarIzq, 'No evaluada')}`,
      `Clase canina derecha: ${val(examenOrto.claseCaninaDer, 'No evaluada')}`,
      `Clase canina izquierda: ${val(examenOrto.claseCaninaIzq, 'No evaluada')}`,
      `Overjet: ${val(examenOrto.overjet, 'Pendiente de medición')}`,
      `Overbite: ${val(examenOrto.overbite, 'Pendiente de medición')}`,
      `Línea media dental: ${val(examenOrto.lineaMedia, 'Centrada')}`,
      ...(examenOrto.observaciones ? [`Observaciones de progreso: ${examenOrto.observaciones}`] : []),
      `Resumen clínico fluido de oclusión: ${val(normalizeDescriptionText(oclusionResumen), buildOclusionSummary(examenOrto))}`,
      ...(!esPrimeraVezOrtodoncia
        ? [`Última actualización de evolución oclusal: ${formatContainerLastUpdated(oclusionUpdatedAt)}`]
        : []),
    ].join('\n');

    // VIII. DIAGNÓSTICO CIE-10 ORTODONCIA
    const cie10Lines = diagnosticosManuales.length > 0
      ? diagnosticosManuales
          .map((d) => `  • ${d.codigo} — ${d.nombre}${d.tipo ? ` (${d.tipo})` : ''}`)
          .join('\n')
      : '  • Sin diagnósticos CIE-10 manuales registrados';

    // IX. CONDUCTA CLÍNICA
    const realizadosHoy = procedimientos.filter(p => p.estado === 'realizado');
    const aprobadosHoy = procedimientos.filter(p => p.estado === 'aprobado');
    const pendientesProx = procedimientos.filter(p => ['sugerido', 'presupuestado'].includes(p.estado));
    const realizadosStr = realizadosHoy.length > 0
      ? realizadosHoy.map(p => `  • ${p.nombre}${p.pieza ? ` — pieza ${p.pieza}` : ''}`).join('\n')
      : '  • Sin procedimientos realizados en esta sesión';
    const aprobadosStr = aprobadosHoy.length > 0
      ? aprobadosHoy.map(p => `  • ${p.nombre}${p.pieza ? ` — pieza ${p.pieza}` : ''}`).join('\n')
      : '  • Sin procedimientos aprobados adicionales';
    const pendientesStr = pendientesProx.length > 0
      ? pendientesProx.map(p => `  • ${p.nombre}${p.pieza ? ` — pieza ${p.pieza}` : ''} (${p.estado})`).join('\n')
      : '  • Sin procedimientos en lista de espera';
    const conductaLines = [
      `Procedimientos realizados hoy:`,
      realizadosStr,
      `Procedimientos aprobados:`,
      aprobadosStr,
      `Pendientes y presupuestados:`,
      pendientesStr,
    ].join('\n');

    return [
      `INFORME DE EVOLUCIÓN ORTODÓNTICA`,
      `I. DATOS DEL PACIENTE\nNombre: ${nombreCompleto}\nDocumento de identidad: ${docId}\nCódigo de consulta: ${codigoConsulta}\nFecha de atención: ${fecha}\nNúmero de consulta: ${numCita}`,
      `II. MOTIVO DE CONSULTA\nMotivo principal: ${motivoFinal}\nRelato del paciente: ${motivoLibre}\nMarcadores de urgencia: ${motivosStr}`,
      `III. ANTECEDENTES Y CONTEXTO CLÍNICO\nDescripción clínica actual: ${descripcionHigiene}\nHistorial clínico: ${antecedentes}`,
      `IV. ANÁLISIS FACIAL\n${facialLines}`,
      `V. ESTADO DEL TRATAMIENTO ACTIVO\n${tratamientoLines}`,
      `VI. ODONTOGRAMA — APARATOLOGÍA\n${odontogramaLines}`,
      `VII. EVALUACIÓN OCLUSAL\n${oclusalLines}`,
      `VIII. DIAGNÓSTICO CIE-10 ORTODONCIA\n${cie10Lines}`,
      `IX. CONDUCTA CLÍNICA\n${conductaLines}`,
      `X. RESUMEN TÉCNICO AUTOMÁTICO\n${generateEvolucionAutomatica}`,
    ].join('\n\n');
  }, [
    selectedPatient,
    lastInheritedMeta,
    initialData,
    sessionId,
    motivo,
    motivoSeleccionado,
    motivoInteligente,
    estadoGeneral,
    perfilFacial,
    perfilFacialResumen,
    perfilFacialUpdatedAt,
    arcoActual,
    tratamientoActivoResumen,
    tratamientoActivoUpdatedAt,
    orthoTeethData,
    orthoConnections,
    hallazgosOdontograma,
    odontogramaUltimaModificacion,
    examenOrto,
    oclusionResumen,
    oclusionUpdatedAt,
    diagnosticosManuales,
    procedimientos,
    antecedentSummary,
    inheritedProcedureSummary,
    esPrimeraVezOrtodoncia,
    generateEvolucionAutomatica,
  ]);

  // evolucionTexto se sincroniza con la narrativa viva HASTA que el usuario edite manualmente
  useEffect(() => {
    if (!hasUserEditedNarrative.current) {
      setEvolucionTexto(narrativaClinicaSugerida);
    }
  }, [narrativaClinicaSugerida]);

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

  const aceptarSugerencias = useCallback(() => {
    if (procedimientosSugeridos.length === 0) return;
    setProcedimientos(prev => [...prev, ...procedimientosSugeridos]);
    setMensajeConfirmacion(`Se agruparon ${procedimientosSugeridos.length} acciones ortodónticas al plan.`);
    setShowConfirmModal(true); setTimeout(() => setShowConfirmModal(false), 3000);
  }, [procedimientosSugeridos]);

  const actualizarProcedimiento = (id: string, campo: keyof Procedimiento, valor: any) => {
    if (campo === 'costo' && Number(valor) < 0) valor = 0;
    setProcedimientos(prev => prev.map((p) => {
      if (p.id !== id) return p;

      if (campo === 'costo') {
        const costoNormalizado = Math.max(0, Number(valor) || 0);
        return {
          ...p,
          costo: costoNormalizado,
          costoPendiente: false,
          precioNoAplica: false,
        };
      }

      if (campo === 'precioNoAplica') {
        return {
          ...p,
          precioNoAplica: Boolean(valor),
          costoPendiente: false,
          costo: Boolean(valor) ? 0 : p.costo,
        };
      }

      if (campo === 'costoPendiente') {
        return {
          ...p,
          costoPendiente: Boolean(valor),
          precioNoAplica: Boolean(valor) ? false : p.precioNoAplica,
        };
      }

      return { ...p, [campo]: valor };
    }));
    
    // ── SINCRONIZACIÓN CIRCULAR: Procedimiento Realizado → Actualiza Odontograma ───
    if (campo === 'estado' && valor === 'realizado') {
      const procedimiento = procedimientos.find(p => p.id === id);
      if (!procedimiento || procedimiento.estado === 'realizado') return;
      if (procedimiento.nombre?.toLowerCase().includes('bracket') || procedimiento.nombre?.toLowerCase().includes('recementado')) {
        const piezasSet = new Set<string>();

        // 1) Piezas directas escritas en el procedimiento
        const piezasDirectas = String(procedimiento.pieza || '').match(/\d+/g) || [];
        piezasDirectas.forEach((p) => piezasSet.add(String(p)));

        // 2) Piezas derivadas de hallazgos vinculados
        if (procedimiento.hallazgoOrigen === 'multiple-fallas' || procedimiento.hallazgoOrigen === 'recementados-multiples') {
          hallazgosOdontograma
            .filter((h) => h.id.startsWith('falla-'))
            .forEach((h) => piezasSet.add(String(h.diente)));
        } else if (procedimiento.hallazgoOrigen) {
          const hallazgo = hallazgosOdontograma.find((h) => h.id === procedimiento.hallazgoOrigen);
          if (hallazgo?.diente) piezasSet.add(String(hallazgo.diente));
        }

        const piezasObjetivo = Array.from(piezasSet);
        if (piezasObjetivo.length > 0) {
          const recementadosAplicados = piezasObjetivo.reduce((total, pieza) => {
            const tooth = orthoTeethData?.[pieza];
            if (!tooth?.faces) return total;
            const enPieza = Object.values(tooth.faces).filter((face: any) => face?.base?.state === 'recementado').length;
            return total + enPieza;
          }, 0);

          setOrthoTeethData((prev) => {
            const next = { ...prev };

            piezasObjetivo.forEach((pieza) => {
              const tooth = next[pieza];
              if (!tooth) return;

              // Compatibilidad: estructura antigua con base en raíz del diente
              if (tooth.base && (tooth.base.state === 'recementado' || tooth.base.state === 'fracturado')) {
                next[pieza] = {
                  ...tooth,
                  base: {
                    ...tooth.base,
                    state: 'instalado',
                  },
                };
                return;
              }

              // Estructura actual: base por cara en faces.*.base
              const faces = tooth.faces || {};
              let touched = false;
              const updatedFaces: Record<string, any> = { ...faces };

              Object.keys(faces).forEach((faceKey) => {
                const face = faces[faceKey];
                if (face?.base && (face.base.state === 'recementado' || face.base.state === 'fracturado')) {
                  touched = true;
                  updatedFaces[faceKey] = {
                    ...face,
                    base: {
                      ...face.base,
                      state: 'instalado',
                    },
                    color: '#FFFFFF',
                  };
                }
              });

              if (touched) {
                next[pieza] = {
                  ...tooth,
                  faces: updatedFaces,
                };
              }
            });

            return next;
          });

          // Limpia visualmente hallazgos de falla de las piezas ya repuestas
          setHallazgosOdontograma((prev) =>
            prev.filter((h) => {
              const esFalla = h.id.startsWith('falla-') || h.severidad === 'recementado';
              if (!esFalla) return true;
              return !piezasObjetivo.includes(String(h.diente));
            })
          );

          if (recementadosAplicados > 0) {
            setRecementadosContador((prev) => {
              const newCount = prev + recementadosAplicados;
              const pid = selectedPatient?.id || initialData?.paciente_id || '';
              if (pid) localStorage.setItem(`rec_count_${pid}`, String(newCount));
              return newCount;
            });
          }

          setOrthoSyncVersion((v) => v + 1);

          toastSuccess(`Se actualizó el odontograma: ${piezasObjetivo.length} pieza(s) marcada(s) como repuesta(s).`);
        } else {
          toastSuccess('Procedimiento ejecutado. No se identificaron piezas específicas para actualizar en odontograma.');
        }
      }
    }
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
    toastSuccess(`Se activo "${item.nombre}" para la sesion de hoy.`);
  }, [selectedPatient?.id, toastSuccess]);

  const pushToAgenda = useCallback((item: any) => {
    if (!selectedPatient?.id) return;

    setAgendaDraft({
      patientId: selectedPatient.id,
      patientName: `${selectedPatient.nombre || ''} ${selectedPatient.apellidos || ''}`.trim(),
      consultationType: item.consultationType || 'ORTODONCIA',
      reason: item.nombre || 'Control ortodontico',
      durationMinutes: item.duracionEstimada || 30,
      source: 'ortodoncia',
      sourceConsultationId: item.consultationId,
      sourceProcedureId: item.id,
      procedureLabel: item.nombre,
      notes: item.observaciones || item.accesorio || '',
    });
    setCurrentView('agenda');
    toastSuccess('Agenda pre-cargada con el control o tratamiento ortodontico.');
    navigate('/');
  }, [navigate, selectedPatient, setAgendaDraft, setCurrentView, toastSuccess]);

  // Nota: la selección de motivo ya no inserta procedimientos automáticamente.
  // El usuario decide importar desde recomendaciones o crear manualmente.

  const applyProcedureDefaults = useCallback((nombreInput: string, force = false) => {
    const matched = PROCEDURE_CATALOG.find((item) => item.nombre.toLowerCase() === nombreInput.trim().toLowerCase());
    if (!matched) return;
    const nombreLower = matched.nombre.toLowerCase();
    const esRetiroIncluido = nombreLower.includes('retiro');
    const esConsultaSinTarifaDefinida = ['consulta', 'ajuste de alambre', 'cambio de ligaduras', 'retenedores'].some((k) => nombreLower.includes(k));

    setNuevoProcedimiento((prev) => ({
      ...prev,
      nombre: matched.nombre,
      accesorio: prev.accesorio || matched.cara,
      costo: esRetiroIncluido ? 0 : (force || !Number(prev.costo) ? matched.precio : prev.costo),
      costoPendiente: esRetiroIncluido ? false : (esConsultaSinTarifaDefinida ? true : prev.costoPendiente),
      precioNoAplica: esRetiroIncluido ? true : prev.precioNoAplica,
      observaciones: esRetiroIncluido
        ? (prev.observaciones || 'Retiro sin costo adicional, incluido dentro del control mensual.')
        : prev.observaciones,
      estado: prev.estado || 'sugerido',
    }));
  }, []);

  const handleAddProcedureInline = useCallback(() => {
    const nombre = String(nuevoProcedimiento.nombre || '').trim();
    if (!nombre) {
      toastError('Escribe un procedimiento para agregarlo al plan.');
      return;
    }
    const matched = PROCEDURE_CATALOG.find((item) => item.nombre.toLowerCase() === nombre.toLowerCase());
    const precioNoAplica = Boolean(nuevoProcedimiento.precioNoAplica);
    const costoPendiente = !precioNoAplica && Boolean(nuevoProcedimiento.costoPendiente);
    const costoFinal = precioNoAplica || costoPendiente
      ? 0
      : Math.max(0, Number(nuevoProcedimiento.costo) || matched?.precio || 0);
    const caraFinal = (nuevoProcedimiento.accesorio || matched?.cara || 'General').trim();

    setProcedimientos((prev) => [
      {
        id: `ptr_${crypto.randomUUID()}`,
        nombre,
        pieza: (nuevoProcedimiento.pieza || '').trim(),
        accesorio: caraFinal,
        observaciones: (nuevoProcedimiento.observaciones || '').trim(),
        fecha: new Date().toLocaleDateString(),
        estado: (nuevoProcedimiento.estado as any) || 'sugerido',
        costo: costoFinal,
        costoMaterial: Math.max(0, Number(nuevoProcedimiento.costoMaterial) || 0),
        costoPendiente,
        precioNoAplica,
      },
      ...prev,
    ]);

    setNuevoProcedimiento({
      nombre: '', pieza: '', accesorio: '', observaciones: '',
      costo: 0, costoMaterial: 0,
      estado: 'sugerido',
      costoPendiente: false,
      precioNoAplica: false,
    });
  }, [nuevoProcedimiento, toastError]);

  const handleGestionarHallazgos = useCallback(() => {
    if (!hallazgoSmartSuggestions.length) {
      toastError('No hay hallazgos activos para migrar al plan.');
      return;
    }
    const principal = hallazgoSmartSuggestions[0];
    setQuickHallazgoNarrative(`Se detectó ${principal.hallazgo} en pieza ${principal.pieza}. Sugerencia: ${principal.sugerencia}.`);
    setNuevoProcedimiento((prev) => ({
      ...prev,
      nombre: principal.sugerencia,
      pieza: principal.pieza,
      accesorio: principal.cara,
      costo: principal.precio,
      costoPendiente: false,
      precioNoAplica: false,
      estado: 'sugerido',
    }));
    setActiveTab('procedimientos');
  }, [hallazgoSmartSuggestions, toastError]);

  const handleMarcarTodoRealizado = useCallback(() => {
    const sugeridos = procedimientos.filter((item) => item.estado === 'sugerido');
    if (sugeridos.length === 0) {
      toastError('No hay procedimientos en estado sugerido para realizar.');
      return;
    }

    const bloqueados = sugeridos.filter((item) => item.costoPendiente && !item.precioNoAplica);
    const ejecutables = sugeridos.filter((item) => !item.costoPendiente || item.precioNoAplica);

    if (ejecutables.length === 0) {
      toastError(`Hay ${bloqueados.length} procedimiento(s) con precio pendiente. Asigne valor o marque N/A para poder realizar.`);
      return;
    }

    ejecutables.forEach((item) => {
      actualizarProcedimiento(item.id, 'estado', 'realizado');
    });

    toastSuccess(`Se marcaron ${ejecutables.length} procedimiento(s) sugeridos como realizados.${bloqueados.length > 0 ? ` ${bloqueados.length} quedó/aron bloqueado(s) por precio pendiente.` : ''}`);
  }, [procedimientos, actualizarProcedimiento, toastError, toastSuccess]);

  const handleFirmarConsentimiento = useCallback(() => {
    const nowIso = new Date().toISOString();
    setConsentimientoFirmadoAt(nowIso);
    toastSuccess('Consentimiento informado firmado digitalmente para esta sesión.');
  }, [toastSuccess]);

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
      setRecetas([...recetas, {...nuevaReceta, id: `rec_${crypto.randomUUID()}`}]);
      setNuevaReceta({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS: MÓDULO DIAMOND - RADIOLOGÍA Y DIAGNÓSTICO
  // ═══════════════════════════════════════════════════════════════════

  const handleAbrirDiagnosticModal = useCallback(() => {
    const suggestedType = radiologiaSugerida.tipos[0] || 'Panoramica';
    const piezasMarcadas = piezasRxDesdeOdontograma;

    if (piezasMarcadas.length === 0) {
      toastError('Marca al menos un diente con "Requiere RX / Imagen" en el odontograma para habilitar la solicitud radiográfica.');
      return;
    }

    // Pre-llenar según el motivo seleccionado
    if (radiologiaSugerida.tipos.length > 0) {
      setSelectedRxType(radiologiaSugerida.tipos[0]);
    } else {
      setSelectedRxType('Panoramica');
    }

    // Piezas obligatorias desde odontograma
    setSelectedRxPiezas(piezasMarcadas);
    setDiagnosticModalTab('solicitud');
    setConsentimientoAceptado(false);
    setFirmaDigitalBase64(null);
    setShowSignaturePad(false);
    
    // Generar justificación automática
    const justificacion = generarJustificacionRx(
      suggestedType,
      motivoSeleccionado,
      piezasMarcadas
    );
    setRxJustificacionAuto(justificacion);
    
    // Generar consentimiento
    const consentimiento = generarConsentimiento(
      suggestedType,
      motivoSeleccionado
    );
    setConsentimientoTexto(consentimiento);
    
    setShowDiagnosticModal(true);
  }, [radiologiaSugerida, motivoSeleccionado, generarJustificacionRx, generarConsentimiento, piezasRxDesdeOdontograma, toastError]);

  useEffect(() => {
    if (!showDiagnosticModal) return;
    setSelectedRxPiezas(piezasRxDesdeOdontograma);
    const tipoLabel = RADIOLOGIA_TIPOS.find((t) => t.id === selectedRxType)?.label || selectedRxType;
    setRxJustificacionAuto(generarJustificacionRx(tipoLabel, motivoSeleccionado, piezasRxDesdeOdontograma));
  }, [showDiagnosticModal, piezasRxDesdeOdontograma, selectedRxType, motivoSeleccionado, generarJustificacionRx]);

  const handleInitSignaturePad = useCallback(() => {
    if (!signaturePadRef.current) return;
    
    const canvas = signaturePadRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setFirmaDigitalBase64(null);
  }, []);

  const handleSignaturePadMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!signaturePadRef.current) return;
    const rect = signaturePadRef.current.getBoundingClientRect();
    lastXRef.current = e.clientX - rect.left;
    lastYRef.current = e.clientY - rect.top;
    isDrawingRef.current = true;
  }, []);

  const handleSignaturePadMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !signaturePadRef.current) return;
    const ctx = signaturePadRef.current.getContext('2d');
    if (!ctx) return;
    
    const rect = signaturePadRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    lastXRef.current = x;
    lastYRef.current = y;
  }, []);

  const handleSignaturePadMouseUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const handleGuardarFirmaDigital = useCallback(() => {
    if (!signaturePadRef.current) return;
    
    const canvas = signaturePadRef.current;
    const imageData = canvas.toDataURL('image/png');
    setFirmaDigitalBase64(imageData);
    setShowSignaturePad(false);
  }, []);

  const handleCrearOrdenRadiologia = useCallback(async () => {
    const piezasDesdeOdontograma = selectedRxPiezas.length > 0 ? selectedRxPiezas : piezasRxDesdeOdontograma;

    if (piezasDesdeOdontograma.length === 0) {
      toastError('No hay piezas marcadas con "Requiere RX / Imagen" en el odontograma.');
      return;
    }

    if (consentimientoAceptado && !firmaDigitalBase64) {
      toastError('Si deseas adjuntar consentimiento, primero captura la firma digital.');
      return;
    }
    
    const nuevaOrden: RadiologiaOrden = {
      id: `rx_${crypto.randomUUID()}`,
      tipo: selectedRxType as any,
      motivo: motivoSeleccionado || 'Sin especificar',
      justificacion_automatica: rxJustificacionAuto,
      piezas_solicitadas: piezasDesdeOdontograma,
      consentimiento_texto: consentimientoTexto,
      consentimiento_aceptado: consentimientoAceptado,
      consentimiento_aceptado_at: consentimientoAceptado ? new Date().toISOString() : undefined,
      firma_digital_base64: consentimientoAceptado ? (firmaDigitalBase64 || undefined) : undefined,
      firma_digital_timestamp: consentimientoAceptado ? new Date().toISOString() : undefined,
      estado: 'pendiente',
      creado_en: new Date().toISOString(),
      paciente_id: selectedPatient?.id || '',
      consulta_id: sessionId,
    };
    
    setRadiologyOrders([...radiologyOrders, nuevaOrden]);
    
    // Reset modal
    setShowDiagnosticModal(false);
    setDiagnosticModalTab('solicitud');
    setConsentimientoAceptado(false);
    setFirmaDigitalBase64(null);
    setSelectedRxPiezas(piezasRxDesdeOdontograma);
    
    toastSuccess(`Orden radiológica ${selectedRxType} creada exitosamente.`);
  }, [
    consentimientoAceptado,
    firmaDigitalBase64,
    selectedRxType,
    motivoSeleccionado,
    rxJustificacionAuto,
    selectedRxPiezas,
    piezasRxDesdeOdontograma,
    consentimientoTexto,
    radiologyOrders,
    selectedPatient,
    sessionId,
    toastError,
    toastSuccess
  ]);

  const handleEliminarOrdenRadiologia = useCallback((orderId: string) => {
    setRadiologyOrders(radiologyOrders.filter(o => o.id !== orderId));
    toastSuccess('Orden radiológica eliminada.');
  }, [radiologyOrders, toastSuccess]);

  const handleCambiarEstadoOrden = useCallback((orderId: string, nuevoEstado: 'pendiente' | 'realizado' | 'archivado') => {
    setRadiologyOrders(radiologyOrders.map(o => 
      o.id === orderId ? { ...o, estado: nuevoEstado } : o
    ));
  }, [radiologyOrders]);

  const handleGuardar = async (options?: { silent?: boolean; keepEditing?: boolean }) => {
    if (isSaving) return;
    if (!selectedPatient?.id) {
      toastError('No hay un paciente seleccionado.');
      return;
    }

    setIsSaving(true);

    const consultationCode = buildConsultationCode({
      consultationId: sessionId,
      consultationType: 'ORTODONCIA',
      consultationDate: new Date().toISOString(),
    });

    const payload: ConsultaPayload = {
      paciente_id: selectedPatient.id,
      tipo_consulta: 'ORTODONCIA',
      hallazgos_odontograma: hallazgosOdontograma,
      estado_odontograma: {
        teethData: normalizeResolvedRecementadoStates(orthoTeethData, procedimientos),
        connections: orthoConnections,
        last_edit_at: lastOdontogramEditAt || new Date().toISOString(),
      },
      detalles_clinicos: attachConsultationCodeToDetails({
        anamnesis: {
          motivo,
          motivoSeleccionado,
          estadoGeneral,
          evolucionClinica,
          evolucionNarrativa: evolucionTexto,
          resumenes_containers: {
            perfil_facial: perfilFacialResumen,
            tratamiento_activo: tratamientoActivoResumen,
            evolucion_oclusal: oclusionResumen,
          },
          ultima_modificacion_containers: {
            perfil_facial: perfilFacialUpdatedAt,
            tratamiento_activo: tratamientoActivoUpdatedAt,
            evolucion_oclusal: oclusionUpdatedAt,
          },
        },
        perfil_facial: {
          ...perfilFacial,
          resumen_fluido: perfilFacialResumen,
          ultima_modificacion: perfilFacialUpdatedAt,
        },
        arco_actual: {
          ...arcoActual,
          resumen_fluido: tratamientoActivoResumen,
          ultima_modificacion: tratamientoActivoUpdatedAt,
        },
        examen: {
          ...examenOrto,
          resumen_fluido: oclusionResumen,
          ultima_modificacion: oclusionUpdatedAt,
        },
        evolucion_clinica: sessionNarrative,
        es_primera_vez_ortodoncia: esPrimeraVezOrtodoncia,
        proxima_visita: proximaVisita,
        plan_tratamiento: procedimientos.map((procedure) => ({
          ...procedure,
          is_persistent: procedure.is_persistent || ['sugerido', 'presupuestado', 'aprobado'].includes(String(procedure.estado).toLowerCase()),
        })),
        recetario: recetas,
        ordenes_radiologia: radiologyOrders,
        diagnosticos_alertas: diagnosticAlertas,
        consentimiento_informado: {
          firmado: consentimientoFirmado,
          signed_at: consentimientoFirmadoAt,
        },
        workflow_summary: {
          antecedent_summary: antecedentSummary,
          pending_plan_count: persistentPlan.length,
          next_followup_days: 30,
          triage_stage: 'control_ortodontico',
          treatment_mode: 'tratamiento_activo_ortodoncia',
          next_consultation_reason: persistentPlan.length > 0 ? `Continuar ${persistentPlan[0].nombre}` : 'Control y activacion de brackets',
          closure_summary: currentOrthoClosureSummary,
          container_summaries: {
            perfil_facial: perfilFacialResumen,
            tratamiento_activo: tratamientoActivoResumen,
            evolucion_oclusal: oclusionResumen,
          },
          container_last_modified: {
            perfil_facial: perfilFacialUpdatedAt,
            tratamiento_activo: tratamientoActivoUpdatedAt,
            evolucion_oclusal: oclusionUpdatedAt,
          },
        }
      }, consultationCode),
      tiempo_sesion: tiempo
    };

    try {
      // Usar saveConsultation del contexto para guardar y refrescar correctamente
      await saveConsultation({ ...payload, codigo_consulta: consultationCode, id: sessionId });
      setIsSaved(true);
      setSavedAt(new Date());
      if (!options?.silent) {
        toastSuccess('Evolución guardada correctamente.');
      }
      if (!options?.keepEditing) {
        setShowExitConfirm(true);
      }
    } catch (err: any) {
      const errMsg = err?.message || JSON.stringify(err) || 'Error desconocido';
      toastError(`Error al guardar: ${errMsg}`);
      console.error('handleGuardar error', err);
    } finally {
      setIsSaving(false);
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
          <div class="med"><div class="med-num">${i + 1}</div>
            <div class="med-body">
              <div class="med-name">${r.medicamento}</div>
              <div class="med-detail">Dosis: <b>${r.dosis}</b> &bull; Frecuencia: <b>${r.frecuencia}</b> &bull; Duracion: <b>${r.duracion}</b></div>
              ${r.indicaciones ? `<div class="med-note">* ${r.indicaciones}</div>` : ''}
            </div></div>`).join('');
    } else {
      const planActivo = procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado' || p.estado === 'presupuestado');
      const total = planActivo.reduce((s, p) => s + (Math.max(0, Number(p.costo) || 0)), 0);
      bodyContent = planActivo.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No hay procedimientos en el plan.</td></tr>'
        : planActivo.map(p => `<tr>
             <td>${p.nombre}</td>
             <td>${p.pieza ? `#${p.pieza}` : 'General'}</td>
            <td class="estado-${p.estado}">${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</td>
            <td style="text-align:right;font-weight:700">${p.costo > 0 ? formatCOP(p.costo) : '&mdash;'}</td>
           </tr>`).join('') +
          `<tr style="border-top:2px solid #0f172a"><td colspan="3" style="font-weight:800;font-size:14px;padding-top:12px">TOTAL</td>
            <td style="text-align:right;font-weight:900;font-size:14px;padding-top:12px">${formatCOP(total)}</td></tr>`;
    }

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${tipo === 'receta' ? 'Receta Medica' : 'Presupuesto'} - ${patientName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;padding:40px;max-width:820px;margin:0 auto}@page{size:A4;margin:20mm}@media print{body{padding:0}}.header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #0071e3;margin-bottom:28px}.clinic-name{font-size:22px;font-weight:900;color:#0071e3;margin-bottom:4px}.clinic-sub{font-size:12px;color:#64748b}.doc-badge{background:#0071e3;color:#fff;font-size:13px;font-weight:800;padding:8px 18px;border-radius:8px}.patient-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.field label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;display:block}.field p{font-size:14px;font-weight:700;color:#0f172a;margin-top:3px}.section-title{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}.rx-badge{font-size:56px;font-weight:900;color:#0071e3;font-style:italic;line-height:1;margin-bottom:12px}.med{display:flex;gap:14px;padding:14px 0;border-bottom:1px dashed #e2e8f0;align-items:flex-start}.med:last-child{border-bottom:none}.med-num{width:30px;height:30px;background:#0071e3;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;margin-top:2px}.med-name{font-size:16px;font-weight:800;color:#0f172a;margin-bottom:5px}.med-detail{font-size:13px;color:#475569}.med-note{font-size:12px;color:#7c3aed;font-style:italic;margin-top:5px}.validity{margin-top:24px;font-size:12px;color:#94a3b8;font-style:italic;text-align:center;padding:10px;border:1px dashed #e2e8f0;border-radius:6px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0071e3;color:#fff;padding:11px 14px;text-align:left;font-weight:700}td{padding:10px 14px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#f8fafc}.estado-realizado{color:#059669;font-weight:700}.estado-aprobado{color:#0071e3;font-weight:700}.estado-presupuestado{color:#4338ca;font-weight:700}.footer{margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:80px}.sig-line{border-top:1px solid #0f172a;padding-top:8px;font-size:11px;color:#64748b;text-align:center}</style></head><body>
<div class="header"><div><div class="clinic-name">${clinicName}</div><div class="clinic-sub">Generado el ${fecha}</div></div><div class="doc-badge">${tipo === 'receta' ? 'RECETA MEDICA' : 'PRESUPUESTO — ORTODONCIA'}</div></div>
<div class="patient-box"><div class="field"><label>Paciente</label><p>${patientName}</p></div><div class="field"><label>Documento</label><p>${selectedPatient?.cc || 'N/A'}</p></div><div class="field"><label>Fecha</label><p>${fecha}</p></div></div>
${tipo === 'receta' ? `<div class="rx-badge">Rx</div><div class="section-title">Medicamentos Prescritos</div>${bodyContent}<p class="validity">Valido por 30 dias. No repetir sin nueva prescripcion medica.</p>` : `<div class="section-title">Plan de Tratamiento Ortodontico</div><table><thead><tr><th>Procedimiento</th><th>Pieza</th><th>Estado</th><th style="text-align:right">Valor</th></tr></thead><tbody>${bodyContent}</tbody></table>`}
<div class="footer"><div class="sig-line">Firma del Ortodoncista</div><div class="sig-line">Sello / Tarjeta Profesional</div></div></body></html>`;
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
      lines.push('*RECETA MEDICA — EstDent Ortodoncia*');
      lines.push(`Paciente: *${patientName}* | CC: ${selectedPatient?.cc || 'N/A'}`);
      lines.push('');
      lines.push('*MEDICAMENTOS:*');
      recetas.forEach((r, i) => {
        lines.push(`${i + 1}. *${r.medicamento}*`);
        lines.push(`   ${r.dosis} — ${r.frecuencia} durante ${r.duracion}`);
        if (r.indicaciones) lines.push(`   _${r.indicaciones}_`);
      });
      lines.push(''); lines.push('_Valido 30 dias. No repetir sin nueva prescripcion._');
    } else {
      lines.push('*PRESUPUESTO ORTODONCIA — EstDent*');
      lines.push(`Paciente: *${patientName}* | Fecha: ${fecha}`);
      lines.push('');
      lines.push('*PLAN DE TRATAMIENTO:*');
      const planActivo = procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado' || p.estado === 'presupuestado');
      planActivo.forEach((p, i) => {
        const valor = p.costo > 0 ? ` — ${formatCOP(p.costo)}` : '';
        lines.push(`${i + 1}. ${p.nombre}${p.pieza ? ` (pieza #${p.pieza})` : ''}${valor}`);
      });
      const total = planActivo.reduce((s, p) => s + (Math.max(0, Number(p.costo) || 0)), 0);
      if (total > 0) { lines.push(''); lines.push(`*Total: ${formatCOP(total)}*`); }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }, [selectedPatient, recetas, procedimientos]);

  const solicitarEjecucionProcedimiento = useCallback((procedureId: string) => {
    const objetivo = procedimientos.find((procedure) => procedure.id === procedureId);
    if (!objetivo) return;
    if (objetivo.estado === 'realizado') {
      toastError('Este tratamiento ya está marcado como ejecutado.');
      return;
    }
    if (objetivo.costoPendiente && !objetivo.precioNoAplica) {
      toastError('Debe asignar precio o marcar N/A antes de ejecutar este tratamiento.');
      return;
    }
    setPendingExecutionProcedureId(procedureId);
    setShowExecuteConfirm(true);
  }, [procedimientos, toastError]);

  const confirmarEjecucionProcedimiento = useCallback(() => {
    if (!pendingExecutionProcedureId) {
      setShowExecuteConfirm(false);
      return;
    }
    const objetivo = procedimientos.find((procedure) => procedure.id === pendingExecutionProcedureId);
    if (!objetivo) {
      setShowExecuteConfirm(false);
      setPendingExecutionProcedureId(null);
      return;
    }

    actualizarProcedimiento(pendingExecutionProcedureId, 'estado', 'realizado');
    
    setOrthoSyncVersion(v => v + 1);
    setShowExecuteConfirm(false);
    setPendingExecutionProcedureId(null);
    toastSuccess(`Tratamiento ejecutado: ${objetivo.nombre}. Guardando evolución...`);
    setTimeout(() => {
      handleGuardar({ silent: true, keepEditing: true });
    }, 220);
  }, [pendingExecutionProcedureId, procedimientos, actualizarProcedimiento, toastSuccess]);

  const solicitarEjecucionTodos = useCallback(() => {
    const pendientes = procedimientos.filter(p =>
      ['sugerido', 'presupuestado', 'aprobado'].includes(p.estado) && (!p.costoPendiente || p.precioNoAplica)
    );
    if (pendientes.length === 0) {
      toastError('No hay procedimientos ejecutables pendientes (revise precios pendientes).');
      return;
    }
    setShowExecuteAllConfirm(true);
  }, [procedimientos, toastError]);

  const confirmarEjecucionTodos = useCallback(() => {
    const pendientes = procedimientos.filter(p =>
      ['sugerido', 'presupuestado', 'aprobado'].includes(p.estado) && (!p.costoPendiente || p.precioNoAplica)
    );
    if (pendientes.length === 0) {
      setShowExecuteAllConfirm(false);
      return;
    }

    pendientes.forEach(p => {
      actualizarProcedimiento(p.id, 'estado', 'realizado');
    });
    setOrthoSyncVersion(v => v + 1);
    setShowExecuteAllConfirm(false);
    toastSuccess(`${pendientes.length} tratamiento(s) ejecutado(s). Guardando evolución...`);
    setTimeout(() => {
      handleGuardar({ silent: true, keepEditing: true });
    }, 220);
  }, [procedimientos, actualizarProcedimiento, toastSuccess]);

  if (!selectedPatient) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.background }}>Cargando paciente...</div>;

  return (
    <>
    <ToastContainer toasts={toasts} onClose={removeToast} />
    <ConfirmDialog
      isOpen={showExitConfirm}
      title="Evolución guardada"
      message="La evolución fue guardada exitosamente. ¿Desea finalizar la sesión clínica?"
      confirmLabel="Finalizar sesión"
      cancelLabel="Seguir editando"
      variant="primary"
      onConfirm={() => { setShowExitConfirm(false); onExit(); }}
      onCancel={() => { setShowExitConfirm(false); setIsSaved(false); }}
    />
    <ConfirmDialog
      isOpen={showExecuteConfirm}
      title="Confirmar ejecución de tratamiento"
      message={(() => {
        const p = procedimientos.find((item) => item.id === pendingExecutionProcedureId);
        return p
          ? `¿Desea ejecutar "${p.nombre}" ahora? Se marcará como realizado y se guardará automáticamente la evolución.`
          : '¿Desea ejecutar este tratamiento ahora?';
      })()}
      confirmLabel="Sí, ejecutar"
      cancelLabel="No"
      variant="primary"
      onConfirm={confirmarEjecucionProcedimiento}
      onCancel={() => { setShowExecuteConfirm(false); setPendingExecutionProcedureId(null); }}
    />
    <ConfirmDialog
      isOpen={showExecuteAllConfirm}
      title="Confirmar ejecución de todos los tratamientos"
      message={(() => {
        const pendientes = procedimientos.filter(p =>
          ['sugerido', 'presupuestado', 'aprobado'].includes(p.estado) && (!p.costoPendiente || p.precioNoAplica)
        );
        return pendientes.length > 0
          ? `¿Desea ejecutar TODOS los ${pendientes.length} procedimiento(s) pendiente(s)? Se marcarán como realizados y se guardará automáticamente la evolución.`
          : 'No hay procedimientos ejecutables pendientes (hay precios por definir).';
      })()}
      confirmLabel="Sí, ejecutar todos"
      cancelLabel="No"
      variant="primary"
      onConfirm={confirmarEjecucionTodos}
      onCancel={() => setShowExecuteAllConfirm(false)}
    />
    <div className="gc" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #f3f6fa 0%, #edf2f7 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        .gc {
          --gc-border-width: 1px;
          --gc-border-color: #dbe4ef;
        }
        .gc, .gc * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }

        .fade-in { animation: gcFadeIn 0.3s ease-out both; }
        .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes gcFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        @keyframes gcCheckPop { 0% { transform: scale(0.8); } 100% { transform: scale(1); } }
        @keyframes gcPulseWarn {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
          70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        
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
        .gc-work-area { scrollbar-gutter: stable; }
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
          position: relative;
          top: 0;
          z-index: 1;
          margin-top: 6px;
          padding-right: 0;
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

        .grid-2-col {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          align-items: stretch;
        }
        .grid-2-col > * {
          min-width: 0;
          width: 100%;
        }
        @media (max-width: 900px) { .grid-2-col { grid-template-columns: 1fr; } }

        .card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
          transition: all .25s cubic-bezier(.4,0,.2,1);
          outline: none;
          width: 100%;
          min-width: 0;
          height: 100%;
          align-self: stretch;
        }
        .card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.1);
          transform: translateY(-1px);
          border-color: transparent !important;
          outline: none !important;
        }
        .card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #1e293b; margin: -20px -20px 18px -20px; border: none; padding: 11px 16px; letter-spacing: .01em; border-radius: 12px 12px 0 0; background: #f8fafc; border-bottom: 1px solid #e8ecef; }
        
        .oc-form-group { margin-bottom: 16px; }
        .oc-form-group label { display: block; font-size: 11px; font-weight: 700; color: ${COLORS.textLight}; text-transform: uppercase; margin-bottom: 6px; letter-spacing: .08em; }
        .oc-input, select.oc-input { width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-family: inherit; transition: all .2s cubic-bezier(.4,0,.2,1); background: #fff; color: ${COLORS.text}; box-sizing: border-box; }
        .oc-input:focus, select.oc-input:focus { outline: none; border-color: #29b2e8; background: #fff; box-shadow: 0 0 0 3px rgba(41,178,232,.12); transform: translateY(-1px); }

        .oc-check-item {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          cursor: pointer;
          color: #475569;
          font-weight: 600;
          transition: color .2s ease;
        }
        .oc-check-item:hover { color: #0f172a; }
        .oc-check-input {
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
        .oc-check-input::after {
          content: '';
          width: 9px;
          height: 5px;
          border-left: 2px solid #fff;
          border-bottom: 2px solid #fff;
          transform: rotate(-45deg) scale(0);
          transition: transform .18s ease;
          margin-top: -1px;
        }
        .oc-check-input:checked {
          background: #29b2e8;
          border-color: #29b2e8;
          box-shadow: 0 3px 9px rgba(41,178,232,.35);
          animation: gcCheckPop .14s ease;
        }
        .oc-check-input:checked::after {
          transform: rotate(-45deg) scale(1);
        }
        
        .gc-top-nav { margin-top: 6px; border-radius: 12px; }
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
          gap: 7px;
          text-transform: uppercase;
          letter-spacing: .06em;
          position: relative;
          white-space: nowrap;
          border-radius: 9px;
          margin: 4px 3px;
        }
        .gc-tab-btn:hover { color: #374151; background: #f8f9fa; }
        .gc-tab-btn.active {
          color: #ffffff;
          background: #64748b;
          box-shadow: 0 4px 12px rgba(100,116,139,.24);
        }
        .gc-tab-badge {
          margin-left: 6px;
          background: #475569;
          color: #fff;
          border-radius: 999px;
          padding: 1px 7px;
          font-size: 9px;
          font-weight: 800;
          line-height: 1.2;
        }
        
        .oc-btn-primary { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: ${COLORS.primary}; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s cubic-bezier(.34,1.56,.64,1); box-shadow: 0 4px 12px rgba(0,113,227,.25); }
        .oc-btn-primary:hover { background: ${COLORS.primaryDark}; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,113,227,.35); }
        
        .oc-btn-badge { padding: 6px 14px; background: #fff; border: 1px solid ${COLORS.border}; border-radius: 20px; font-size: 12px; font-weight: 600; color: ${COLORS.text}; cursor: pointer; white-space: nowrap; transition: all .2s cubic-bezier(.4,0,.2,1); display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,.03); }
        .oc-btn-badge:hover { border-color: ${COLORS.primary}; color: ${COLORS.primary}; background: ${COLORS.primaryLight}; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,113,227,.15); }
        .consent-chip { display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.04em; }
      `}</style>

      <div className="no-print gc-shell gc-uniform-inset gc-top-stack fade-in">
      {/* HEADER PREMIUM ORTODONCIA */}
      <header className="gc-top-header">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button
            onClick={() => setShowCancelModal(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', background:'#fef2f2', border:'1.5px solid #fecdd3', borderRadius:9, color:'#e11d48', cursor:'pointer', transition:'all .15s', fontWeight:700, fontSize:12, fontFamily:'Inter,system-ui,sans-serif', boxShadow:'0 2px 6px rgba(225,29,72,.08)' }}
            onMouseOver={e => { e.currentTarget.style.background='#fecdd3'; e.currentTarget.style.borderColor='#e11d48'; }}
            onMouseOut={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.borderColor='#fecdd3'; }}
          >
            <ChevronLeft size={14} /> Cancelar
          </button>

          <div style={{ width:1, height:30, background:'#e2e8f0' }} />

          <div style={{ display:'flex', gap:11, alignItems:'center', padding:'6px 14px 6px 6px', background:'#edf1f5', borderRadius:12, border:'none', boxShadow:'0 6px 16px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.04)' }}>
            <div style={{ width:48, height:48, borderRadius:13, background:'#adb5bd', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, fontFamily:'Inter,system-ui,sans-serif', boxShadow:'0 4px 14px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.1)', letterSpacing:'.02em', flexShrink:0 }}>
              {selectedPatient.nombre?.[0]}{selectedPatient.apellidos?.[0]}
            </div>
            <div>
              <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, lineHeight:1.3, fontFamily:'Inter,system-ui,sans-serif', marginBottom:6 }}>
                {selectedPatient.nombre} {selectedPatient.apellidos}
              </div>
              
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#64748b' }}><FileText size={10} style={{color:'#94a3b8'}} /> ID {selectedPatient.cc || 'N/A'}</span>
                <span style={{ color:'#cbd5e1' }}>·</span>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#64748b' }}><User size={10} style={{color:'#94a3b8'}} /> {selectedPatient.edad || '--'} años</span>
                <span style={{ color:'#cbd5e1' }}>·</span>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#475569' }}><FileText size={10} style={{color:'#94a3b8'}} /> Consulta Ortodoncia</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#ffffff', borderRadius:10, border:'none', boxShadow:'0 6px 16px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.04)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px rgba(16,185,129,.4)' }}></div>
            <div style={{ display:'flex', flexDirection:'column' }}>
              <span style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.08em' }}>Sesión</span>
              <span style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:'#1e293b', lineHeight:1 }}>{formatTiempo()}</span>
            </div>
          </div>
          
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            {isLocked ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 13px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '9px', fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                  <Lock size={14} /> Solo Lectura — Res. 1995
                </div>
                <button
                  onClick={() => setShowNotaModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 13px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '9px', fontSize: '12px', fontWeight: 700, color: '#7c3aed', cursor: 'pointer' }}
                >
                  <FileText size={13} /> Nota Aclaratoria
                </button>
              </div>
            ) : (
              <button
                className="oc-btn-primary"
                onClick={() => handleGuardar()}
                disabled={isSaving}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
                  background: isSaved ? '#10b981' : '#29b2e8',
                  border:'none', borderRadius:9, fontSize:13, fontWeight:700, color:'#fff',
                  cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily:'Inter,system-ui,sans-serif',
                  opacity: isSaving ? 0.7 : 1,
                  boxShadow: isSaved ? '0 4px 14px rgba(16,185,129,.25)' : '0 4px 14px rgba(41,178,232,.25)',
                  transition:'all .15s',
                }}
              >
                {isSaving
                  ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} /></>
                  : (isSaved ? <CheckCircle size={15} /> : <Save size={15} />)
                }
                {isSaving ? ' Guardando...' : (isSaved ? ' Guardado' : ' Guardar')}
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

      {/* BARRA DE NAVEGACIÓN */}
      <div className="gc-nav gc-top-nav" style={{ display:'flex', width:'100%', padding:'0 6px', gap:0 }}>
        <button className={`gc-tab-btn ${activeTab === 'anamnesis' ? 'active' : ''}`} onClick={() => setActiveTab('anamnesis')}><ClipboardList size={14} /> Valoración Clínica</button>
        <button className={`gc-tab-btn ${activeTab === 'evolucion' ? 'active' : ''}`} onClick={() => setActiveTab('evolucion')}><FileText size={14} /> Evolución Clínica</button>
        <button className={`gc-tab-btn ${activeTab === 'odontograma' ? 'active' : ''}`} onClick={() => setActiveTab('odontograma')}><Scan size={14} /> Odontograma {hallazgosOdontograma.length > 0 && <span className="gc-tab-badge">{hallazgosOdontograma.length}</span>}</button>
        <button className={`gc-tab-btn ${activeTab === 'procedimientos' ? 'active' : ''}`} onClick={() => setActiveTab('procedimientos')}><Scissors size={14} /> Procedimientos {procedimientosSugeridos.length > 0 && <span className="gc-tab-badge">{procedimientosSugeridos.length}</span>}</button>
        <button className={`gc-tab-btn ${activeTab === 'recetas' ? 'active' : ''}`} onClick={() => setActiveTab('recetas')}><Pill size={14} /> Recetas</button>
      </div>
      </div>

      {/* ALERTA DE HIGIENE ROJA: 2 consultas seguidas */}
      {showHigieneRojaAlert && (
        <div style={{ background: '#b91c1c', color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontWeight: 700, borderBottom: '3px solid #7f1d1d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={22} />
            ALERTA CRÍTICA: Higiene deficiente confirmé en dos consultas seguidas.
          </div>
          <button onClick={() => setRecetas([...recetas, { id: `rec_${crypto.randomUUID()}`, medicamento: 'Refuerzo de Higiene', dosis: 'Diaria', frecuencia: '1 vez al día', duracion: '14 días', indicaciones: 'Cepillar y usar seda dental específico para ortodoncia' }])} style={{ border: '1px solid white', background: 'transparent', color: 'white', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}>Añadir receta rápida</button>
        </div>
      )}

      {/* BANNERS DE BLOQUEO LEGAL */}
      {isSaved && !isLocked && minutosRestantes <= 10 && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
          <Clock size={14} /> Esta consulta se bloqueara en {minutosRestantes} minuto{minutosRestantes !== 1 ? 's' : ''} (Res. 1995 / HIPAA).
        </div>
      )}
      {isLocked && (
        <div style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#92400e', fontWeight: 700 }}>
          <Lock size={16} /> HISTORIAL BLOQUEADO — Res. 1995 / HIPAA: Transcurrieron 30 minutos. Modo Solo Lectura.
          <button onClick={() => setShowNotaModal(true)} style={{ marginLeft: 'auto', padding: '6px 16px', background: '#92400e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={12} /> Agregar Nota Aclaratoria
          </button>
        </div>
      )}

      {/* ÁREA DE TRABAJO */}
      <div ref={workAreaRef} className="no-print gc-work-area" style={{ flex: 1, overflow: 'auto', padding: '26px 15px 34px', background: 'transparent', position: 'relative' }}>
        {isLocked && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 20, cursor: 'not-allowed', background: 'rgba(248,250,252,0.3)' }}
            onClick={() => { /* toast handled by banner */ }}
          />
        )}
        <div className="gc-content-shell gc-uniform-inset">
          {/* TAB 1: VALORACIÓN CLÍNICA */}
          <div style={getPanelStyle(activeTab === 'anamnesis')}>
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* MOTIVO Y CONTEXTO DE LA CITA */}
              <div className="card">
                <h3 className="card-title"><ClipboardList size={18} /> Motivo de Consulta</h3>
                <div style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>Sugerido por sistema: </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{motivoInteligente}</span>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px', display: 'block' }}>
                    Selecciona el motivo principal
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { id: 'instalacion_inicial', label: 'Instalación Inicial', icon: PackageOpen },
                      { id: 'control', label: 'Control Mensual', icon: CheckCircle },
                      { id: 'bracket_caido', label: 'Bracket Caído', icon: AlertTriangle },
                      { id: 'alambre_danado', label: 'Alambre Dañado', icon: Zap },
                      { id: 'dolor', label: 'Dolor/Molestia', icon: Activity },
                      { id: 'ajuste', label: 'Ajuste', icon: Settings },
                      { id: 'emergencia', label: 'Emergencia', icon: AlertCircle },
                      { id: 'retenedores', label: 'Retenedores', icon: Bone },
                      { id: 'otro', label: 'Otro', icon: FileText }
                    ].map(btn => {
                      const isSelected = motivoSeleccionado === btn.id;
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => setMotivoSeleccionado(prev => prev === btn.id ? '' : btn.id)}
                          style={{
                            padding: '7px 14px',
                            background: isSelected ? '#0f172a' : '#fff',
                            color: isSelected ? '#fff' : '#475569',
                            border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: isSelected ? 800 : 600,
                            transition: 'all 0.15s',
                            boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.15)' : 'none'
                          }}
                        >
                          <Icon size={12} /> {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="oc-form-group" style={{ marginTop: '14px', marginBottom: 0 }}>
                  <label>Relato del paciente</label>
                  <textarea
                    rows={3}
                    className="oc-input"
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Describe con texto libre lo que refiere el paciente en esta cita..."
                  />
                </div>

                <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fbff', color: '#1e3a8a', fontSize: 13, lineHeight: 1.7 }}>
                  <div>
                    <strong>Motivo que irá al informe:</strong>{' '}
                    {motivoSeleccionado
                      ? (motivoSeleccionado === 'otro'
                        ? (motivo.trim() || 'Otro (sin detalle)')
                        : (MOTIVO_LABELS[motivoSeleccionado] || motivoSeleccionado))
                      : motivoInteligente}
                  </div>
                </div>
              </div>

              {/* ESTADO CLÍNICO ACTUAL */}
              <div className="card">
                <h3 className="card-title" style={{ color: COLORS.primaryDark }}><Activity size={20} /> Estado Clínico Actual</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}>
                    <label>{esPrimeraVezOrtodoncia ? 'Higiene oral' : 'Higiene oral con aparatología'}</label>
                    <select
                      className="oc-input"
                      value={normalizeHigieneOralLevel(estadoGeneral.higieneOral)}
                      onChange={(e) => {
                        const higieneSeleccionada = normalizeHigieneOralLevel(e.target.value);
                        setEstadoGeneral((prev) => ({
                          ...prev,
                          higieneOral: higieneSeleccionada,
                          descripcionHigiene: getHigieneDescriptionTemplate(higieneSeleccionada),
                        }));
                      }}
                    >
                      {HIGIENE_ORAL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {!esPrimeraVezOrtodoncia && (
                    <div className="oc-form-group" style={{ marginBottom: 0 }}>
                      <label>Estado actual de la aparatología</label>
                      <select className="oc-input" value={estadoGeneral.estadoAparatos} onChange={e => setEstadoGeneral({ ...estadoGeneral, estadoAparatos: e.target.value })}>
                        <option value="Buen estado">Estable</option>
                        <option value="Falla menor">Con novedades menores</option>
                        <option value="Falla mayor">Con fallas que requieren intervención</option>
                      </select>
                    </div>
                  )}

                  <div className="oc-form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                    <label>Descripción clínica editable</label>
                    <textarea
                      rows={2}
                      className="oc-input"
                      placeholder="Describe hallazgos de higiene, estado gingival y recomendaciones para esta sesión..."
                      value={(estadoGeneral as any).descripcionHigiene || ''}
                      onChange={e => setEstadoGeneral({ ...estadoGeneral, descripcionHigiene: e.target.value })}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>
                      Este texto alimenta el resumen técnico automático y la narrativa clínica del odontograma.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* TAB 2: EVOLUCIÓN CLÍNICA */}
          <div style={getPanelStyle(activeTab === 'evolucion')}>
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div className="card">
                <h3 className="card-title" style={{ color: COLORS.primaryDark }}><SmilePlus size={20} /> Análisis Facial (Anamnesis Dinámica)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px' }}>
                  {[
                    { label: 'Perfil sagital', key: 'perfilSagital', opts: ['Recto', 'Convexo', 'Cóncavo'] },
                    { label: 'Simetría facial', key: 'simetria', opts: ['Simétrico', 'Asimétrico Der', 'Asimétrico Izq'] },
                    { label: 'Competencia labial', key: 'competenciaLabial', opts: ['Competente', 'Incompetente', 'Forzada'] },
                    { label: 'Ángulo nasolabial', key: 'anguloNasolabial', opts: ['Agudo', 'Normal', 'Obtuso'] },
                    { label: 'Tercio inferior de la cara', key: 'tercioBajoCara', opts: ['Disminuido', 'Proporcionado', 'Aumentado'] },
                    { label: 'Tipo de cara (índice facial)', key: 'tipoCara', opts: ['Leptoprosopo', 'Mesoprosopo', 'Euriprosopo'] },
                  ].map(({ label, key, opts }) => (
                    <div className="oc-form-group" key={key} style={{ marginBottom: 0 }}>
                      <label>{label}</label>
                      <select
                        className="oc-input"
                        value={perfilFacial[key as keyof typeof perfilFacial]}
                        onChange={e => handlePerfilFacialChange(key, e.target.value)}
                      >
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}>
                    <label>Resumen fluido del análisis facial (editable)</label>
                    <textarea
                      rows={2}
                      className="oc-input"
                      value={perfilFacialResumen}
                      onChange={(e) => {
                        setPerfilFacialResumen(e.target.value);
                        setPerfilFacialUpdatedAt(nowIso());
                      }}
                      placeholder="Paciente con perfil sagital..., simetría..., competencia labial..."
                    />
                  </div>
                  {!esPrimeraVezOrtodoncia && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#eef2f7', border: '1px solid #dce3eb', color: '#64748b', fontSize: 12 }}>
                      Última modificación de este bloque: {perfilFacialUltimaModificacion}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 className="card-title" style={{ color: COLORS.primaryDark }}><Gauge size={20} /> Estado del Tratamiento Activo</h3>
                {esPrimeraVezOrtodoncia && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '14px' }}>
                    <div className="oc-form-group" style={{ marginBottom: 0 }}>
                      <label>Tratamiento a realizar / proseguir</label>
                      <select
                        className="oc-input"
                        value={arcoActual.planInstalacion || PLAN_INSTALACION_OPTIONS[0]}
                        onChange={(e) => handleArcoActualChange('planInstalacion', e.target.value)}
                      >
                        {PLAN_INSTALACION_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="oc-form-group" style={{ marginBottom: 0 }}>
                      <label>Arcada / zona clínica</label>
                      <select
                        className="oc-input"
                        value={arcoActual.arcadaInstalacion || ARCADA_INSTALACION_OPTIONS[2]}
                        onChange={(e) => handleArcoActualChange('arcadaInstalacion', e.target.value)}
                      >
                        {ARCADA_INSTALACION_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="oc-form-group" style={{ marginBottom: 0 }}>
                      <label>Detalle de dientes / segmento</label>
                      <input
                        className="oc-input"
                        placeholder="Ej. 13 a 23, sector superior anterior"
                        value={arcoActual.detalleInstalacion || ''}
                        onChange={(e) => handleArcoActualChange('detalleInstalacion', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '14px' }}>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}>
                    <label>Calibre del arco actual</label>
                    <select className="oc-input" value={arcoActual.calibre} onChange={e => handleArcoActualChange('calibre', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {['0.012 NiTi', '0.014 NiTi', '0.016 NiTi', '0.016×0.022 NiTi', '0.019×0.025 NiTi',
                        '0.016×0.022 Acero', '0.019×0.025 Acero', '0.021×0.025 Acero',
                        '0.016×0.022 TMA', '0.019×0.025 TMA'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}>
                    <label>Fase del tratamiento</label>
                    <select className="oc-input" value={arcoActual.faseTratamiento} onChange={e => handleArcoActualChange('faseTratamiento', e.target.value)}>
                      {['Nivelación y Alineamiento', 'Cierre de espacios', 'Finalización y detallado', 'Retención'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Notas clínicas del tratamiento activo</label>
                  <textarea
                    rows={3}
                    className="oc-input"
                    placeholder="Escriba evolución, respuesta biológica, cooperación del paciente, ajustes previstos, etc."
                    value={arcoActual.notasTratamiento || ''}
                    onChange={(e) => handleArcoActualChange('notasTratamiento', e.target.value)}
                  />
                </div>

                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}>
                    <label>Resumen fluido del tratamiento activo (editable)</label>
                    <textarea
                      rows={2}
                      className="oc-input"
                      value={tratamientoActivoResumen}
                      onChange={(e) => {
                        setTratamientoActivoResumen(e.target.value);
                        setTratamientoActivoUpdatedAt(nowIso());
                      }}
                      placeholder="Paciente con tratamiento activo en fase..., calibre..., plan de instalación/prosecución..."
                    />
                  </div>
                  {!esPrimeraVezOrtodoncia && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#eef2f7', border: '1px solid #dce3eb', color: '#64748b', fontSize: 12 }}>
                      Última modificación de este bloque: {tratamientoActivoUltimaModificacion}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                    Como quedo la aparatologia
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.7 }}>
                    {inheritedProcedureSummary}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title"><Stethoscope size={18} /> Evolución de la Oclusión</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '15px', marginBottom: '16px' }}>
                  <div className="oc-form-group"><label>Clase Molar Derecha</label><select className="oc-input" value={examenOrto.claseMolarDer} onChange={e => handleExamenOrtoChange('claseMolarDer', e.target.value)}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                  <div className="oc-form-group"><label>Clase Molar Izquierda</label><select className="oc-input" value={examenOrto.claseMolarIzq} onChange={e => handleExamenOrtoChange('claseMolarIzq', e.target.value)}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '15px', marginBottom: '16px' }}>
                  <div className="oc-form-group"><label>Clase Canina Derecha</label><select className="oc-input" value={examenOrto.claseCaninaDer} onChange={e => handleExamenOrtoChange('claseCaninaDer', e.target.value)}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                  <div className="oc-form-group"><label>Clase Canina Izquierda</label><select className="oc-input" value={examenOrto.claseCaninaIzq} onChange={e => handleExamenOrtoChange('claseCaninaIzq', e.target.value)}><option value="No evaluable">No evaluable</option><option value="Clase I">Clase I</option><option value="Clase II">Clase II</option><option value="Clase III">Clase III</option></select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '15px' }}>
                  <div className="oc-form-group"><label>Overjet (mm)</label><input type="text" className="oc-input" placeholder="Ej. 3mm" value={examenOrto.overjet} onChange={e => handleExamenOrtoChange('overjet', e.target.value)} /></div>
                  <div className="oc-form-group"><label>Overbite (%)</label><input type="text" className="oc-input" placeholder="Ej. 20%" value={examenOrto.overbite} onChange={e => handleExamenOrtoChange('overbite', e.target.value)} /></div>
                </div>
                <div className="oc-form-group"><label>Línea Media Dental</label><select className="oc-input" value={examenOrto.lineaMedia} onChange={e => handleExamenOrtoChange('lineaMedia', e.target.value)}><option value="Centrada">Centradas y Coincidentes</option><option value="Desviada Derecha">Desviada a la Derecha</option><option value="Desviada Izquierda">Desviada a la Izquierda</option></select></div>
                <div className="oc-form-group" style={{ marginBottom: 0 }}><label>Observaciones de Progreso</label><textarea rows={2} value={examenOrto.observaciones} onChange={e => handleExamenOrtoChange('observaciones', e.target.value)} placeholder="Ej. Buen cierre de espacios en sector anterior..." className="oc-input" /></div>

                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div className="oc-form-group" style={{ marginBottom: 0 }}>
                    <label>Resumen fluido de evolución oclusal (editable)</label>
                    <textarea
                      rows={2}
                      className="oc-input"
                      value={oclusionResumen}
                      onChange={(e) => {
                        setOclusionResumen(e.target.value);
                        setOclusionUpdatedAt(nowIso());
                      }}
                      placeholder="Paciente con clase molar..., overjet..., overbite..., línea media..."
                    />
                  </div>
                  {!esPrimeraVezOrtodoncia && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#eef2f7', border: '1px solid #dce3eb', color: '#64748b', fontSize: 12 }}>
                      Última modificación de este bloque: {oclusionUltimaModificacion}
                    </div>
                  )}
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="card-title"><BookOpen size={18} /> Diagnóstico CIE-10 Ortodoncia</h3>
                <div style={{ marginBottom: '20px', background: COLORS.background, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Checklist de Diagnóstico CIE-10</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color={COLORS.textLight} style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="text"
                      className="oc-input"
                      placeholder="Buscar código o anomalía..."
                      style={{ paddingLeft: '40px' }}
                      value={busquedaCie10}
                      onChange={(e) => setBusquedaCie10(e.target.value)}
                      onFocus={() => setShowCie10Dropdown(true)}
                      onBlur={() => setTimeout(() => setShowCie10Dropdown(false), 120)}
                    />
                    {showCie10Dropdown && resultadosCie10.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '12px', marginTop: '8px', zIndex: 10, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosCie10.map((cie) => {
                          const checked = diagnosticosManuales.some((d) => d.codigo === cie.codigo);
                          return (
                            <label key={cie.codigo} className="oc-check-item" style={{ padding: '11px 14px', borderBottom: `1px solid ${COLORS.border}`, justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  className="oc-check-input"
                                  checked={checked}
                                  onChange={() => toggleDiagnosticoCie10(cie)}
                                />
                                <span style={{ fontWeight: 700, color: COLORS.primaryDark, whiteSpace: 'nowrap' }}>{cie.codigo}</span>
                              </div>
                              <span style={{ color: COLORS.text, textAlign: 'right', fontSize: 12.5, marginLeft: 12 }}>{cie.nombre}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
                    Marca o desmarca diagnósticos; si no escribes búsqueda se muestran opciones frecuentes.
                  </p>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
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


          {/* TAB 3: ODONTOGRAMA */}
          <div style={getPanelStyle(activeTab === 'odontograma')}>
            <div className="fade-in">
              <div style={{ background: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, marginBottom: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <OrthoOdontogram
                  patientId={selectedPatient?.id}
                  onUpdate={handleOdontogramaSync}
                  onNavigateToFailures={irATratamientosTop}
                  lastUpdateLabel={hasOdontogramaHistory ? odontogramaUltimaModificacion : undefined}
                  syncVersion={orthoSyncVersion}
                  value={{
                    teethData: orthoTeethData,
                    connections: orthoConnections
                  }}
                  onAlambreAdjustment={() => {
                    setHasAlambreAdjustment(true);
                    toastSuccess('Se registró ajuste de alambre en esta sesión.');
                  }}
                  onLigatureChange={() => {
                    setHasLigatureChange(true);
                    toastSuccess('Se registró cambio de ligaduras en esta sesión.');
                  }}
                />
              </div>

              {(piezasRxDesdeOdontograma.length > 0 || radiologyOrders.length > 0) && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: radiologyOrders.length > 0 ? '1fr 1fr' : '1fr', 
                  gap: '16px', 
                  marginBottom: '16px' 
                }}>
                  <button
                    onClick={handleAbrirDiagnosticModal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: '14px 20px',
                      borderRadius: '12px',
                      border: `2px solid ${COLORS.primary}`,
                      background: `${COLORS.primaryLight}`,
                      color: COLORS.primary,
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(41, 178, 232, 0.12)',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = COLORS.primary;
                      (e.target as HTMLElement).style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = COLORS.primaryLight;
                      (e.target as HTMLElement).style.color = COLORS.primary;
                    }}
                  >
                    <Scan size={18} /> Gestor de Solicitudes Radiográficas
                  </button>

                  {radiologyOrders.length > 0 && (
                    <div style={{
                      background: '#f0f9ff',
                      border: `1px solid ${COLORS.primary}40`,
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.primary }}>
                          {radiologyOrders.length} Orden{radiologyOrders.length !== 1 ? 'es' : ''} Radiológica{radiologyOrders.length !== 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: COLORS.textLight, marginTop: '4px' }}>
                          {piezasRxDesdeOdontograma.length} pieza{piezasRxDesdeOdontograma.length !== 1 ? 's' : ''} con RX marcado,{' '}
                          {radiologyOrders.filter(r => r.estado === 'pendiente').length} pendiente{radiologyOrders.filter(r => r.estado === 'pendiente').length !== 1 ? 's' : ''},
                          {radiologyOrders.filter(r => r.estado === 'realizado').length > 0 ? ` ${radiologyOrders.filter(r => r.estado === 'realizado').length} realizada${radiologyOrders.filter(r => r.estado === 'realizado').length !== 1 ? 's' : ''}` : ''}
                        </div>
                      </div>
                      <Scan size={20} style={{ color: COLORS.primary }} />
                    </div>
                  )}
                </div>
              )}

              <div className="card" style={{ marginTop: '16px', padding: 0, overflow: 'hidden' }}>
                {/* Header del informe */}
                <div className="card-title" style={{ margin: 0, borderRadius: '12px 12px 0 0', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} /> Informe de Evolución Clínica
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isDocumentEditing ? (
                      <>
                        <button
                          onClick={() => { hasUserEditedNarrative.current = false; setEvolucionTexto(narrativaClinicaSugerida); }}
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
                          if (!evolucionTexto) setEvolucionTexto(narrativaClinicaSugerida);
                          setIsDocumentEditing(true);
                        }}
                        style={{ padding: '5px 12px', border: '1px solid #e2e8f0', background: '#fff', color: '#374151', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                {/* Modo edición: textarea */}
                {isDocumentEditing && (
                  <div style={{ padding: '16px 20px 0' }}>
                    <textarea
                      value={evolucionTexto || narrativaClinicaSugerida}
                      onChange={e => { hasUserEditedNarrative.current = true; setEvolucionTexto(e.target.value); }}
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

                {/* Modo vista: documento clínico formateado */}
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
                      {(evolucionTexto || narrativaClinicaSugerida).split('\n\n').map((bloque, bIdx) => {
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

                {/* Navegación */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 20px' }}>
                  <button
                    onClick={irATratamientosTop}
                    className="oc-btn-primary"
                    style={{ padding: '10px 16px' }}
                  >
                    <Scissors size={15} /> Ir a Tratamientos y Cotización
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 4: PROCEDIMIENTOS Y PRESUPUESTO ORT */}
          <div style={getPanelStyle(activeTab === 'procedimientos')}>
            <div className="fade-in card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:14 }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}><Scissors size={20} /> Procedimientos Ortodónticos</h3>
                  <div style={{ marginTop:8, fontSize:13, color:'#334155', lineHeight:1.65 }}>
                    {esPrimeraVezOrtodoncia 
                      ? 'Instalación inicial de aparatología: el presupuesto se calcula automáticamente desde el odontograma.'
                      : `Consulta de control: tarifa base ${formatCOP(TARIFAS_ORTODONCIA.CONTROL_MENSUAL)} + procedimientos específicos.`}
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'flex-end' }}>
                  <button onClick={() => handleImprimir('presupuesto')} style={{ padding:'8px 12px', border:'1px solid #cbd5e1', background:'#fff', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <Download size={13} style={{ verticalAlign:'text-bottom', marginRight:4 }} /> PDF Cotización
                  </button>
                  <button onClick={() => handleWhatsApp('presupuesto')} style={{ padding:'8px 12px', border:'1px solid #bbf7d0', background:'#f0fdf4', color:'#166534', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <MessageCircle size={13} style={{ verticalAlign:'text-bottom', marginRight:4 }} /> WhatsApp
                  </button>
                  <button
                    onClick={handleFirmarConsentimiento}
                    style={consentimientoFirmado
                      ? { padding:'8px 12px', border:'1px solid #86efac', background:'#ecfdf5', color:'#166534', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }
                      : { padding:'8px 12px', border:'1px solid #fcd34d', background:'#fffbeb', color:'#92400e', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    <CheckCircle size={13} style={{ verticalAlign:'text-bottom', marginRight:4 }} />
                    {consentimientoFirmado ? 'Consentimiento firmado' : 'Firmar consentimiento'}
                  </button>
                </div>
              </div>

              {/* Análisis Automático del Odontograma */}
              {procedimientoAutomaticoOrtodoncia.length > 0 && (
                <div style={{
                  marginBottom: 16,
                  padding: '18px 20px',
                  borderRadius: 14,
                  border: '1px solid #bfdbfe',
                  background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: '#dbeafe', display: 'grid', placeItems: 'center' }}>
                        <Scan size={18} color="#1d4ed8" />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                          Recomendación Clínica Extraída del Odontograma
                        </h4>
                        <div style={{ marginTop: 2, fontSize: 12, color: '#475569' }}>
                          Sugerencias trazables desde hallazgos activos y estado de aparatología.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Importar sugerencias evitando duplicados por hallazgo y por clave estable
                        const newProcs = procedimientoAutomaticoOrtodoncia.filter((candidate) => {
                          const candidateKey = buildProcedureStableKey({ ...candidate, costoMaterial: candidate.costoMaterial ?? 0 }, selectedPatient?.id);
                          return !procedimientos.some((existing) => {
                            if (candidate.hallazgoOrigen && existing.hallazgoOrigen === candidate.hallazgoOrigen) return true;
                            const existingKey = buildProcedureStableKey({ ...existing, costoMaterial: existing.costoMaterial ?? 0 }, selectedPatient?.id);
                            return existingKey === candidateKey;
                          });
                        });
                        if (newProcs.length > 0) {
                          setProcedimientos([...procedimientos, ...newProcs]);
                          toastSuccess(`Se agregaron ${newProcs.length} procedimiento(s) desde el odontograma`);
                          // Auto-scroll to procedures table
                          setTimeout(() => {
                            tablaProcedimientosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        } else {
                          toastError('Los procedimientos automáticos ya están en la lista');
                        }
                      }}
                      style={{
                        padding: '9px 15px',
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 6px 14px rgba(15,23,42,0.2)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Plus size={14} /> Importar al Plan
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    <div style={{ padding: 12, background: 'white', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                        Brackets detectados
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#1e40af', fontFamily: 'monospace' }}>
                        {analisisOdontogramaParaProcedimientos.totalBrackets}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Superior: {analisisOdontogramaParaProcedimientos.bracketsSuperiores} | Inferior: {analisisOdontogramaParaProcedimientos.bracketsInferiores}
                      </div>
                    </div>

                    <div style={{ padding: 12, background: 'white', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                        Presupuesto calculado
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>
                        {formatCOP(procedimientoAutomaticoOrtodoncia.reduce((sum, p) => {
                          if (p.costoPendiente || p.precioNoAplica) return sum;
                          return sum + (p.costo || 0);
                        }, 0))}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {esPrimeraVezOrtodoncia ? 'Instalación inicial' : 'Control + ajustes'}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    {procedimientoAutomaticoOrtodoncia.map(proc => (
                      <div key={proc.id} style={{ 
                        padding: '10px 12px', 
                        background: 'white', 
                        borderRadius: 8, 
                        marginBottom: 6, 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 13,
                        border: '1px solid #e0f2fe'
                      }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{proc.nombre}</strong>
                          <span style={{ color: '#64748b', marginLeft: 8 }}>• {proc.accesorio}</span>
                        </div>
                        <div style={{ fontWeight: 800, color: proc.costoPendiente ? '#dc2626' : '#059669', fontFamily: 'monospace' }}>
                          {proc.precioNoAplica ? 'N/A' : (proc.costoPendiente ? 'Pendiente' : formatCOP(proc.costo))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próxima Visita */}
              <div style={{
                marginBottom: 16,
                padding: '14px 18px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <Calendar size={20} color="#64748b" />
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>
                    Próxima visita programada
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const fecha = new Date();
                        fecha.setDate(fecha.getDate() + 5);
                        setProximaVisita(fecha.toISOString().split('T')[0]);
                      }}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                    >
                      5 días
                    </button>
                    <button
                      onClick={() => {
                        const fecha = new Date();
                        fecha.setDate(fecha.getDate() + 15);
                        setProximaVisita(fecha.toISOString().split('T')[0]);
                      }}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                    >
                      15 días
                    </button>
                    <button
                      onClick={() => {
                        const fecha = new Date();
                        fecha.setDate(fecha.getDate() + 30);
                        setProximaVisita(fecha.toISOString().split('T')[0]);
                      }}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                    >
                      30 días
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input
                    type="date"
                    className="oc-input"
                    value={proximaVisita}
                    onChange={(e) => setProximaVisita(e.target.value)}
                    style={{ maxWidth: 200, flex: 1 }}
                  />
                  {proximaVisita && (
                    <div style={{ padding: '8px 14px', background: '#dbeafe', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                      {(() => {
                        const dias = Math.floor((new Date(proximaVisita).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return dias > 0 ? `En ${dias} día${dias === 1 ? '' : 's'}` : dias === 0 ? 'Hoy' : `Atrasado ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                marginBottom: 12,
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${hallazgosBracketDesprendido.length > 0 ? '#fca5a5' : '#bfdbfe'}`,
                background: hallazgosBracketDesprendido.length > 0 ? '#fff1f2' : '#f8fafc',
                color: '#334155',
                fontSize: 13,
                lineHeight: 1.7
              }}>
                {(() => {
                  const fallas = hallazgosBracketDesprendido.length;
                  const cortesiasDisponibles = Math.max(0, RECEMENTADOS_GRATIS - recementadosContador);
                  const cortesiasAplicadas = Math.min(fallas, cortesiasDisponibles);
                  const cobrables = Math.max(0, fallas - cortesiasAplicadas);
                  const recargo = cobrables * TARIFA_RECEMENTADO_BRACKET;

                  if (motivoSeleccionado === 'control') {
                    return (
                      <>
                        <div><strong>Control mensual normal:</strong> {formatCOP(TARIFA_BASE_CONTROL_ORTODONCIA)}</div>
                        {fallas > 0 ? (
                          <div>
                            <strong>Novedad del control:</strong> {fallas} bracket(s)/tubo(s) con falla. Cortesías disponibles: {cortesiasDisponibles}. Aplicadas hoy: {cortesiasAplicadas}. Cobrables: {cobrables}. Recargo: <strong>{formatCOP(recargo)}</strong>.
                          </div>
                        ) : (
                          <div><strong>Novedad del control:</strong> sin fallas de bracket/alambre en odontograma.</div>
                        )}
                        <div><strong>Total estimado control + novedades:</strong> {formatCOP(TARIFA_BASE_CONTROL_ORTODONCIA + recargo)}</div>
                      </>
                    );
                  }

                  if (motivoSeleccionado === 'bracket_caido') {
                    return (
                      <>
                        <div><strong>Consulta por bracket/tubo caído:</strong> no se agrega tarifa de control mensual automáticamente.</div>
                        <div>
                          <strong>Recementado sugerido:</strong> {fallas > 0 ? `${fallas} evento(s)` : 'pendiente de confirmar en odontograma'}. Cortesías disponibles: {cortesiasDisponibles}. Cobrables: {cobrables}. Total estimado: <strong>{formatCOP(recargo)}</strong>.
                        </div>
                      </>
                    );
                  }

                  if (motivoSeleccionado) {
                    return (
                      <>
                        <div><strong>Motivo activo:</strong> {MOTIVO_LABELS[motivoSeleccionado] || motivoSeleccionado}.</div>
                        <div><strong>Recomendación:</strong> registrar consulta clínica y definir si aplica cobro, o marcar N/A.</div>
                      </>
                    );
                  }

                  return <div><strong>Recomendación:</strong> seleccione el motivo principal para cargar sugerencias y reglas de cobro.</div>;
                })()}
              </div>

              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 12px', marginBottom:12, color:'#334155', fontSize:13, lineHeight:1.6 }}>
                {quickHallazgoNarrative || hallazgosPendientesTexto}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'2.2fr .9fr .9fr .9fr 1fr auto', gap:10, padding:'12px', border:'1px solid #e2e8f0', borderRadius:12, background:'#fff', marginBottom:14, alignItems:'end' }}>
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Procedimiento (buscador inteligente)</label>
                  <input
                    className="oc-input"
                    list="ortho-procedure-options"
                    placeholder="Escribe ej: Resina..."
                    value={nuevoProcedimiento.nombre || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNuevoProcedimiento((prev) => ({ ...prev, nombre: value }));
                      applyProcedureDefaults(value, false);
                    }}
                    onBlur={(e) => applyProcedureDefaults(e.target.value, false)}
                  />
                  <datalist id="ortho-procedure-options">
                    {procedureAutocomplete.map((item) => (
                      <option key={item.nombre} value={item.nombre}>{`${item.nombre} - ${formatCOP(item.precio)}`}</option>
                    ))}
                  </datalist>
                </div>
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Pieza Dental</label>
                  <input className="oc-input" placeholder="16" value={nuevoProcedimiento.pieza || ''} onChange={(e) => setNuevoProcedimiento((prev) => ({ ...prev, pieza: e.target.value }))} />
                </div>
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Tipo/Accesorio</label>
                  <input className="oc-input" placeholder="Bracket" value={nuevoProcedimiento.accesorio || ''} onChange={(e) => setNuevoProcedimiento((prev) => ({ ...prev, accesorio: e.target.value }))} />
                </div>
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Estado inicial</label>
                  <select
                    className="oc-input"
                    value={String(nuevoProcedimiento.estado || 'sugerido')}
                    onChange={(e) => setNuevoProcedimiento((prev) => ({ ...prev, estado: e.target.value as any }))}
                  >
                    <option value="sugerido">Sugerido</option>
                    <option value="presupuestado">Presupuestado</option>
                    <option value="aprobado">Aprobado</option>
                  </select>
                </div>
                <div className="oc-form-group" style={{ marginBottom: 0 }}>
                  <label>Gestión de precio</label>
                  <select
                    className="oc-input"
                    value={nuevoProcedimiento.precioNoAplica ? 'na' : (nuevoProcedimiento.costoPendiente ? 'pendiente' : 'definido')}
                    onChange={(e) => {
                      const mode = e.target.value;
                      setNuevoProcedimiento((prev) => ({
                        ...prev,
                        precioNoAplica: mode === 'na',
                        costoPendiente: mode === 'pendiente',
                        costo: mode === 'definido' ? Math.max(0, Number(prev.costo || 0)) : 0,
                      }));
                    }}
                  >
                    <option value="definido">Definido</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
                <button className="oc-btn-primary" style={{ height: 44, padding: '0 18px' }} onClick={handleAddProcedureInline}><Plus size={16} /> Añadir</button>

                <div className="oc-form-group" style={{ marginBottom: 0, gridColumn: '1 / span 2' }}>
                  <label>Observaciones clínicas</label>
                  <input
                    className="oc-input"
                    placeholder="Detalle técnico, justificación, cortesía, etc."
                    value={nuevoProcedimiento.observaciones || ''}
                    onChange={(e) => setNuevoProcedimiento((prev) => ({ ...prev, observaciones: e.target.value }))}
                  />
                </div>
                <div className="oc-form-group" style={{ marginBottom: 0, gridColumn: '3 / span 2' }}>
                  <label>Precio (COP)</label>
                  <input
                    className="oc-input"
                    type="number"
                    min="0"
                    disabled={Boolean(nuevoProcedimiento.costoPendiente) || Boolean(nuevoProcedimiento.precioNoAplica)}
                    value={Number(nuevoProcedimiento.costo || 0)}
                    onChange={(e) => setNuevoProcedimiento((prev) => ({ ...prev, costo: Math.max(0, Number(e.target.value || 0)), costoPendiente: false, precioNoAplica: false }))}
                    style={{
                      borderColor: nuevoProcedimiento.costoPendiente ? '#ef4444' : '#e2e8f0',
                      background: nuevoProcedimiento.precioNoAplica ? '#f8fafc' : 'white',
                    }}
                  />
                </div>
                <div style={{ gridColumn: '5 / span 2', fontSize: 11, fontWeight: 700, color: nuevoProcedimiento.costoPendiente ? '#dc2626' : '#64748b', paddingBottom: 4 }}>
                  {nuevoProcedimiento.precioNoAplica
                    ? 'Precio marcado como N/A para este procedimiento.'
                    : (nuevoProcedimiento.costoPendiente
                      ? 'Precio pendiente de asignación (revisar antes de aprobar/ejecutar).'
                      : 'Precio definido y editable.')}
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>
                  {procedimientosSugeridos.length > 0 ? `${procedimientosSugeridos.length} sugerencia(s) automática(s) detectadas por odontograma.` : 'Sin sugerencias automáticas pendientes.'}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={aceptarSugerencias} disabled={procedimientosSugeridos.length === 0} style={{ padding:'7px 10px', border:'1px solid #bae6fd', background: procedimientosSugeridos.length ? '#f0f9ff' : '#f8fafc', color: procedimientosSugeridos.length ? '#0c4a6e' : '#94a3b8', borderRadius:8, fontSize:12, fontWeight:700, cursor: procedimientosSugeridos.length ? 'pointer' : 'not-allowed' }}>Importar sugerencias</button>
                  <button onClick={handleMarcarTodoRealizado} style={{ padding:'7px 10px', border:'1px solid #bbf7d0', background:'#f0fdf4', color:'#166534', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Realizar todo (sugeridos)</button>
                </div>
              </div>

              <div ref={tablaProcedimientosRef} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: COLORS.background, color: COLORS.textLight, textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
                      <th style={{ padding: '12px' }}>Descripción del Procedimiento</th>
                      <th style={{ padding: '12px' }}>Pieza Dental</th>
                      <th style={{ padding: '12px' }}>Tipo</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Precio (COP)</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedimientos.map((p) => {
                      const getBadgeStyle = (estado: string) => {
                        switch(estado) { case 'realizado': return { bg: COLORS.successLight, text: COLORS.success }; case 'aprobado': return { bg: COLORS.primaryLight, text: COLORS.primaryDark }; case 'presupuestado': return { bg: '#e0e7ff', text: '#4338ca' }; default: return { bg: COLORS.warningLight, text: COLORS.warning }; }
                      };
                      const badge = getBadgeStyle(p.estado);
                      const toolColor = p.tipoHallazgo ? getToolColor(p.tipoHallazgo) : { base: COLORS.border, pastel: 'white' };
                      const precioSinDefinir = Boolean(p.costoPendiente) && !Boolean(p.precioNoAplica);

                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.border}`, background: p.estado === 'realizado' ? '#f0fdf4' : (precioSinDefinir ? '#fff7ed' : 'white'), transition: 'background 0.3s' }}>
                          <td style={{ padding: '12px', background: toolColor.pastel }}>
                            <input type="text" value={p.nombre} onChange={(e) => actualizarProcedimiento(p.id, 'nombre', e.target.value)} style={{ fontWeight: 700, fontSize: '13px', color: COLORS.text, background: 'transparent', border: 'none', width: '100%', outline: 'none', borderBottom: p.migradoDesdeOdontograma ? `1px dashed ${toolColor.base}` : 'none' }} />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <input type="text" value={p.pieza || ''} onChange={(e) => actualizarProcedimiento(p.id, 'pieza', e.target.value)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 8px', fontSize:12.5 }} placeholder="General" />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <input type="text" value={p.accesorio || ''} onChange={(e) => actualizarProcedimiento(p.id, 'accesorio', e.target.value)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 8px', fontSize:12.5 }} placeholder="Bracket" />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <select value={p.estado} onChange={(e) => actualizarProcedimiento(p.id, 'estado', e.target.value)} style={{ padding: '6px 12px', borderRadius: '24px', border: `1px solid ${badge.text}40`, background: badge.bg, color: badge.text, fontWeight: 800, fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                              <option value="sugerido">Sugerido</option><option value="presupuestado">Presupuestado</option><option value="aprobado">Aprobado</option><option value="realizado">Realizado (Hoy)</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px', textAlign:'right' }}>
                            <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                              {p.precioNoAplica ? (
                                <div style={{
                                  width: 120,
                                  border: '1px solid #94a3b8',
                                  borderRadius: 8,
                                  padding: '7px 8px',
                                  textAlign: 'center',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: '#334155',
                                  background: '#f8fafc'
                                }}>
                                  N/A
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={Number(p.costo || 0)}
                                  disabled={Boolean(p.costoPendiente)}
                                  onChange={(e) => actualizarProcedimiento(p.id, 'costo', Number(e.target.value || 0))}
                                  style={{
                                    width:120,
                                    border:`1px solid ${precioSinDefinir ? '#ef4444' : '#e2e8f0'}`,
                                    borderRadius:8,
                                    padding:'6px 8px',
                                    fontSize:12.5,
                                    textAlign:'right',
                                    fontFamily:"'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                                    background: precioSinDefinir ? '#fff1f2' : 'white',
                                    color: precioSinDefinir ? '#b91c1c' : COLORS.text,
                                  }}
                                />
                              )}

                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => actualizarProcedimiento(p.id, 'costoPendiente', !p.costoPendiente)}
                                  style={{
                                    border: `1px solid ${p.costoPendiente ? '#ef4444' : '#cbd5e1'}`,
                                    background: p.costoPendiente ? '#fff1f2' : '#f8fafc',
                                    color: p.costoPendiente ? '#b91c1c' : '#475569',
                                    borderRadius: 7,
                                    padding: '3px 7px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Pendiente
                                </button>
                                <button
                                  onClick={() => actualizarProcedimiento(p.id, 'precioNoAplica', !p.precioNoAplica)}
                                  style={{
                                    border: `1px solid ${p.precioNoAplica ? '#0f172a' : '#cbd5e1'}`,
                                    background: p.precioNoAplica ? '#0f172a' : '#f8fafc',
                                    color: p.precioNoAplica ? 'white' : '#475569',
                                    borderRadius: 7,
                                    padding: '3px 7px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  N/A
                                </button>
                              </div>

                              {precioSinDefinir && (
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>
                                  Asignar precio o marcar N/A
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                              <button
                                onClick={() => solicitarEjecucionProcedimiento(p.id)}
                                disabled={p.estado === 'realizado' || (p.costoPendiente && !p.precioNoAplica)}
                                style={{
                                  background: p.estado === 'realizado' ? '#dcfce7' : ((p.costoPendiente && !p.precioNoAplica) ? '#fef2f2' : '#ecfeff'),
                                  border: `1px solid ${p.estado === 'realizado' ? '#86efac' : ((p.costoPendiente && !p.precioNoAplica) ? '#fecaca' : '#67e8f9')}`,
                                  color: p.estado === 'realizado' ? '#166534' : ((p.costoPendiente && !p.precioNoAplica) ? '#b91c1c' : '#0e7490'),
                                  cursor: (p.estado === 'realizado' || (p.costoPendiente && !p.precioNoAplica)) ? 'not-allowed' : 'pointer',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  fontSize: 11,
                                  fontWeight: 800
                                }}
                                title={p.estado === 'realizado'
                                  ? 'Ya ejecutado'
                                  : ((p.costoPendiente && !p.precioNoAplica)
                                    ? 'Defina precio o marque N/A antes de ejecutar'
                                    : 'Ejecutar y guardar')}
                              >
                                {p.estado === 'realizado' ? 'Ejecutado' : ((p.costoPendiente && !p.precioNoAplica) ? 'Precio pendiente' : 'Ejecutar')}
                              </button>
                              <button onClick={() => setProcedimientos(procedimientos.filter(item => item.id !== p.id))} style={{ background: COLORS.errorLight, border: 'none', color: COLORS.error, cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}><Trash size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {procedimientos.length === 0 && (
  <tr>
    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: COLORS.textLight }}>
      <div style={{ fontSize: '14px', fontWeight: 500 }}>El plan de tratamiento ortodóntico está vacío.</div>
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
              
              {/* Ejecutar Todo button */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={solicitarEjecucionTodos}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}><Printer size={18} /> Receta Actual</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button onClick={() => handleImprimir('receta')} disabled={recetas.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: recetas.length === 0 ? 'not-allowed' : 'pointer', opacity: recetas.length === 0 ? 0.4 : 1 }}>
                    <Printer size={13} /> Imprimir / PDF
                  </button>
                  <button onClick={() => handleWhatsApp('receta')} disabled={recetas.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: recetas.length === 0 ? 'not-allowed' : 'pointer', opacity: recetas.length === 0 ? 0.4 : 1 }}>
                    <MessageCircle size={13} /> WhatsApp Receta
                  </button>
                  <button onClick={() => handleImprimir('presupuesto')} disabled={procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0 ? 0.4 : 1 }}>
                    <Download size={13} /> PDF Cotizacion
                  </button>
                  <button onClick={() => handleWhatsApp('presupuesto')} disabled={procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: procedimientos.filter(p => p.estado === 'aprobado' || p.estado === 'realizado').length === 0 ? 0.4 : 1 }}>
                    <MessageCircle size={13} /> WhatsApp Cotizacion
                  </button>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DIAMOND: GESTOR DE SOLICITUDES RADIOGRÁFICAS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {showDiagnosticModal && (
        <div
          className="no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDiagnosticModal(false);
          }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '18px'
          }}
        >
          <div className="fade-in" style={{
            background: '#f8fafc',
            borderRadius: '18px',
            border: '1px solid #d6dee8',
            width: 'min(980px, 100%)',
            maxHeight: '92vh',
            overflow: 'hidden',
            boxShadow: '0 28px 48px rgba(15,23,42,.24)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              borderBottom: '1px solid #d6dee8',
              background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)'
            }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Scan size={22} /> Gestor de Solicitudes Radiográficas
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Solicitud RX y consentimiento en flujos separados
                </p>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                style={{ width: 34, height: 34, border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#64748b', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderBottom: '1px solid #dbe3ec', background: '#f1f5f9' }}>
              <button
                onClick={() => setDiagnosticModalTab('solicitud')}
                style={{
                  border: diagnosticModalTab === 'solicitud' ? '1px solid #334155' : '1px solid #cbd5e1',
                  background: diagnosticModalTab === 'solicitud' ? '#334155' : '#fff',
                  color: diagnosticModalTab === 'solicitud' ? '#fff' : '#334155',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Solicitud RX
              </button>
              <button
                onClick={() => setDiagnosticModalTab('consentimiento')}
                style={{
                  border: diagnosticModalTab === 'consentimiento' ? '1px solid #334155' : '1px solid #cbd5e1',
                  background: diagnosticModalTab === 'consentimiento' ? '#334155' : '#fff',
                  color: diagnosticModalTab === 'consentimiento' ? '#fff' : '#334155',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Consentimiento Informado (Opcional)
              </button>
            </div>

            <div style={{ padding: '18px', overflowY: 'auto', maxHeight: 'calc(92vh - 190px)' }}>
              {diagnosticModalTab === 'solicitud' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ border: '1px solid #d6dee8', borderRadius: 12, background: '#fff', padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
                      Tipo de Radiografía
                    </div>
                    {radiologiaSugerida.tipos.length > 0 && (
                      <div style={{ marginBottom: 12, fontSize: 12, color: '#334155', background: '#f8fafc', border: '1px solid #dbe3ec', borderRadius: 8, padding: '8px 10px' }}>
                        Sugerencia clínica por motivo: <strong>{MOTIVO_LABELS[motivoSeleccionado] || motivoSeleccionado}</strong>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
                      {RADIOLOGIA_TIPOS.map((tipo) => (
                        <button
                          key={tipo.id}
                          onClick={() => {
                            setSelectedRxType(tipo.id);
                            const nueva = generarJustificacionRx(tipo.label, motivoSeleccionado, selectedRxPiezas);
                            setRxJustificacionAuto(nueva);
                          }}
                          style={{
                            border: selectedRxType === tipo.id ? '2px solid #334155' : '1px solid #dbe3ec',
                            background: selectedRxType === tipo.id ? '#eef2f7' : '#fff',
                            borderRadius: 10,
                            padding: '10px 8px',
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#1f2937',
                            cursor: 'pointer'
                          }}
                        >
                          {tipo.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #d6dee8', borderRadius: 12, background: '#f8fafc', padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
                      Informe de Marcación RX desde Odontograma
                    </div>
                    {detalleRxDesdeOdontograma.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, color: '#334155', background: '#fff', border: '1px solid #dbe3ec', borderRadius: 8, padding: '10px 12px' }}>
                          <strong>Piezas marcadas RX:</strong> {detalleRxDesdeOdontograma.map((item) => item.pieza).join(', ')}
                        </div>
                        <div style={{ border: '1px solid #dbe3ec', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1.2fr', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            <div style={{ padding: '8px 10px' }}>Pieza</div>
                            <div style={{ padding: '8px 10px' }}>Cara</div>
                            <div style={{ padding: '8px 10px' }}>Hallazgo</div>
                          </div>
                          {detalleRxDesdeOdontograma.map((item) => (
                            <div key={item.pieza} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1.2fr', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#334155' }}>
                              <div style={{ padding: '8px 10px', fontWeight: 800 }}>{item.pieza}</div>
                              <div style={{ padding: '8px 10px' }}>{item.caras.length > 0 ? item.caras.join(', ') : 'No especificada'}</div>
                              <div style={{ padding: '8px 10px' }}>{item.hallazgos.length > 0 ? item.hallazgos.slice(0, 2).join(' · ') : 'Marcación RX activa'}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', background: '#f8fafc', border: '1px solid #dbe3ec', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
                          Estas piezas se arrastran automáticamente a la siguiente consulta mientras el marcador RX permanezca activo en odontograma.
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#94a3b8', background: '#fff', border: '1px dashed #dbe3ec', borderRadius: 8, padding: '12px', textAlign: 'center', lineHeight: 1.5 }}>
                        No hay piezas con RX activo. Marca en odontograma con "Requiere RX / Imagen".
                      </div>
                    )}
                  </div>

                  <div style={{ border: '1px solid #d6dee8', borderRadius: 12, background: '#fff', padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                      Justificación Clínica
                    </div>
                    <textarea
                      value={rxJustificacionAuto}
                      onChange={(e) => setRxJustificacionAuto(e.target.value)}
                      placeholder="Ejemplo: Lectura de radiografía panorámica para descartar reabsorción radicular..."
                      style={{
                        width: '100%',
                        minHeight: 120,
                        border: '1px solid #d6dee8',
                        borderRadius: 9,
                        background: '#f8fafc',
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#1f2937',
                        lineHeight: 1.6,
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              )}

              {diagnosticModalTab === 'consentimiento' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ border: '1px solid #d6dee8', borderRadius: 12, background: '#fff', padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                      Texto de Consentimiento (Opcional)
                    </div>
                    <textarea
                      value={consentimientoTexto}
                      onChange={(e) => setConsentimientoTexto(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 170,
                        border: '1px solid #d6dee8',
                        borderRadius: 9,
                        background: '#f8fafc',
                        padding: '10px 12px',
                        fontSize: 12.5,
                        color: '#1f2937',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                      }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10, fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={consentimientoAceptado}
                        onChange={(e) => setConsentimientoAceptado(e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      Adjuntar este consentimiento a la orden
                    </label>
                  </div>

                  <div style={{ border: '1px solid #d6dee8', borderRadius: 12, background: '#fff', padding: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                      Firma Digital (solo si adjuntas consentimiento)
                    </div>
                    {!showSignaturePad ? (
                      <>
                        {firmaDigitalBase64 ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: '1px solid #bbf7d0', borderRadius: 10, background: '#f0fdf4', padding: '10px 12px' }}>
                            <span style={{ fontSize: 12.5, color: '#166534', fontWeight: 700 }}>
                              Firma digital capturada
                            </span>
                            <button onClick={() => setShowSignaturePad(true)} style={{ border: '1px solid #86efac', borderRadius: 8, background: '#fff', padding: '5px 10px', fontSize: 12, fontWeight: 700, color: '#166534', cursor: 'pointer' }}>
                              Editar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setShowSignaturePad(true);
                              setTimeout(() => handleInitSignaturePad(), 80);
                            }}
                            style={{ width: '100%', border: '1px dashed #94a3b8', borderRadius: 10, background: '#fff', padding: '11px 12px', fontSize: 12.5, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                          >
                            Capturar firma digital
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ border: '1px solid #dbe3ec', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                        <canvas
                          ref={signaturePadRef}
                          width={800}
                          height={200}
                          onMouseDown={handleSignaturePadMouseDown}
                          onMouseMove={handleSignaturePadMouseMove}
                          onMouseUp={handleSignaturePadMouseUp}
                          onMouseLeave={handleSignaturePadMouseUp}
                          style={{ border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'crosshair', width: '100%', height: 160, display: 'block', background: '#fff' }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={handleInitSignaturePad} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#475569', padding: '7px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Limpiar
                          </button>
                          <button onClick={handleGuardarFirmaDigital} style={{ flex: 1, border: '1px solid #334155', borderRadius: 8, background: '#334155', color: '#fff', padding: '7px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Guardar firma
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid #dbe3ec', background: '#eef2f7', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 9,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
              <button
                onClick={handleCrearOrdenRadiologia}
                style={{
                  padding: '10px 16px',
                  borderRadius: 9,
                  border: '1px solid #0f172a',
                  background: '#0f172a',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(15,23,42,.25)'
                }}
              >
                Crear Orden Radiológica
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div><h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: COLORS.text }}>¿Cancelar consulta?</h2></div>
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
      {/* MODAL NOTA ACLARATORIA */}
      {showNotaModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ background: 'white', borderRadius: '20px', width: '540px', maxWidth: '92%', padding: '32px', boxShadow: '0 24px 40px rgba(0,0,0,0.15)' }}>
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
              placeholder="Ej: Error en pieza registrada. Aclaracion firmada por el Dr. ..."
              className="oc-input"
              style={{ resize: 'vertical', marginBottom: '16px', width: '100%', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowNotaModal(false); setNotaAclaratoria(''); }} style={{ padding: '10px 20px', background: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>Cancelar</button>
              <button
                disabled={!notaAclaratoria.trim()}
                onClick={async () => {
                  if (!notaAclaratoria.trim()) return;
                  const timestamp = new Date().toLocaleString('es-CO');
                  try {
                    await supabase.from('consultas_odontologicas').update({
                      detalles_clinicos: { nota_aclaratoria: notaAclaratoria, nota_aclaratoria_fecha: new Date().toISOString(), nota_aclaratoria_texto: `[${timestamp}] ${notaAclaratoria}` }
                    }).eq('id', sessionId);
                    toastSuccess('Nota aclaratoria guardada en el expediente.');
                  } catch (_) {
                    toastError('No se pudo guardar la nota. Verifica la conexion.');
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
}