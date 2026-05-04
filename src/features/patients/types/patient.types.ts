export interface Patient {
  id: string;
  cc: string;
  nombre: string;
  apellidos?: string;
  edad: number;
  telefono: string;
  email: string;
  municipio_ciudad: string;
  direccion: string;
  tipo_sangre_rh?: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface PatientFilters {
  searchTerm: string;
  estado: 'todos' | 'activos' | 'inactivos';
}