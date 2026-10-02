export interface SearchFilters {
  tipo: "hotel" | "hostal" | "centro_turistico" | "glamping" | "restaurante" | "bar" | "finca" | "actividad" | null;
  admiteMascotas: boolean | null;
  numeroHuespedesMin: number | null;
  numeroHabitacionesMin: number | null;
  seguroDisponible: boolean | null;
  actividades: string[];
  presupuestoMaximo: number | null;
  ubicacion: string | null;
  palabrasClave: string[];
}

export interface Property {
  id: string;
  nombre: string;
  tipo: "hotel" | "hostal" | "centro_turistico" | "glamping" | "restaurante" | "bar" | "finca" | "actividad";
  descripcion?: string;
  ubicacion?: string;
  coordenadas?: any;
  telefono?: string;
  email?: string;
  whatsapp?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  estrellas?: number;
  horarioCheckIn?: string;
  horarioCheckOut?: string;
  reglamento?: string;
  politicasCancelacion?: string;
  admiteMascotas: boolean;
  seguroDisponible: boolean;
  capacidadMaxima: number;
  numeroHabitaciones?: number;
  numeroBanos?: number | null;
  tieneCocina?: boolean;
  tieneParqueadero?: boolean;
  tieneWifi?: boolean;
  fuenteDatos?: string | null;
  ultimaVerificacion?: string | null;
  verificado?: boolean;
  horarioTexto?: string | null;
  ratingExterno?: number | null;
  resenasExternas?: number | null;
  precioNoche: number;
  actividades: string[];
  videos: string[];
  servicioImagenes: string[];
  redesSociales?: Record<string, string>;
  estado: "BORRADOR" | "PUBLICADO" | "ARCHIVADO";
  slug: string;
  images: PropertyImage[];
  certificados?: Certificate[];
  reviews?: Review[];
  createdAt: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  thumbUrl?: string;
  esPrincipal: boolean;
  orden: number;
}

export interface Certificate {
  id: string;
  tipo: string;
  archivoUrl: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
}

export interface SearchResult {
  filters: SearchFilters;
  sponsored: (Property & { sponsorNombre: string; isSponsored: boolean })[];
  results: Property[];
  total: number;
}

export interface SmartMatch {
  propiedad: Property;
  compatibilidad: number;
  motivos: string[];
  ratingPromedio: number;
  totalReviews: number;
}

export interface SmartSearchResponse {
  total: number;
  results: SmartMatch[];
  mensaje?: string | null;
  fuentes?: string[];
}

export interface Review {
  id: string;
  propiedadId: string;
  autorNombre: string;
  autorEmail?: string;
  calificacion: number;
  comentario?: string;
  createdAt: string;
}

export interface TopRatedProperty extends Property {
  ratingPromedio: number;
  totalReviews: number;
  reviews: Review[];
}

export interface Reserva {
  id: string;
  propiedadId: string;
  propiedad: { nombre: string; slug: string; telefono: string | null; email: string | null; whatsapp: string | null };
  userId?: string;
  nombre: string;
  email: string;
  telefono: string;
  identificacion: string;
  fechaLlegada: string;
  fechaSalida: string;
  huespedes: number;
  metodoPago: "TARJETA" | "EFECTIVO";
  estado: "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "NO_SHOW";
  total?: number;
  notas?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  nombre?: string;
  role: "turista" | "propietario" | "admin";
}
