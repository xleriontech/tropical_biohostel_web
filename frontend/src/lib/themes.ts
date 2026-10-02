export interface ThemeVars {
  primary: string;
  primaryFg: string;
  secondary: string;
  secondaryFg: string;
  accent: string;
  accentFg: string;
  ring: string;
}

/** Paleta repartida por zonas de la interfaz (norma: cada superficie
 *  usa un color de la inspiración con su contraste adecuado). */
export interface ThemeSurfaces {
  navBg: string;
  navFg: string;
  menu: string;
  gradFrom: string;
  gradTo: string;
  gradFg: string;
}

export interface TropicalTheme {
  id: string;
  nombre: string;
  origen: string;
  descripcion: string;
  vars: ThemeVars;
  surfaces: ThemeSurfaces;
}

const SLATE_FG = "222.2 47.4% 11.2%";
const WHITE_FG = "210 40% 98%";

export const THEMES: TropicalTheme[] = [
  {
    id: "biohostel",
    nombre: "Biohostel",
    origen: "Logo oficial + fotografías",
    descripcion: "Verde del logo, crema bambú, naranja e índigo de la finca",
    vars: {
      primary: "145 100% 24%", primaryFg: "45 60% 97%",
      secondary: "45 45% 88%", secondaryFg: "140 40% 14%",
      accent: "66 80% 90%", accentFg: "140 40% 14%",
      ring: "145 100% 24%",
    },
    surfaces: {
      navBg: "135 35% 20%", navFg: "0 0% 100%", menu: "36 100% 46%",
      gradFrom: "145 85% 30%", gradTo: "219 60% 32%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "cosmico",
    nombre: "Cósmico",
    origen: "Pileta y piso índigo de Cosmic Bungaló",
    descripcion: "Noche índigo con dorado ocre y coral",
    vars: {
      primary: "219 60% 38%", primaryFg: WHITE_FG,
      secondary: "14 55% 92%", secondaryFg: SLATE_FG,
      accent: "41 70% 90%", accentFg: SLATE_FG,
      ring: "219 60% 38%",
    },
    surfaces: {
      navBg: "222 55% 16%", navFg: "0 0% 100%", menu: "41 80% 55%",
      gradFrom: "219 65% 40%", gradTo: "14 70% 45%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "tropical",
    nombre: "Tropical Biohostel",
    origen: "Tema original",
    descripcion: "Azul tecnológico de la plataforma",
    vars: {
      primary: "221.2 83.2% 53.3%", primaryFg: WHITE_FG,
      secondary: "210 40% 96%", secondaryFg: SLATE_FG,
      accent: "210 40% 96%", accentFg: SLATE_FG,
      ring: "221.2 83.2% 53.3%",
    },
    surfaces: {
      navBg: "0 0% 100%", navFg: "222.2 84% 4.9%", menu: "221.2 83.2% 53.3%",
      gradFrom: "38 95% 55%", gradTo: "20 95% 50%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "colombia",
    nombre: "Colombia",
    origen: "Bandera nacional",
    descripcion: "Amarillo oro de la bandera",
    vars: {
      primary: "45 100% 51%", primaryFg: SLATE_FG,
      secondary: "48 100% 93%", secondaryFg: SLATE_FG,
      accent: "48 100% 90%", accentFg: SLATE_FG,
      ring: "45 100% 45%",
    },
    surfaces: {
      navBg: "214 85% 28%", navFg: "0 0% 100%", menu: "0 80% 55%",
      gradFrom: "214 85% 38%", gradTo: "0 80% 52%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "cundinamarca",
    nombre: "Cundinamarca",
    origen: "Departamento",
    descripcion: "Celeste de la bandera departamental",
    vars: {
      primary: "200 95% 42%", primaryFg: WHITE_FG,
      secondary: "200 90% 94%", secondaryFg: SLATE_FG,
      accent: "200 90% 91%", accentFg: SLATE_FG,
      ring: "200 95% 42%",
    },
    surfaces: {
      navBg: "200 95% 30%", navFg: "0 0% 100%", menu: "0 80% 55%",
      gradFrom: "200 95% 48%", gradTo: "222 85% 48%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "selva",
    nombre: "Selva Tropical",
    origen: "Municipio",
    descripcion: "Verde caña de los trapiches",
    vars: {
      primary: "142 65% 30%", primaryFg: WHITE_FG,
      secondary: "140 50% 93%", secondaryFg: SLATE_FG,
      accent: "140 50% 90%", accentFg: SLATE_FG,
      ring: "142 65% 30%",
    },
    surfaces: {
      navBg: "142 65% 20%", navFg: "0 0% 100%", menu: "38 95% 50%",
      gradFrom: "140 60% 38%", gradTo: "38 95% 50%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "tucan",
    nombre: "Tucán",
    origen: "Ave de la selva",
    descripcion: "Naranja del pico del tucán",
    vars: {
      primary: "22 95% 50%", primaryFg: WHITE_FG,
      secondary: "25 100% 93%", secondaryFg: SLATE_FG,
      accent: "25 100% 90%", accentFg: SLATE_FG,
      ring: "22 95% 50%",
    },
    surfaces: {
      navBg: "220 25% 12%", navFg: "0 0% 100%", menu: "45 100% 55%",
      gradFrom: "25 95% 52%", gradTo: "220 25% 18%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "colibri",
    nombre: "Colibrí",
    origen: "Ave de la selva",
    descripcion: "Esmeralda del colibrí garganta azul",
    vars: {
      primary: "162 75% 30%", primaryFg: WHITE_FG,
      secondary: "160 60% 93%", secondaryFg: SLATE_FG,
      accent: "160 60% 90%", accentFg: SLATE_FG,
      ring: "162 75% 30%",
    },
    surfaces: {
      navBg: "165 70% 18%", navFg: "0 0% 100%", menu: "275 80% 68%",
      gradFrom: "160 70% 38%", gradTo: "275 85% 60%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "guacamaya",
    nombre: "Guacamaya",
    origen: "Ave de la selva",
    descripcion: "Rojo escarlata de la guacamaya",
    vars: {
      primary: "0 80% 48%", primaryFg: WHITE_FG,
      secondary: "0 85% 94%", secondaryFg: SLATE_FG,
      accent: "0 85% 91%", accentFg: SLATE_FG,
      ring: "0 80% 48%",
    },
    surfaces: {
      navBg: "0 70% 28%", navFg: "0 0% 100%", menu: "45 100% 55%",
      gradFrom: "0 85% 52%", gradTo: "45 100% 52%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "morpho",
    nombre: "Morpho",
    origen: "Insecto de la selva",
    descripcion: "Azul eléctrico de la mariposa Morpho",
    vars: {
      primary: "232 90% 60%", primaryFg: WHITE_FG,
      secondary: "232 90% 95%", secondaryFg: SLATE_FG,
      accent: "232 90% 92%", accentFg: SLATE_FG,
      ring: "232 90% 60%",
    },
    surfaces: {
      navBg: "232 70% 22%", navFg: "0 0% 100%", menu: "190 90% 55%",
      gradFrom: "230 95% 60%", gradTo: "190 95% 50%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "luciernaga",
    nombre: "Luciérnaga",
    origen: "Insecto de la selva",
    descripcion: "Ámbar luminoso de la noche",
    vars: {
      primary: "38 100% 45%", primaryFg: SLATE_FG,
      secondary: "40 100% 93%", secondaryFg: SLATE_FG,
      accent: "40 100% 90%", accentFg: SLATE_FG,
      ring: "38 100% 45%",
    },
    surfaces: {
      navBg: "220 30% 10%", navFg: "0 0% 100%", menu: "70 90% 55%",
      gradFrom: "42 100% 55%", gradTo: "25 95% 45%", gradFg: "222.2 47.4% 11.2%",
    },
  },
  {
    id: "nido",
    nombre: "Nido",
    origen: "Estilo Airbnb cálido",
    descripcion: "Papel, terracota y serif",
    vars: {
      primary: "12 58% 46%", primaryFg: "40 50% 98%",
      secondary: "35 30% 90%", secondaryFg: "20 12% 18%",
      accent: "35 30% 88%", accentFg: "20 12% 18%",
      ring: "12 58% 46%",
    },
    surfaces: {
      navBg: "36 33% 94%", navFg: "20 12% 10%", menu: "12 58% 46%",
      gradFrom: "12 58% 46%", gradTo: "160 35% 25%", gradFg: "0 0% 100%",
    },
  },
  {
    id: "mango",
    nombre: "Mango",
    origen: "Fruta típica",
    descripcion: "Dorado del mango nocaimeño",
    vars: {
      primary: "36 100% 48%", primaryFg: SLATE_FG,
      secondary: "38 100% 93%", secondaryFg: SLATE_FG,
      accent: "38 100% 90%", accentFg: SLATE_FG,
      ring: "36 100% 48%",
    },
    surfaces: {
      navBg: "150 60% 22%", navFg: "0 0% 100%", menu: "40 100% 55%",
      gradFrom: "42 100% 55%", gradTo: "18 90% 48%", gradFg: "222.2 47.4% 11.2%",
    },
  },
];

export function getTheme(id: string): TropicalTheme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
