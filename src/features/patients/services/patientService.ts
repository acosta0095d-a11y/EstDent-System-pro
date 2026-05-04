import { supabase } from '../../../shared/lib/supabase';
import {
  normalizePatientRh,
  omitPatientRhColumn,
  shouldRetryWithoutPatientRhColumn,
} from '../../../shared/lib/patientRhUtils';

const computeAgeFromBirth = (birthDate?: string | null): number | null => {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age--;
  }
  if (age < 0) age = 0;
  return age;
};

// ==========================================
// SERVICIO DE PACIENTES (Conexión a Supabase)
// ==========================================

export const patientService = {
  // 1. Traer todos los pacientes
  getPatients: async () => {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('creado_en', { ascending: false });
    
    if (error) {
      console.error("Error al traer pacientes:", error);
      throw error;
    }
    return data;
  },

  // 2. Crear un paciente nuevo
  createPatient: async (patientData: any) => {
    const allowedFields = ['cc','tipo_documento','nombre','apellidos','fecha_nacimiento','municipio_ciudad','direccion','estado','telefono','email','edad','tipo_sangre_rh'];
    const safePayload: any = {};

    Object.keys(patientData).forEach((key) => {
      if (allowedFields.includes(key)) safePayload[key] = patientData[key];
      else console.warn(`[patientService] Campo ignorado en insert pacientes: ${key}`);
    });

    // Si el valor de edad no viene, lo calculamos según fecha de nacimiento.
    if ((safePayload.edad === undefined || safePayload.edad === null || Number.isNaN(Number(safePayload.edad))) && safePayload.fecha_nacimiento) {
      const computed = computeAgeFromBirth(safePayload.fecha_nacimiento);
      if (computed !== null) safePayload.edad = computed;
    }

    safePayload.tipo_sangre_rh = normalizePatientRh(safePayload.tipo_sangre_rh);

    // Garanticemos que estén todos los campos necesarios
    const missing = allowedFields.filter(f => !Object.prototype.hasOwnProperty.call(safePayload, f));
    if (missing.length > 0) {
      console.warn('[patientService] Faltan campos en patientData:', missing);
    }

    console.log('[patientService] insert payload:', safePayload);
    let { data, error } = await supabase
      .from('pacientes')
      .insert([safePayload])
      .select();

    if (error && shouldRetryWithoutPatientRhColumn(error)) {
      ({ data, error } = await supabase
        .from('pacientes')
        .insert([omitPatientRhColumn(safePayload)])
        .select());
    }

    if (error) {
      console.error('Error al crear paciente:', error);
      throw error;
    }
    return data;
  },

  // 3. Actualizar un paciente
  updatePatient: async (id: string, patientData: any) => {
    const allowedFields = ['cc', 'tipo_documento', 'nombre', 'apellidos', 'fecha_nacimiento', 'municipio_ciudad', 'direccion', 'estado', 'telefono', 'email', 'edad', 'tipo_sangre_rh'];
    const safePayload: any = {};

    Object.keys(patientData).forEach((key) => {
      if (allowedFields.includes(key)) safePayload[key] = patientData[key];
      else console.warn(`[patientService] Campo ignorado en update pacientes: ${key}`);
    });

    // Si fecha_nacimiento cambia, recalcular edad
    if (safePayload.fecha_nacimiento) {
      const computed = computeAgeFromBirth(safePayload.fecha_nacimiento);
      if (computed !== null) safePayload.edad = computed;
    }

    if (Object.prototype.hasOwnProperty.call(safePayload, 'tipo_sangre_rh')) {
      safePayload.tipo_sangre_rh = normalizePatientRh(safePayload.tipo_sangre_rh);
    }

    console.log('[patientService] update payload:', safePayload);
    let { data, error } = await supabase
      .from('pacientes')
      .update(safePayload)
      .eq('id', id)
      .select();

    if (error && shouldRetryWithoutPatientRhColumn(error)) {
      ({ data, error } = await supabase
        .from('pacientes')
        .update(omitPatientRhColumn(safePayload))
        .eq('id', id)
        .select());
    }

    if (error) {
      console.error('Error al actualizar paciente:', error);
      throw error;
    }
    return data;
  },

  // 4. Eliminar un paciente
  deletePatient: async (id: string) => {
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar paciente:', error);
      throw error;
    }
  }
};