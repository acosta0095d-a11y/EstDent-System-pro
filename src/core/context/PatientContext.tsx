import { createContext, useContext, useState, ReactNode } from 'react';

// ============================================
// TIPOS
// ============================================
export interface Patient {
  id: string;
  cc: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string;
  email: string;
  ciudad: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimaVisita: string;
}

interface PatientContextType {
  // Pacientes
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  
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

  return (
    <PatientContext.Provider value={{
      selectedPatient,
      setSelectedPatient,
      patients,
      setPatients,
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