import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../../shared/lib/supabase';

// ============================================
// TIPOS
// ============================================
export interface Patient {
  id: string;
  cc: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  edad: number;
  creado_en: string;
  telefono?: string;
  email?: string;
  consultas?: any[];
  clinical_history?: any;
  historia_completa?: boolean;
}

interface PatientContextType {
  // Pacientes
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  saveConsultation: (consultationData: any) => Promise<any>;
  loadPatientById: (id: string) => Promise<void>;
  
  // Navegación
  currentView: string;
  setCurrentView: (view: string) => void;
}

// ============================================
// CONTEXTO
// ============================================
const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentView, setCurrentView] = useState<string>('inicio');

  const saveConsultation = async (consultationData: any) => {
    if (!consultationData || !consultationData.paciente_id) {
      throw new Error('No se proporcionó paciente_id en consultationData');
    }

    // Estructurar el payload exactamente según las especificaciones
    let payload: any = {
      paciente_id: consultationData.paciente_id,
      tipo_consulta: consultationData.tipo_consulta || 'GENERAL',
      tiempo_sesion: consultationData.tiempo_atencion_segundos || consultationData.tiempo_sesion || 0
    };

    // Manejar diferentes estructuras de payload
    if (consultationData.detalles_clinicos && consultationData.detalles_clinicos.anamnesis) {
      // Estructura de OrthoConsultation con nuevo formato
      payload.hallazgos_odontograma = consultationData.hallazgos_odontograma || [];
      payload.estado_odontograma = consultationData.estado_odontograma || {};
      payload.detalles_clinicos = consultationData.detalles_clinicos;
    } else if (consultationData.detalles) {
      // Estructura antigua de OrthoConsultation (por compatibilidad)
      payload.hallazgos_odontograma = consultationData.hallazgos || [];
      payload.estado_odontograma = consultationData.estado_odontograma || {};
      payload.detalles_clinicos = consultationData.detalles;
    } else {
      // Estructura de GeneralConsultation
      payload.hallazgos_odontograma = consultationData.hallazgos_odontograma || [];
      payload.estado_odontograma = consultationData.estado_odontograma || {};
      payload.detalles_clinicos = {
        motivo: consultationData.motivo_principal,
        tags: consultationData.motivo_tags,
        examen_fisico: consultationData.examen_estomatologico,
        dolor: {
          escala: consultationData.dolor_escala,
          detalles: consultationData.dolor_detalles
        },
        plan_tratamiento: consultationData.plan_tratamiento,
        recetas: consultationData.recetas_prescritas,
        notas: consultationData.estado_general,
        diagnosticos_cie10: consultationData.diagnosticos_cie10,
        consentimiento_informado: consultationData.consentimiento_informado
      };
    }

    const insertIntoConsultas = async (payload: any) => {
      console.log('[saveConsultation] Enviando payload a Supabase:', {
        paciente_id: payload.paciente_id,
        tipo_consulta: payload.tipo_consulta,
        tiempo_sesion: payload.tiempo_sesion,
        hallazgos_count: payload.hallazgos_odontograma?.length || 0,
        estado_odontograma_keys: Object.keys(payload.estado_odontograma || {}),
        detalles_clinicos_keys: Object.keys(payload.detalles_clinicos || {})
      });
      return await supabase
        .from('consultas_odontologicas')
        .insert([payload])
        .select();
    };

    try {
      const { data, error } = await insertIntoConsultas(payload);

      if (error) {
        console.error('[saveConsultation] Error de Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(error?.message || 'Error desconocido al insertar consulta');
      }

      console.log('[saveConsultation] Consulta guardada exitosamente:', data?.[0]?.id);

      const nuevaConsulta = (data as any)?.[0];
      if (selectedPatient && nuevaConsulta) {
        // Refrescar la lista para evitar desaparición tras navegación / refresh
        await loadPatientById(selectedPatient.id);

        // Mantenemos el selector en la última data actualizada (seguro)
        const pacienteActualizado = {
          ...selectedPatient,
          consultas: [nuevaConsulta, ...(selectedPatient.consultas || [])]
        };
        setSelectedPatient(pacienteActualizado);
        setPatients(patients.map(p => p.id === selectedPatient.id ? pacienteActualizado : p));
      }

      return data;
    } catch (error: any) {
      console.error('[saveConsultation] Error al guardar consulta en supabase:', error);
      throw new Error(error?.message || 'Error desconocido al insertar consulta');
    }
  };

  const loadPatientById = async (id: string) => {
    try {
      // 1) Cargar datos básicos del paciente
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (pacienteError) throw pacienteError;

      // 2) Cargar consultas ordenadas por fecha (descendente) y filtradas por paciente_id
      let consultaData: any[] | null = null;
      let consultaError: any = null;

      const loadConsultasByFecha = async () => {
        const response = await supabase
          .from('consultas_odontologicas')
          .select('*')
          .eq('paciente_id', id)
          .order('fecha', { ascending: false });
        consultaData = response.data;
        consultaError = response.error;
      };

      await loadConsultasByFecha();
      if (consultaError) {
        console.warn('[loadPatientById] Error al ordenar por fecha, intentando created_at:', consultaError.message || consultaError);
        const response = await supabase
          .from('consultas_odontologicas')
          .select('*')
          .eq('paciente_id', id)
          .order('created_at', { ascending: false });
        consultaData = response.data;
        consultaError = response.error;
      }

      if (consultaError) throw consultaError;

      const paciente = pacienteData;
      if (paciente) {
        const consultas = Array.isArray(consultaData) ? consultaData : [];
        const consultasNorm = consultas.map((consulta: any) => {
          const detalles = consulta.detalles_clinicos || {};
          if (detalles.anamnesis) {
            return {
              ...consulta,
              ...detalles.anamnesis,
              examenOrto: detalles.examen,
              procedimientos: detalles.plan_tratamiento,
              recetas: detalles.recetario,
              hallazgos_odontograma: consulta.hallazgos_odontograma || [],
              estado_odontograma: consulta.estado_odontograma || {},
              tiempo_atencion_segundos: consulta.tiempo_sesion || 0,
              fecha: consulta.fecha || consulta.created_at
            };
          } else {
            return {
              ...consulta,
              motivo_principal: detalles.motivo,
              motivo_tags: detalles.tags,
              estado_general: detalles.notas,
              dolor_escala: detalles.dolor?.escala,
              dolor_detalles: detalles.dolor?.detalles,
              examen_estomatologico: detalles.examen_fisico,
              diagnosticos_cie10: detalles.diagnosticos_cie10,
              plan_tratamiento: detalles.plan_tratamiento,
              recetas_prescritas: detalles.recetas,
              consentimiento_informado: detalles.consentimiento_informado,
              hallazgos_odontograma: consulta.hallazgos_odontograma || [],
              estado_odontograma: consulta.estado_odontograma || {},
              tiempo_atencion_segundos: consulta.tiempo_sesion || 0,
              fecha: consulta.fecha || consulta.created_at
            };
          }
        });

        const computedAge = paciente.edad || (paciente.fecha_nacimiento ? (()=>{
          const d = new Date(paciente.fecha_nacimiento);
          if (Number.isNaN(d.getTime())) return null;
          const today = new Date();
          if (d > today) return null;
          let age = today.getFullYear() - d.getFullYear();
          const monthDiff = today.getMonth() - d.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
          return age >= 0 ? age : null;
        })() : null);

        setSelectedPatient({
          ...paciente,
          consultas: consultasNorm,
          edad: computedAge ?? 0,
          telefono: paciente.telefono || '',
          email: paciente.email ? String(paciente.email).trim().toLowerCase() : ''
        } as Patient);
      }
    } catch (error) {
      console.error('Error al cargar paciente y historial:', error);
      throw error;
    }
  };

  return (
    <PatientContext.Provider value={{
      selectedPatient,
      setSelectedPatient,
      patients,
      setPatients,
      saveConsultation,
      loadPatientById,
      currentView,
      setCurrentView
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) throw new Error('usePatient debe usarse dentro de PatientProvider');
  return context;
};