export interface ProfecoRow {
  producto: string;

  presentacion: string;

  marca: string;

  categoria: string;

  catalogo: string;

  precio: string;

  fecha_registro: string;

  cadena_comercial: string;

  giro: string;

  nombre_comercial: string;

  direccion: string;

  estado: string;

  municipio: string;

  latitud: string;

  longitud: string;
}

export interface NormalizedProfecoProduct {
  name: string;

  brand: string | null;

  category: string | null;

  presentationName: string;

  price: number;

  observedAt: string;

  storeName: string;

  storeBranch: string | null;

  state: string | null;

  municipality: string | null;

  latitude: number | null;

  longitude: number | null;

  source: "profeco";
}