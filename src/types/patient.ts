// src/types/patient.ts
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  lastVisit: string;
  nextAppt: string;
  status: 'Active' | 'Inactive' | 'Pending';
  balance: number;
  treatment: string;
}

export type ViewType = 'radar' | 'dashboard' | 'calendar' | 'inventory';


