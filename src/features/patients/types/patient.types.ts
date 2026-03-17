export interface Patient {
  id: string;
  cc: string;
  nombre: string;
  edad: number;
  telefono: string;
  email: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface PatientFilters {
  searchTerm: string;
  estado: 'todos' | 'activos' | 'inactivos';
}