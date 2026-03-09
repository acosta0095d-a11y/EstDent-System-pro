import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Patient, ViewType } from '../types/patient';

interface PatientContextType {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('radar');

  return (
    <PatientContext.Provider value={{ 
      selectedPatient, 
      setSelectedPatient, 
      currentView, 
      setCurrentView 
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) throw new Error('usePatient debe usarse dentro de un PatientProvider');
  return context;
};