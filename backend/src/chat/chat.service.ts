import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RagService } from '../rag/rag.service';
import { MenusService } from '../menus/menus.service';
import { aNumero } from '../common/dinero';

interface Turno {
  rol: 'usuario' | 'asistente';
  texto: string;
}
interface Preferencias {
  tipo?: string;
  presupuestoMax?: number;
  huespedes?: number;
  mascotas?: boolean;
  actividad?: string;
  keywords?: string[];
  nombre?: string;
  email?: string;
  telefono?: string;
}
interface Sesion {
  historial: Turno[];
  prefs: Preferencias;
  /** Qué le preguntó Nati por último (para entender respuestas cortas como "sí", "2", "150 mil") */
  askedSlot?: 'tipo' | 'presupuesto' | 'personas' | 'confirmar';
  /** Últimas tarjetas mostradas (para "sí, ese" / "quiero reservar") */
  ultimasTarjetas?: Tarjeta[];
  /** Última actividad (ms). Sesiones de hace >2h se reinician conservando el contacto. */
  ultimaActividad?: number;
}
export interface Tarjeta {
  slug: string;
  nombre: string;
  tipo: string;
  precio: number | null;
  imagen: string | null;
}
export interface Ubicacion {
  titulo: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  wazeUrl: string;
}

/** Pin de la finca ( editable en siteConfig "finca-ubicacion" ). */
const FINCA_DEFAULT = { lat: 5.073441158648125, lng: -74.36892837539479 };

const TIPOS: Record<string, string> = {
  hotel: 'hotel',
  hoteles: 'hotel',
  hostal: 'hostal',
  hostales: 'hostal',
  hospedaje: 'hostal',
  hospedajes: 'hostal',
  alojamiento: 'hostal',
  alojamientos: 'hostal',
  glamping: 'glamping',
  restaurante: 'restaurante',
  restaurantes: 'restaurante',
  comer: 'restaurante',
  comida: 'restaurante',
  almuerzo: 'restaurante',
  cena: 'restaurante',
  bar: 'bar',
  bares: 'bar',
  cerveceria: 'bar',
  trago: 'bar',
  finca: 'finca',
  fincas: 'finca',
  actividad: 'actividad',
  actividades: 'actividad',
  tour: 'actividad',
  tours: 'actividad',
  hacer: 'actividad',
  excursion: 'actividad',
  paseo: 'actividad',
  centro: 'centro_turistico',
  piscina: 'centro_turistico',
  piscinas: 'centro_turistico',
  bungalo: 'glamping',
  bungalow: 'glamping',
  cosmic: 'glamping',
  cabana: 'hostal',
  descanso: 'glamping',
  estrellas: 'glamping',
  contemplacion: 'actividad',
};

const ACTIVIDADES = [
  'senderismo', 'piscina', 'avistamiento', 'aves', 'cafe', 'cacao', 'panela',
  'cabalgata', 'mariposario', 'rio', 'cascada', 'mirador', 'spa',
  'yoga', 'ecoturismo', 'caminata', 'cabana', 'chimenea', 'jacuzzi',
  'bosque', 'noche', 'luciernagas', 'bienestar', 'gastronomia', 'taller',
  'contemplacion', 'descanso', 'estrellas', 'pintura', 'lectura',
];

const TIPO_LABEL: Record<string, string> = {
  hotel: 'hoteles', hostal: 'hostales', glamping: 'glampings',
  restaurante: 'restaurantes', bar: 'bares', finca: 'fincas',
  actividad: 'actividades y tours', centro_turistico: 'centros turísticos',
};

const OFF_TOPIC =
  /(presidente|elecci|politica|partido|voto|futbol|fútbol|mundial|novia|matrimonio|tarea|examen|matematica|programa|python|javascript|codigo|hack|dieta|enfermedad|medic|dolar hoy|bitcoin|cripto|guerra|religion|oracion|sexo|porno|arma)/i;

const SYSTEM_PROMPT = `Eres "Nati", la anfitriona virtual de Tropical Biohostel, un destino de naturaleza, bienestar y experiencias en zona rural de Nocaima, Cundinamarca (finca a 10 minutos del casco urbano, de fácil acceso).
CONOCIMIENTO DEL TERRITORIO (úsalo para responder sin inventar):
- Finca con ~30% de bosque nativo; ~400 plantas de café, 30 árboles de naranja y frutales: guanábana, mango, papaya, arazá, guayaba, guama, pomelo, tangelo, limón, piña y pomarosa; huerta de aromáticas y especias que conecta cultivo con cocina; abejas meliponas y biodiversidad. "La naturaleza no es un escenario: es parte de la experiencia."
- HOSPEDAJE: 3 cabañas con baño privado, capacidad total hasta 10 huéspedes; comedor para 10 personas y cocina abierta totalmente equipada; más Cosmic Bungalow como espacio especial de descanso y contemplación. Despertar con sonidos del campo, caminar entre cultivos, ritmo lento.
- GASTRONOMÍA ("Del territorio a la mesa"): alimentación consciente con productos naturales, locales y de la finca (varios orgánicos), conservando sabores, aromas, colores y texturas. Comer es conocer el origen, descubrir sabores y conectar con el territorio.
- MENÚS: la finca publica menús personalizados (desayuno, almuerzo, cena, cafetería) con sus platos, precios y etiquetas (vegano, vegetariano, sin gluten, típico...). Cuando pregunten por comida, menú, qué sirven, desayuno, almuerzo o cena, usa el bloque MENÚS Y COMIDAS DISPONIBLES que aparece en el contexto y recomienda platos concretos. Enlaza la carta completa con [Ver menús](/comidas). Si piden algo personalizado (dieta, alergias, número de personas), arma la sugerencia con los platos disponibles que encajen y recuerda que pueden escribirlo en las notas de la reserva.
- EXPERIENCIAS: café, cacao, plantas, agricultura y alimentación; caminatas, recorridos por cultivos, experiencias gastronómicas, talleres agroecológicos y exploración. El visitante es parte activa, no espectador.
- BIENESTAR: Yoga, Tai Chi y Chi Kung en un entorno ideal para la pausa, la respiración y la conexión; caminar sin afán, contemplar, escuchar el bosque.
- COSMIC BUNGALÓ (glamping, slug cosmic-bungalo): cabaña íntima de ~5 m², arquitectura sagrada y geometría hexagonal, ladrillo prensado y materiales naturales de la finca; mándalas, runas, matices, pisos rústicos artesanales; cama confortable, sillas acogedoras, luz cálida, vista del trópico; baño con ducha y pileta natural al aire libre entre vegetación; ranas, mariposas, colibríes y criaturas del bosque; espacios de esparcimiento y contemplación, rincón para observar estrellas; ideal para leer, escribir, pintar o trabajar con la naturaleza como inspiración. Yoga/Chi Kung/Tai Chi se programan TRAS la reserva según disponibilidad.
- MASCOTAS 🐶: admitidas en cabañas, actividades y zonas comunes; NO en Cosmic Bungalow. Si preguntan por mascotas, dilo claro y ofrece los espacios que sí las aceptan.
- HORARIOS Y PAGOS: check-in 15:00, check-out 12:00; se reserva aquí y se paga en el sitio, sin anticipo.
- DONACIONES: siembra de árboles nativos y huella de carbono en la página /donaciones (pagos vía PayPal). Menciona esa ruta cuando quieran donar o apoyar.
REGLAS ESTRICTAS:
- Solo hablas de Tropical Biohostel y sus alrededores (hospedaje, restaurantes, bares, fincas, actividades). Si preguntan otra cosa, redirige con amabilidad al turismo.
- Basa tus recomendaciones ÚNICAMENTE en la lista de sitios que se te entrega. No inventes nombres, precios ni servicios.
- PRECIOS VIVOS: los únicos precios válidos son los de SITIOS DISPONIBLES (base de datos al día). Si un fragmento trae otro precio, ignóralo y usa el de la lista.
- Si el contexto trae enlaces, consérvalos tal cual en tu respuesta (rutas relativas como /donaciones o /cosmic-bungalo). Cuando menciones una página del sitio, enlázala en formato [texto](/ruta). Nunca inventes URLs ni uses localhost ni dominios.
- Responde en español, tono cálido y breve (máximo 120 palabras), con emojis moderados.
- COHERENCIA: responde a lo que te dijeron. Si te saludan, devuelve el saludo y pregunta qué plan tienen. Si te dan un dato ("somos 2", "150 mil"), confírmalo y sigue. NUNCA repitas una pregunta que el visitante ya respondió según la conversación.
- Si falta información clave (tipo de sitio), haz UNA sola pregunta concreta.
- Para reservar, indica que puede hacerlo desde la página del sitio en esta misma plataforma.`;

@Injectable()
export class ChatService {
  private memoria = new Map<string, Sesion>();
  private catalogoCache: { fecha: number; datos: { nombre: string; slug: string }[] } | null = null;

  constructor(
    private ai: AiService,
    private prisma: PrismaService,
    private redis: RedisService,
    private rag: RagService,
    private menus: MenusService,
  ) {}

  saludo() {
    return {
      reply:
        '¡Hola! Soy Nati 🪷, tu anfitriona en Tropical Biohostel. Puedo recomendarte hospedaje, Cosmic Bungalow, dónde comer o qué hacer (café, cacao, caminatas, yoga) según tu plan. ¿Qué tienes en mente?',
      propiedades: [],
      sugerencias: ['Conocer Cosmic Bungalow', 'Dónde comer', 'Tour café y cacao', 'Yoga y bienestar'],
    };
  }

  async responder(
    sessionId: string | undefined,
    mensaje: string,
    origen?: { ip?: string | null; userAgent?: string | null },
  ) {
    const sid = sessionId || randomUUID();
    const sesion = await this.cargarSesion(sid);
    // Sesión vieja (>2h sin hablar): reinicia la búsqueda, conserva el contacto
    const ahora = Date.now();
    if (sesion.ultimaActividad && ahora - sesion.ultimaActividad > 2 * 3600 * 1000) {
      this.limpiarBusqueda(sesion);
    }
    sesion.ultimaActividad = ahora;
    sesion.historial.push({ rol: 'usuario', texto: mensaje });

    const norm = this.normalizar(mensaje);
    let reply: string;
    let tarjetas: Tarjeta[] = [];
    let sugerencias: string[] = [];
    let ubicacion: Ubicacion | null = null;
    let prefsNuevas = new Set<string>();

    if (OFF_TOPIC.test(norm)) {
      reply =
        'Jajaja, de eso sí no sé 😅. Yo solo hablo de Tropical Biohostel: hospedaje, restaurantes y planes. ¿Te ayudo con tu visita?';
      sugerencias = ['Busco hospedaje', 'Qué hacer', 'Dónde comer'];
    } else {
      // "Busco/quiero..." = búsqueda nueva: reinicia criterios (conserva grupo,
      // mascotas y contacto). No aplica a "quiero reservar/ese" (confirmación).
      const esBusquedaNueva =
        /^(busco|necesito|recomiendame|recomiendanos)\b/.test(norm) ||
        (/^quiero\b/.test(norm) &&
          !/^(quiero\s+(reserv|apartar|ese|esa|este|esta|el|la|lo|eso)\b)/.test(norm));
      if (esBusquedaNueva) this.limpiarBusqueda(sesion, 'criterios');
      // Foto previa para registrar SOLO lo nuevo de este turno (sin fantasmas)
      const prefsAntes = JSON.stringify({
        tipo: sesion.prefs.tipo,
        presupuestoMax: sesion.prefs.presupuestoMax,
        huespedes: sesion.prefs.huespedes,
        mascotas: sesion.prefs.mascotas,
        actividad: sesion.prefs.actividad,
      });
      // Acumula preferencias (memoria de la conversación)
      this.extraerPreferencias(norm, sesion.prefs);
      prefsNuevas = new Set<string>();
      try {
        const despues: any = {
          tipo: sesion.prefs.tipo,
          presupuestoMax: sesion.prefs.presupuestoMax,
          huespedes: sesion.prefs.huespedes,
          mascotas: sesion.prefs.mascotas,
          actividad: sesion.prefs.actividad,
        };
        const antesObj: any = JSON.parse(prefsAntes);
        for (const k of Object.keys(despues)) {
          if (JSON.stringify(despues[k]) !== JSON.stringify(antesObj[k]) && despues[k] !== undefined) {
            prefsNuevas.add(k);
          }
        }
      } catch {}
      // Datos de contacto: nombre, email, teléfono (respuesta inmediata y natural)
      const contacto = await this.gestionarContacto(sesion, mensaje, norm);
      if (contacto) {
        ({ reply, tarjetas, sugerencias } = contacto);
      } else {
        const sitio = await this.detectarSitio(norm);
        if (sitio) {
        const r = await this.responderSitio(sitio.slug, norm);
        ({ reply, tarjetas, sugerencias } = r);
        ubicacion = r.ubicacion || null;
        sesion.askedSlot = 'confirmar';
        sesion.ultimasTarjetas = tarjetas;
      } else if (this.ai.isChatAvailable()) {
        const rIA = await this.responderConIA(sesion, mensaje);
        reply = rIA.reply;
        tarjetas = rIA.tarjetas;
        sugerencias = rIA.sugerencias;
        ubicacion = rIA.ubicacion || null;
        if (tarjetas.length) {
          sesion.askedSlot = 'confirmar';
          sesion.ultimasTarjetas = tarjetas;
        }
      } else {
        const r = await this.responderLocal(sesion, norm, mensaje);
        ({ reply, tarjetas, sugerencias } = r);
          ubicacion = (r as { ubicacion?: Ubicacion | null }).ubicacion || null;
        }
      }
    }

    sesion.historial.push({ rol: 'asistente', texto: reply });
    sesion.historial = sesion.historial.slice(-12);
    await this.guardarSesion(sid, sesion);
    await this.rastrearLead(sid, sesion, mensaje, norm, prefsNuevas, origen);
    return { reply, sessionId: sid, propiedades: tarjetas, sugerencias, ubicacion };
  }

  // ---------- motor local (sin LLM) ----------

  private async responderLocal(sesion: Sesion, norm: string, _original: string) {
    const p = sesion.prefs;
    let tarjetas: Tarjeta[] = [];
    let sugerencias: string[] = [];
    let reply: string;

    const esSi = /^(si|claro|dale|de una|listo|perfecto|bueno|vale|suena bien|me gusta|quiero|hagamoslo|vamos|eso|ese|esa)[.! ]*$/;
    const esNo = /^(no|no gracias|mejor no|todavia no|aun no|otra cosa|prefiero otra)[.! ]*$/;
    const esSaludo = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|alo|que mas|como estas|como vas|saludos)[.! ]*/;

    // --- despedida y agradecimiento (siempre coherentes) ---
    if (/^(adios|chao|hasta luego|nos vemos|me voy|bye)[.! ]*/.test(norm)) {
      sesion.askedSlot = undefined;
      const quien = sesion.prefs.nombre ? `, ${sesion.prefs.nombre}` : '';
      reply = `¡Buen viaje${quien}! 🦜 ¡Aquí te esperamos de vuelta!`;
      return { reply, tarjetas, sugerencias };
    }
    if (/(gracias|muchas gracias|te agradezco|genial|excelente|super|increible)/.test(norm) && !this.mencionaTipo(norm)) {
      sesion.askedSlot = undefined;
      const quien = sesion.prefs.nombre ? `, ${sesion.prefs.nombre}` : '';
      reply = `¡Con gusto${quien}! 🌺 Para eso estoy. ¿Te ayudo con algo más de tu visita?`;
      sugerencias = ['Qué hacer', 'Dónde comer', 'Busco hospedaje'];
      return { reply, tarjetas, sugerencias };
    }

    // --- saludo: siempre saluda; limpia búsquedas viejas y sigue si trae intención ---
    if (esSaludo.test(norm) && norm.length < 30) {
      if (sesion.askedSlot) {
        reply = `¡Hola! 😊 ${this.preguntaPendiente(sesion)}`;
        sugerencias = ['Busco hotel', 'Dónde comer', 'Qué hacer'];
        return { reply, tarjetas, sugerencias };
      }
      this.limpiarBusqueda(sesion);
      const resto = norm
        .replace(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|alo|que mas|como estas|como vas|saludos)[,.! ]*/, '')
        .trim();
      if (
        resto &&
        /(busc|quiero|necesito|recomiend|reserv|precio|cuant|que |donde|como|cual|mascota|perro|somos|tour|hotel|hostal|glamping|restaurante|actividad)/.test(resto)
      ) {
        return this.responderLocal(sesion, resto, _original);
      }
      const hora = new Date().getHours();
      const momento = hora < 12 ? 'días' : hora < 18 ? 'tardes' : 'noches';
      const quien = p.nombre ? `, ${p.nombre}` : '';
      sesion.askedSlot = 'tipo';
      reply = `¡Hola${quien}! ¡Buenas ${momento}! 😊 Soy Nati, tu anfitriona en Tropical Biohostel. ¿En qué te ayudo: hospedaje, comida o actividades?`;
      sugerencias = ['Busco hotel', 'Dónde comer', 'Qué hacer'];
      return { reply, tarjetas, sugerencias };
    }
    if (/(quien eres|que eres|tu nombre|como te llamas|como te llamas)/.test(norm)) {
      sesion.askedSlot = 'tipo';
      reply = 'Soy Nati 🪷, la anfitriona virtual de Tropical Biohostel: conozco cada rincón del hostal y te ayudo a armar tu plan. ¿Qué buscas?';
      sugerencias = ['Busco hotel', 'Dónde comer', 'Qué hacer'];
      return { reply, tarjetas, sugerencias };
    }
    // --- identidad / meta: "¿eres una IA de verdad?" (antes del RAG para no citar documentos) ---
    if (
      (/\b(eres|sos)\b/.test(norm) &&
        /(ia\b|inteligencia artificial|robot|humano|persona|real|verdad)/.test(norm)) ||
      /(tu eres (real|de verdad)|quien te (creo|hizo|programo|invento)|como funcionas|tienes sentimientos|estas viva|estas vivo)/.test(norm)
    ) {
      reply = 'Jajaja, ¡me descubriste! 😄 Soy Nati, una IA anfitriona: no soy humana, pero conozco Tropical Biohostel como la palma de mi mano… bueno, de mi código. ¿Te ayudo a armar tu visita?';
      sugerencias = ['Qué sabes hacer', 'Busco hospedaje', 'Qué hacer'];
      return { reply, tarjetas, sugerencias };
    }
    // --- charla casual breve (que no active el RAG ni pida datos) ---
    if (/^(bien|muy bien|vale|ok|dale|listo|super|genial|(ja){2,}|(je){2,}|(ji){2,}|ay|uy|ah|oh|mmm+|ya|aja|sisas|epa)[.! ]*$/.test(norm)) {
      reply = '¡Qué bueno! 😊 ¿Seguimos con tu plan: dormir, comer o pasear?';
      sugerencias = ['Busco hospedaje', 'Dónde comer', 'Qué hacer'];
      return { reply, tarjetas, sugerencias };
    }
    if (/(que puedes|que sabes hacer|ayuda|como funciona|que haces|para que sirves)/.test(norm)) {
      reply = 'Puedo recomendarte hospedaje 🏨, restaurantes 🍽️ y actividades 🎒 aquí según tu presupuesto, cuántos van y si llevan mascota. ¡Pregúntame!';
      sugerencias = ['Busco hotel económico', 'Voy con mi perro 🐶', 'Qué hacer en familia'];
      return { reply, tarjetas, sugerencias };
    }
    if (/(donde queda|donde esta|como llego|donde estan|ubicacion|direccion)/.test(norm)) {
      sesion.askedSlot = 'tipo';
      reply = 'Estamos en una finca a 10 minutos del casco urbano de Nocaima 🌿, con 30% de bosque nativo, cafetales, frutales y huerta de aromáticas. Aquí están las 3 cabañas, Cosmic Bungalow, el comedor y la cocina abierta. Te dejo el pin exacto 👇 ¿Te muestro dónde dormir?';
      sugerencias = ['Busco hotel', 'Qué hacer'];
      return { reply, tarjetas, sugerencias, ubicacion: await this.ubicacionFinca() };
    }

    // --- confusión: resume lo que sabe y repite la pregunta pendiente ---
    // (solo "qué?" suelto, no "qué hacer" ni "qué precio", que son intenciones reales)
    if (/^(que|como|cual|eh)[?!., ]*$/.test(norm)
      || /^(y eso|no entiendo|no te entiendo|repite|repiteme|de que hablas|a que te refieres|no se a que te refieres)/.test(norm)) {
      reply = `${this.resumenPrefs(p)}${this.preguntaPendiente(sesion)}`;
      sugerencias = ['Busco hotel', 'Qué hacer', 'Dónde comer'];
      return { reply, tarjetas, sugerencias };
    }

    // --- respuestas cortas según lo último que preguntó Nati ---
    if (sesion.askedSlot && (esSi.test(norm) || esNo.test(norm))) {
      const r = await this.responderConfirmacion(sesion, esSi.test(norm));
      return r;
    }
    const dinero = this.parseDineroSuelto(norm);
    if (dinero && (sesion.askedSlot === 'presupuesto' || !p.presupuestoMax)) {
      p.presupuestoMax = dinero;
      sesion.askedSlot = undefined;
      return this.flujoBusqueda(sesion, `Perfecto, con $${dinero.toLocaleString('es-CO')} por noche 💰. `);
    }
    const numero = norm.match(/^\d{1,2}$/) ? parseInt(norm, 10) : null;
    if (numero && numero >= 1 && numero <= 20 && (sesion.askedSlot === 'personas' || !p.huespedes)) {
      p.huespedes = numero;
      sesion.askedSlot = undefined;
      return this.flujoBusqueda(sesion, numero === 1 ? '¡Plan en solitario, qué rico! 🎒 ' : `¡Listo, para ${numero}! 👥 `);
    }

    // --- reserva / confirmación de sitio ---
    if (/(reserv|apartar|apartado|quiero ese|quiero esa|me quedo con|elijo)/.test(norm)) {
      const ultimas = sesion.ultimasTarjetas?.length
        ? sesion.ultimasTarjetas
        : (await this.buscarCandidatos(p, 1)).items;
      if (ultimas.length) {
        sesion.askedSlot = undefined;
        reply = `¡Buena elección! 🎉 Para reservar en ${ultimas[0].nombre}, abre su página (tócala abajo 👇), elige tus fechas y confirma. El calendario muestra la disponibilidad en tiempo real.`;
        tarjetas = ultimas.slice(0, 1);
      } else {
        reply = '¡De una! Dime qué sitio te gustó o qué tipo de plan buscas y te muestro opciones para reservar. 📅';
        sugerencias = ['Busco hotel', 'Qué hacer'];
      }
      return { reply, tarjetas, sugerencias };
    }

    // --- más opciones ---
    if (/(mas opciones|otras opciones|otros|ver mas|mostrar mas|similares|algo mas|mas resultados)/.test(norm)) {
      const { items } = await this.buscarCandidatos(p, 6);
      if (items.length) {
        sesion.askedSlot = 'confirmar';
        sesion.ultimasTarjetas = items;
        reply = 'Claro, aquí tienes más opciones ✨. Toca cualquiera para ver fotos y reservar:';
        tarjetas = items.slice(0, 5);
        sugerencias = ['Quiero reservar', 'Cambiar presupuesto'];
      } else {
        reply = 'Ya te mostré todo lo que tengo con esos filtros 😅. ¿Cambiamos algo: presupuesto o tipo de sitio?';
        sugerencias = ['Cambiar presupuesto', 'Ver todo'];
      }
      return { reply, tarjetas, sugerencias };
    }

    // --- donaciones: siembra de árboles y huella de carbono ---
    if (/\b(donar|donacion|donaciones|donativo|apadrinar|huella de carbono)\b/.test(norm)) {
      reply = `¡Qué gran iniciativa! 🌳 Puedes apoyar la siembra de árboles nativos y los proyectos de huella de carbono desde la página de [donaciones](/donaciones), con pagos seguros vía PayPal. ¿Te cuento más o seguimos con tu visita?`;
      sugerencias = ['Busco hospedaje', 'Qué hacer', 'Dónde quedan'];
      return { reply, tarjetas, sugerencias };
    }

    // --- menús y comidas de la finca (platos, dietas, horarios) ---
    if (/(menu|carta|plato|desayuno|almuerzo|cena|merienda|cafeteria|que sirven|que hay para comer|vegano|vegetariano|sin gluten|alergia|lactosa)/.test(norm)) {
      try {
        const menus = (await this.menus.listarActivos()) as any[];
        if (menus.length) {
          const clavesTipo: Record<string, string> = {
            desayuno: 'DESAYUNO', almuerzo: 'ALMUERZO', cena: 'CENA',
            merienda: 'MERIENDA', cafeteria: 'CAFETERIA',
          };
          let elegidos = menus;
          for (const [k, tipo] of Object.entries(clavesTipo)) {
            if (norm.includes(k)) {
              const filtrado = menus.filter((m) => m.tipo === tipo);
              if (filtrado.length) elegidos = filtrado;
              break;
            }
          }
          // dieta/alergias: menús con platos que encajen
          if (/(vegano|vegetariano|sin gluten|alergia|lactosa)/.test(norm)) {
            const conEtq = elegidos.filter((m) =>
              (m.platos || []).some((pl: any) =>
                (pl.etiquetas || []).some((e: string) =>
                  /vegan|vegetarian|gluten|lactosa/i.test(e),
                ),
              ),
            );
            if (conEtq.length) elegidos = conEtq;
          }
          const m = elegidos[0];
          const platos = (m.platos || []).slice(0, 6);
          const lineas = platos.map((pl: any) => {
            const n = aNumero(pl.precio);
            const precio = n === null ? '' : ` — $${n.toLocaleString('es-CO')}`;
            return `• ${pl.nombre}${precio}`;
          });
          const etqs = [...new Set(
            elegidos.flatMap((mm: any) => (mm.platos || []).flatMap((pl: any) => pl.etiquetas || [])),
          )].slice(0, 5);
          const otras = elegidos.slice(1).map((mm: any) => mm.titulo);
          reply =
            `🍽️ ${m.titulo}${m.horario ? ` (${m.horario})` : ''}${m.descripcion ? `\n${this.recortar(m.descripcion, 120)}` : ''}\n` +
            (lineas.length ? `${lineas.join('\n')}\n` : '') +
            (etqs.length ? `Etiquetas disponibles: ${etqs.join(', ')}.\n` : '') +
            (otras.length ? `También tenemos: ${otras.join(', ')}.\n` : '') +
            `¿Te armo algo personalizado (dieta, alergias o número de personas)? La carta completa está en [menús](/comidas).`;
          sugerencias = ['Menú para 2 personas', 'Opciones veganas', 'Dónde comer'];
          return { reply, tarjetas, sugerencias };
        }
      } catch {}
    }

    // --- mascotas: afirmación o negación explícita (antes del RAG para no citar de más) ---
    if (/(mascota|perro|gato|\bpet\b|peludo)/.test(norm) && !/(reserv|apartar|precio|cuanto|donde)/.test(norm)) {
      const ack =
        !p.tipo && p.mascotas === false
          ? 'Anotado: sin mascotas 👍 '
          : !p.tipo && p.mascotas
            ? '¡Qué bien! 🐶 '
            : '';
      return this.flujoBusqueda(sesion, ack);
    }

    // --- pregunta factual: responde desde la base de conocimiento ---
    if (this.esPreguntaFactual(norm)) {
      try {
        const frags = await this.rag.buscar(_original, 2);
        if (frags.length) {
          reply = this.respuestaRag(frags[0]);
          sugerencias = ['Quiero reservar', 'Ver más opciones', 'Qué hacer'];
          return { reply, tarjetas, sugerencias };
        }
      } catch {}
    }

    // --- búsqueda o pregunta de afinamiento ---
    if (/(cuanto cuesta|cuanto vale|precio de|que precio)/.test(norm) || this.mencionaTipo(norm) || p.tipo) {
      const hablaMascotas = /(mascota|perro|gato|\bpet\b|peludo)/.test(norm);
      const ack = p.mascotas && !p.tipo && hablaMascotas ? '¡Los peludos son bienvenidos aquí! 🐶 ' : '';
      return this.flujoBusqueda(sesion, ack);
    }

    // --- ambiguo: primero la base de conocimiento, luego la pregunta pendiente ---
    if (norm.length > 3) {
      try {
        const frags = await this.rag.buscar(_original, 2);
        if (frags.length) {
          reply = this.respuestaRag(frags[0]);
          sugerencias = ['Quiero reservar', 'Ver más opciones', 'Qué hacer'];
          return { reply, tarjetas, sugerencias };
        }
      } catch {}
    }
    reply = `${this.resumenPrefs(p)}${this.preguntaPendiente(sesion)}`;
    if (!sesion.askedSlot) sesion.askedSlot = 'tipo';
    sugerencias = ['Busco hotel', 'Dónde comer', 'Qué hacer'];
    return { reply, tarjetas, sugerencias };
  }

  /** Limpia datos de búsqueda. 'todo' borra todo (saludo/sesión vieja); 'criterios' conserva grupo, mascotas y contacto. */
  private limpiarBusqueda(sesion: Sesion, alcance: 'todo' | 'criterios' = 'todo') {
    const p = sesion.prefs;
    delete p.tipo;
    delete p.presupuestoMax;
    delete p.actividad;
    delete p.keywords;
    if (alcance === 'todo') {
      delete p.huespedes;
      delete p.mascotas;
    }
    sesion.askedSlot = undefined;
    sesion.ultimasTarjetas = undefined;
  }

  /** Flujo principal: muestra resultados y hace UNA pregunta de seguimiento. */
  private async flujoBusqueda(sesion: Sesion, prefijo: string) {
    const p = sesion.prefs;
    let tarjetas: Tarjeta[] = [];
    let sugerencias: string[] = [];
    let reply: string;

    if (!p.tipo) {
      sesion.askedSlot = 'tipo';
      reply = `${prefijo}¡Vamos a armar tu plan! 🎒 ¿Qué buscas: hotel, hostal, glamping, restaurante o una actividad?`;
      sugerencias = ['Hotel', 'Glamping', 'Restaurante', 'Actividad'];
      return { reply, tarjetas, sugerencias };
    }
    const { items, relajado } = await this.buscarCandidatos(p, 3);
    tarjetas = items;
    if (!tarjetas.length) {
      // ¿Ni siquiera existe ese tipo aquí? Ofrece lo más cercano en vez de pedir plata a ciegas
      const cercano: Record<string, string> = { hotel: 'hostal', centro_turistico: 'actividad', bar: 'restaurante' };
      const altTipo = cercano[p.tipo || ''];
      if (altTipo) {
        const alt = await this.buscarCandidatos({ ...p, tipo: altTipo }, 3);
        if (alt.items.length) {
          sesion.askedSlot = 'confirmar';
          sesion.ultimasTarjetas = alt.items;
          const nombreAlt = altTipo === 'hostal' ? 'nuestro hostal' : `nuestras opciones de ${TIPO_LABEL[altTipo] || altTipo}`;
          return {
            reply: `${prefijo}Tal cual no tenemos 😅, pero ${nombreAlt} es lo más parecido y es una belleza ✨. Míralo:👇`,
            tarjetas: alt.items.slice(0, 3),
            sugerencias: ['Quiero reservar', 'Ver más opciones'],
          };
        }
      }
      sesion.askedSlot = 'presupuesto';
      reply = `${prefijo}Hmm, no encontré ${TIPO_LABEL[p.tipo] || p.tipo} con esas condiciones 😕. ¿Y si subimos el presupuesto? ¿Hasta cuánto por noche?`;
      sugerencias = ['Hasta $150 mil', 'Hasta $300 mil', 'Ver todo'];
      return { reply, tarjetas, sugerencias };
    }
    sesion.askedSlot = 'confirmar';
    sesion.ultimasTarjetas = tarjetas;
    const contexto = this.describeContexto(p);
    const aviso = relajado
      ? `Mmm, exacto exacto no tengo nada ${contexto} 😅, pero mira lo que sí se acerca`
      : `${prefijo}Esto encontré para ti ${contexto} ✨`;
    // Una sola pregunta de seguimiento sobre lo que aún no sabe
    let seguimiento = '';
    if (!p.presupuestoMax) {
      seguimiento = ' ¿Cuál es tu presupuesto por noche? Así afino mejor.';
      sesion.askedSlot = 'presupuesto';
      sugerencias = ['Económico (menos de $100 mil)', 'Hasta $200 mil'];
    } else if (!p.huespedes && ['hotel', 'hostal', 'glamping', 'finca', 'centro_turistico'].includes(p.tipo)) {
      seguimiento = ' ¿Cuántas personas van?';
      sesion.askedSlot = 'personas';
      sugerencias = ['Somos 2', 'Somos familia'];
    } else {
      sugerencias = ['Quiero reservar', 'Ver más opciones'];
    }
    reply = `${aviso}. Toca cualquiera para ver fotos, disponibilidad y reservar:👇${seguimiento}`;
    return { reply, tarjetas: tarjetas.slice(0, 3), sugerencias };
  }

  /** "sí" / "no" según lo último preguntado. */
  private async responderConfirmacion(sesion: Sesion, esSi: boolean) {
    const p = sesion.prefs;
    const slot = sesion.askedSlot;
    // Confirmación sin tarjetas (ej: venía de una respuesta del RAG): seguir el flujo
    if (slot === 'confirmar' && !sesion.ultimasTarjetas?.length) {
      sesion.askedSlot = undefined;
      if (p.tipo) return this.flujoBusqueda(sesion, esSi ? '¡De una! ' : '');
      return {
        reply: esSi
          ? '¡De una! ¿Qué plan tienes: dormir, comer o pasear? 😊'
          : `${this.resumenPrefs(p)}${this.preguntaPendiente(sesion)}`,
        tarjetas: [] as Tarjeta[],
        sugerencias: ['Busco hospedaje', 'Dónde comer', 'Qué hacer'],
      };
    }
    if (slot === 'confirmar' && sesion.ultimasTarjetas?.length) {
      if (esSi) {
        const top = sesion.ultimasTarjetas[0];
        sesion.askedSlot = undefined;
        return {
          reply: `¡Buena elección! 🎉 Para reservar en ${top.nombre}, abre su página (tócala abajo 👇), elige tus fechas y confirma.`,
          tarjetas: [top],
          sugerencias: ['Ver más opciones', 'Qué hacer cerca'],
        };
      }
      sesion.askedSlot = undefined;
      return {
        reply: 'Tranquilo, sin afán 😊. ¿Qué le cambiamos: el presupuesto, el tipo de sitio o te muestro otras opciones?',
        tarjetas: [] as Tarjeta[],
        sugerencias: ['Ver más opciones', 'Cambiar presupuesto', 'Busco otra cosa'],
      };
    }
    if (slot === 'tipo') {
      return {
        reply: esSi
          ? '¡De una! Pero dime cuál 😄: ¿hotel, hostal, glamping, restaurante o una actividad?'
          : 'Vale 😊. ¿Entonces qué plan tienes: comer, pasear o descansar?',
        tarjetas: [] as Tarjeta[],
        sugerencias: ['Hotel', 'Glamping', 'Restaurante', 'Actividad'],
      };
    }
    if (slot === 'presupuesto') {
      return {
        reply: 'Dame un número y lo ajustamos 💰. Por ejemplo: 150 mil por noche.',
        tarjetas: [] as Tarjeta[],
        sugerencias: ['100 mil', '200 mil', '300 mil'],
      };
    }
    if (slot === 'personas') {
      return {
        reply: '¿Cuántos van? Dime un número 👥 (por ejemplo: 2).',
        tarjetas: [] as Tarjeta[],
        sugerencias: ['Somos 2', 'Somos 4', 'Voy solo'],
      };
    }
    // Sin pregunta pendiente: el "sí" se interpreta como ganas de seguir
    if (esSi && p.tipo) return this.flujoBusqueda(sesion, '¡De una! ');
    return {
      reply: `${this.resumenPrefs(p)}${this.preguntaPendiente(sesion)}`,
      tarjetas: [] as Tarjeta[],
      sugerencias: ['Busco hotel', 'Qué hacer'],
    };
  }

  /** Resume lo que Nati ya sabe del visitante. */
  private resumenPrefs(p: Preferencias): string {
    const partes: string[] = [];
    if (p.nombre) partes.push(`se llama ${p.nombre} (usa su nombre de vez en cuando)`);
    if (p.tipo) partes.push(TIPO_LABEL[p.tipo] || p.tipo);
    if (p.huespedes) partes.push(`para ${p.huespedes}`);
    if (p.presupuestoMax) partes.push(`hasta $${p.presupuestoMax.toLocaleString('es-CO')}`);
    if (p.mascotas) partes.push('con mascota 🐶');
    if (p.actividad) partes.push(`con ${p.actividad}`);
    return partes.length
      ? `Hasta ahora sé que buscas ${partes.join(' ')}. `
      : 'Aún no me has contado qué buscas. ';
  }

  /** Respuesta conversacional desde un fragmento del RAG (con variedad). */
  private respuestaRag(f: { contenido: string; documentoTitulo: string }): string {
    const aperturas = [
      '¡Buena pregunta! 😊 ',
      'Mira lo que encontré para ti: ',
      'Te cuento lo que sé: ',
      '¡Claro! Sobre eso te digo: ',
    ];
    const cierres = [
      ' ¿Te sirve o quieres saber algo más?',
      ' ¿Seguimos con algo más de tu visita?',
      ' ¿Quieres que profundicemos en algo?',
    ];
    const ap = aperturas[Math.floor(Math.random() * aperturas.length)];
    const ci = cierres[Math.floor(Math.random() * cierres.length)];
    return `${ap}${this.recortar(f.contenido, 400)}${ci} 📖 (Fuente: ${f.documentoTitulo})`;
  }

  /** La pregunta pendiente según lo que falta por saber. */
  private preguntaPendiente(sesion: Sesion): string {
    const p = sesion.prefs;
    if (sesion.askedSlot === 'confirmar' && sesion.ultimasTarjetas?.length)
      return '¿Te gusta alguna de estas opciones o busco otras?';
    if (!p.tipo) {
      const quien = p.nombre ? `${p.nombre}, ` : '';
      return `${quien}¿qué plan tienes: dónde dormir, dónde comer o qué hacer?`;
    }
    if (!p.presupuestoMax) return '¿Cuál es tu presupuesto por noche? (ej: 150 mil)';
    if (!p.huespedes && ['hotel', 'hostal', 'glamping', 'finca', 'centro_turistico'].includes(p.tipo))
      return '¿Cuántas personas van?';
    return '¿Te muestro opciones o afinamos algo más?';
  }

  /** "150 mil", "$200.000", "300k" sueltos → COP. null si no es dinero. */
  private parseDineroSuelto(norm: string): number | null {
    const m = norm.match(/^\$?\s*(\d[\d.]*)\s*(mil|k|millones?|m|pesos)?[.! ]*$/);
    if (!m) return null;
    let v = parseFloat(m[1].replace(/\./g, ''));
    const suf = m[2] || '';
    if (/millon/.test(suf)) v *= 1000000;
    else if (v < 1000) {
      if (v < 10 && !suf) return null; // "2" es personas, no dinero
      v *= 1000;
    }
    if (v < 20000 || v > 50000000) return null;
    return Math.round(v);
  }

  // ---------- respuesta con LLM (si hay proveedor configurado) ----------

  private async responderConIA(sesion: Sesion, mensaje: string) {
    const p = sesion.prefs;
    const tarjetas = (await this.buscarCandidatos(p, 6)).items;    const contexto = tarjetas
      .map((t) => `- ${t.nombre} (${t.tipo}, ${t.precio ? '$' + t.precio.toLocaleString('es-CO') : 'precio a convenir'}): /property/${t.slug}`)
      .join('\n');
    // RAG: fragmentos de la base de conocimiento para fundamentar la respuesta
    let contextoRag = '';
    try {
      const frags = await this.rag.buscar(mensaje, 4);
      if (frags.length) {
        contextoRag =
          '\n\nCONTEXTO DE LA BASE DE CONOCIMIENTO (úsalo para responder con datos exactos, sin inventar):\n' +
          frags.map((f, i) => `[${i + 1}] (${f.documentoTitulo}): ${f.contenido.slice(0, 700)}`).join('\n');
      }
    } catch {}
    const historial = sesion.historial
      .slice(-8)
      .map((t) => `${t.rol === 'usuario' ? 'Visitante' : 'Nati'}: ${t.texto}`)
      .join('\n');
    const sabe = this.resumenPrefs(p);
    // Menús de la finca: contexto vivo desde la BD para recomendar platos concretos
    let contextoMenus = '';
    try {
      const cm = await this.menus.contextoParaChat();
      if (cm) contextoMenus = `\n\n${cm}`;
    } catch {}
    const prompt = `${SYSTEM_PROMPT}\n\nLO QUE YA SABES DEL VISITANTE: ${sabe}\n\nSITIOS DISPONIBLES:\n${contexto || '(sin resultados para esos filtros)'}${contextoMenus}${contextoRag}\n\nCONVERSACIÓN:\n${historial}\n\nResponde como Nati al último mensaje. Si recomiendas sitios, menciona sus nombres exactos. Si hablan de comida o menús, usa los MENÚS Y COMIDAS DISPONIBLES.`;
    try {
      const reply = (await this.ai.chatWith(SYSTEM_PROMPT, prompt)).trim().slice(0, 900)
        || 'Mmm, ¿me repites qué buscas? 🪷';
      // Si preguntan ubicación, adjunta el pin de la finca
      let ubicacion: Ubicacion | null = null;
      try {
        if (/(donde|ubicacion|direccion|como llego|coordenadas|\bmapa\b)/.test(this.normalizar(mensaje))) {
          ubicacion = await this.ubicacionFinca();
        }
      } catch {}
      return {
        reply,
        tarjetas: tarjetas.slice(0, 3),
        sugerencias: this.sugerenciasSeguimiento(p),
        ubicacion,
      };
    } catch (e) {
      console.warn('⚠️  Nati IA falló, uso motor local:', (e as Error).message);
      return this.responderLocal(sesion, this.normalizar(mensaje), mensaje);
    }
  }

  // ---------- respuesta sobre un sitio concreto ----------

  /** Pin de la finca para compartir en el chat (tarjeta con mapa). */
  async ubicacionFinca(): Promise<Ubicacion> {
    let lat = FINCA_DEFAULT.lat;
    let lng = FINCA_DEFAULT.lng;
    try {
      const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'finca-ubicacion' } });
      const v = (cfg?.value || {}) as { lat?: number; lng?: number };
      if (typeof v.lat === 'number' && typeof v.lng === 'number') {
        lat = v.lat;
        lng = v.lng;
      }
    } catch {}
    return {
      titulo: 'Tropical Biohostel · Nocaima',
      lat,
      lng,
      mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      wazeUrl: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    };
  }

  private async responderSitio(slug: string, norm = '') {
    const s = await this.prisma.propiedad.findUnique({
      where: { slug },
      include: { images: { orderBy: { orden: 'asc' }, take: 3 } },
    });
    if (!s) {
      return { reply: 'No encontré ese sitio 😕. ¿Me dices el nombre de otra forma?', tarjetas: [] as Tarjeta[], sugerencias: ['Ver todo'] };
    }
    const precioNoche = s.precioNoche.toNumber();
    const precio = precioNoche > 0 ? `$${precioNoche.toLocaleString('es-CO')}` : 'precio a convenir';
    let extraMascotas = '';
    if (/(mascota|perro|gato|pelud|\bpet\b)/.test(norm)) {
      extraMascotas = s.admiteMascotas
        ? ' ¡Buenas noticias! Aquí tu mascota es bienvenida 🐶.'
        : ' Ojo: aquí no se admiten mascotas 🐶, pero sí en las cabañas y zonas comunes.';
    }
    const coords = (s.coordenadas || {}) as { lat?: number; lng?: number };
    const ubicacion =
      typeof coords.lat === 'number' && typeof coords.lng === 'number'
        ? {
            titulo: `${s.nombre} · ${s.ciudad || 'Nocaima'}`,
            lat: coords.lat,
            lng: coords.lng,
            mapsUrl: `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
            wazeUrl: `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
          }
        : null;
    return {
      reply: `¡${s.nombre}! ✨ ${this.recortar(s.descripcion, 220)} Cuesta ${precio}${s.ubicacion ? ` y queda en ${s.ubicacion}` : ''}.${extraMascotas} Tócalo abajo para ver fotos y reservar 👇`,
      tarjetas: [{
        slug: s.slug, nombre: s.nombre, tipo: s.tipo,
        precio: precioNoche > 0 ? precioNoche : null,
        imagen: s.images[0]?.url || null,
      }],
      sugerencias: ['Quiero reservar', 'Ver similares', 'Qué hacer cerca'],
      ubicacion,
    };
  }

  // ---------- utilidades ----------

  /** Captura nombre/email/teléfono cuando el visitante los comparte. Devuelve respuesta si el mensaje era solo eso. */
  private async gestionarContacto(
    sesion: Sesion,
    mensaje: string,
    norm: string,
  ): Promise<{ reply: string; tarjetas: Tarjeta[]; sugerencias: string[] } | null> {
    const p = sesion.prefs;
    // ¿Recuerda mi nombre?
    if (/(como me llamo|cual es mi nombre|recuerdas mi nombre|sabes mi nombre)/.test(norm)) {
      if (p.nombre) {
        return {
          reply: `¡Claro que sí, ${p.nombre}! 😄 ¿En qué seguimos?`,
          tarjetas: [],
          sugerencias: ['Busco hospedaje', 'Qué hacer', 'Quiero reservar'],
        };
      }
      return {
        reply: 'Mmm, aún no me has dicho tu nombre 😅. ¿Cómo te llamas?',
        tarjetas: [],
        sugerencias: [],
      };
    }
    // Nombre: "me llamo X" / "mi nombre es X" / "soy X" (con mayúscula en el original)
    const mNombre = mensaje.match(
      /(?:me llamo|mi nombre es|me dicen)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/,
    );
    let nom = mNombre?.[1]?.trim();
    if (!nom) {
      const mSoy = mensaje.match(/\b[Ss]oy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
      const NO_NOMBRES = ['vegetariano', 'vegetariana', 'alergico', 'alergica', 'colombiano', 'colombiana', 'turista', 'viajero', 'viajera', 'mayor', 'menor', 'estudiante', 'casado', 'casada', 'soltero', 'soltera', 'deportista'];
      if (mSoy && !NO_NOMBRES.includes(mSoy[1].toLowerCase())) nom = mSoy[1].trim();
    }
    const email = mensaje.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    const tel = mensaje.match(/(\+?57\s?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}/);
    if (!nom && !email && !tel) return null;

    if (nom) p.nombre = nom;
    if (email) p.email = email[0];
    if (tel) p.telefono = tel[0];

    // ¿El mensaje traía algo más además del dato? Si no, confirma; si sí, sigue el flujo.
    let resto = norm;
    if (nom) {
      resto = resto
        .replace(/me llamo|mi nombre es|me dicen|\bsoy\b/g, '')
        .replace(nom.toLowerCase(), '');
    }
    if (email) resto = resto.replace(email[0].toLowerCase(), '');
    if (tel) resto = resto.replace(/\+?57|3\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, '');
    const soloDato = resto.replace(/[^a-z ]/g, '').trim().split(/\s+/).filter(Boolean).length <= 3;

    if (soloDato) {
      const partes: string[] = [];
      if (nom) partes.push(`¡Mucho gusto, ${p.nombre}! 😊`);
      if (email || tel) partes.push('Ya guardé tu contacto.');
      return {
        reply: `${partes.join(' ')} ¿En qué te ayudo: hospedaje, comida o actividades?`,
        tarjetas: [],
        sugerencias: ['Busco hospedaje', 'Dónde comer', 'Qué hacer'],
      };
    }
    return null; // sigue el flujo normal con los datos ya guardados
  }

  /** Guarda/actualiza el lead de esta sesión para el panel de Interesados. Nunca rompe el chat. */
  private async rastrearLead(
    sid: string,
    sesion: Sesion,
    mensaje: string,
    norm: string,
    prefsNuevas: Set<string>,
    origen?: { ip?: string | null; userAgent?: string | null },
  ) {
    try {
      const p = sesion.prefs;
      const temas = this.extraerTemas(norm, p, prefsNuevas);
      const turnoU = { rol: 'usuario', texto: mensaje.slice(0, 500) };
      const ultimoA = sesion.historial.filter((t) => t.rol === 'asistente').slice(-1)[0];
      const turnos: any[] = [turnoU];
      if (ultimoA) turnos.push({ rol: 'asistente', texto: ultimoA.texto.slice(0, 500) });

      const existente = await this.prisma.leadChat.findUnique({ where: { sessionId: sid } });
      const prevTemas: string[] = Array.isArray(existente?.temas) ? (existente!.temas as string[]) : [];
      const prevTrans: any[] = Array.isArray(existente?.transcript) ? (existente!.transcript as any[]) : [];
      const todosTemas = [...new Set([...prevTemas, ...temas])].slice(0, 12);
      const transcript = [...prevTrans, ...turnos].slice(-30);
      const prefsFoto = {
        tipo: p.tipo,
        presupuestoMax: p.presupuestoMax,
        huespedes: p.huespedes,
        mascotas: p.mascotas || undefined,
        actividad: p.actividad,
      };
      await this.prisma.leadChat.upsert({
        where: { sessionId: sid },
        update: {
          nombre: p.nombre || undefined,
          email: p.email || undefined,
          telefono: p.telefono || undefined,
          ip: origen?.ip || undefined,
          userAgent: origen?.userAgent || undefined,
          mensajesTotal: { increment: 1 },
          ultimaPregunta: mensaje.slice(0, 300),
          prefs: prefsFoto as any,
          temas: todosTemas,
          transcript,
        },
        create: {
          sessionId: sid,
          nombre: p.nombre,
          email: p.email,
          telefono: p.telefono,
          ip: origen?.ip || null,
          userAgent: origen?.userAgent || null,
          mensajesTotal: 1,
          primeraPregunta: mensaje.slice(0, 300),
          ultimaPregunta: mensaje.slice(0, 300),
          prefs: prefsFoto as any,
          temas: todosTemas,
          transcript,
        },
      });
    } catch (e) {
      console.warn('⚠️  No se pudo rastrear lead:', (e as Error).message);
    }
  }

  /** Intenciones/temas para las estadísticas del panel. Solo lo NUEVO de este turno + palabras del mensaje. */
  private extraerTemas(norm: string, p: Preferencias, nuevos: Set<string>): string[] {
    const temas: string[] = [];
    if (nuevos.has('tipo') && p.tipo) temas.push(`busca:${p.tipo}`);
    if (nuevos.has('actividad') && p.actividad) temas.push(p.actividad);
    if (nuevos.has('mascotas') && p.mascotas) temas.push('mascotas');
    if (nuevos.has('presupuestoMax') && p.presupuestoMax) temas.push('presupuesto');
    if (nuevos.has('huespedes') && p.huespedes) temas.push(`grupo:${p.huespedes}`);
    const claves: Record<string, string> = {
      yoga: 'yoga', taichi: 'tai chi', chikung: 'chi kung', precio: 'precios',
      cuanto: 'precios', vale: 'precios', cuesta: 'precios',
      reserv: 'reserva', ubicacion: 'ubicación', mapa: 'mapa', direccion: 'ubicación',
      cosmic: 'cosmic bungaló', cabana: 'cabañas', hotel: 'hoteles', hostal: 'hostales',
      hospedaje: 'hospedaje', glamping: 'glamping', restaurante: 'restaurante',
      comida: 'comida', menu: 'menú', plato: 'platos', desayuno: 'desayuno',
      almuerzo: 'almuerzo', cena: 'cena', carta: 'carta',
      tour: 'tours', cafe: 'café', cacao: 'cacao',
      caminata: 'caminatas', clima: 'clima', horario: 'horarios', pago: 'pagos',
      donacion: 'donaciones', arbol: 'siembra árboles', carbono: 'huella carbono',
      bienestar: 'bienestar', pileta: 'pileta natural', estrellas: 'estrellas',
    };
    for (const [k, etiqueta] of Object.entries(claves)) {
      if (norm.includes(k) && !temas.includes(etiqueta)) temas.push(etiqueta);
    }
    return temas.slice(0, 10);
  }

  private normalizar(t: string): string {
    return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private mencionaTipo(norm: string): boolean {
    return /(busc|quiero|necesito|recomiend|hotel|hostal|glamping|comer|restaurante|bar|finca|tour|actividad|hacer|dormir|quedar|piscina)/.test(norm);
  }

  /** ¿Pregunta factual (qué/cuánto/cuál/cómo) sin intención de búsqueda o reserva? */
  private esPreguntaFactual(norm: string): boolean {
    if (/(busc|quiero|necesito|recomiend|reserv|apart|precio|presupuesto|somos|mascota|perro|ver mas|mas opciones)/.test(norm)) return false;
    // "cuánto cuesta/vale" es pregunta de precio, no factual del RAG
    if (/cuanto (cuesta|vale|valen|es|seria)/.test(norm)) return false;
    return /(cuant|que es|que incluye|que significa|cual|como es|como son|donde|por que|dime|cuentame|explicame|que hay)/.test(norm);
  }

  private extraerPreferencias(norm: string, p: Preferencias) {
    for (const [palabra, tipo] of Object.entries(TIPOS)) {
      if (new RegExp(`\\b${palabra}\\b`).test(norm)) {
        if (palabra === 'comer' || palabra === 'piscina') continue; // ambiguas: solo suman intención
        p.tipo = tipo;
      }
    }
    if (/\b(cabana|choza|domo|tienda)\b/.test(norm)) p.keywords = [...(p.keywords || []), 'cabana'];
    // presupuesto: "hasta 200", "menos de 150 mil", "económico/barato"
    const mMonto = norm.match(/(?:hasta|menos de|maximo|presupuesto(?: de)?)\s*\$?\s*(\d[\d.]*)\s*(mil|k|millon(?:es)?|m)?/);
    if (mMonto) {
      let v = parseFloat(mMonto[1].replace(/\./g, ''));
      const suf = mMonto[2];
      if (suf && /millon|m\b/.test(suf)) v *= 1000000;
      else if (v < 1000) v *= 1000; // "200" => 200.000 COP
      p.presupuestoMax = v;
    } else if (/(economico|barato|mochilero)/.test(norm)) {
      p.presupuestoMax = Math.min(p.presupuestoMax || Infinity, 120000);
    } else if (/(lujo|premium|boutique)/.test(norm)) {
      p.keywords = [...(p.keywords || []), 'lujo'];
    }
    // acompañantes
    const mPer = norm.match(/somos\s*(\d+)|para\s*(\d+)\s*(?:personas)?|(\d+)\s*personas/);
    if (mPer) p.huespedes = parseInt(mPer[1] || mPer[2] || mPer[3], 10);
    else if (/(pareja|novio|luna de miel|romantico)/.test(norm)) p.huespedes = 2;
    else if (/(familia|hijos|ninos)/.test(norm)) p.huespedes = Math.max(p.huespedes || 0, 4);
    // mascotas (con negación: "no tengo mascota", "sin perro", "mascotas no")
    if (/(mascota|perro|gato|\bpet\b|peludo)/.test(norm)) {
      const negado =
        /\bsin\s+(mascota|perro|gato|peludo|mi perro)/.test(norm) ||
        /(mascota|perro|gato|peludo)s?\s+no\b/.test(norm) ||
        /\bno\s+(tengo|tenemos|llevo|llevamos|voy a llevar|tiene|tienen)\b[^.]{0,40}(mascota|perro|gato|peludo)/.test(norm);
      p.mascotas = !negado;
    }
    // actividades
    for (const a of ACTIVIDADES) {
      if (new RegExp(`\\b${a}\\b`).test(norm)) {
        p.actividad = a;
        p.keywords = [...(p.keywords || []), a];
      }
    }
  }

  private async detectarSitio(norm: string): Promise<{ slug: string } | null> {
    const ahora = Date.now();
    if (!this.catalogoCache || ahora - this.catalogoCache.fecha > 5 * 60 * 1000) {
      const datos = await this.prisma.propiedad.findMany({
        where: { estado: 'PUBLICADO' },
        select: { nombre: true, slug: true },
      });
      this.catalogoCache = { fecha: ahora, datos };
    }
    for (const s of this.catalogoCache.datos) {
      const n = this.normalizar(s.nombre);
      if (n.length >= 5 && norm.includes(n)) return { slug: s.slug };
    }
    return null;
  }

  private async buscarCandidatos(p: Preferencias, take: number): Promise<{ items: Tarjeta[]; relajado: boolean }> {
    const where: any = { estado: 'PUBLICADO' };
    if (p.tipo) where.tipo = p.tipo as any;
    if (p.presupuestoMax) where.precioNoche = { lte: p.presupuestoMax };
    if (p.mascotas) where.admiteMascotas = true;
    if (p.huespedes) where.capacidadMaxima = { gte: p.huespedes };
    if (p.keywords?.length) {
      where.OR = p.keywords.slice(0, 4).map((k) => ({
        OR: [
          { nombre: { contains: k, mode: 'insensitive' } },
          { descripcion: { contains: k, mode: 'insensitive' } },
        ],
      }));
    }
    const items = await this.prisma.propiedad.findMany({
      where,
      include: { images: { orderBy: { orden: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    if (items.length) return { items: items.map((s) => this.tarjeta(s)), relajado: false };
    // Si los filtros combinados no dan nada, relaja a solo tipo
    if (p.presupuestoMax || p.mascotas || p.huespedes || p.keywords?.length) {
      const relajados = await this.prisma.propiedad.findMany({
        where: { estado: 'PUBLICADO', ...(p.tipo ? { tipo: p.tipo as any } : {}) },
        include: { images: { orderBy: { orden: 'asc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take,
      });
      return { items: relajados.map((s) => this.tarjeta(s)), relajado: true };
    }
    return { items: [], relajado: false };
  }

  private tarjeta(s: any): Tarjeta {
    return {
      slug: s.slug, nombre: s.nombre, tipo: s.tipo,
      precio: s.precioNoche != null ? Number(s.precioNoche) : null,
      imagen: s.images?.[0]?.url || null,
    };
  }

  private describeContexto(p: Preferencias): string {
    const partes: string[] = [];
    if (p.huespedes) partes.push(`para ${p.huespedes}`);
    if (p.presupuestoMax) partes.push(`hasta $${p.presupuestoMax.toLocaleString('es-CO')}`);
    if (p.mascotas) partes.push('donde acepten tu mascota 🐶');
    return partes.length ? partes.join(' ') : 'según lo que me contaste';
  }

  private sugerenciasSeguimiento(p: Preferencias): string[] {
    const s: string[] = [];
    if (!p.presupuestoMax) s.push('Económico (menos de $100 mil)');
    if (!p.huespedes) s.push('Somos 2');
    if (!p.mascotas) s.push('Voy con mi perro 🐶');
    s.push('Quiero reservar');
    return s.slice(0, 3);
  }

  private recortar(t: string | null, n: number): string {
    if (!t) return '';
    const limpio = t.replace(/\s+/g, ' ').trim();
    return limpio.length > n ? limpio.slice(0, n).trimEnd() + '…' : limpio;
  }

  private async cargarSesion(sid: string): Promise<Sesion> {
    try {
      const guardada = await this.redis.get<Sesion>(`chat:${sid}`);
      if (guardada) return guardada;
    } catch {}
    const mem = this.memoria.get(sid);
    if (mem) return mem;
    const nueva: Sesion = { historial: [], prefs: {} };
    this.memoria.set(sid, nueva);
    return nueva;
  }

  private async guardarSesion(sid: string, s: Sesion) {
    this.memoria.set(sid, s);
    try {
      await this.redis.set(`chat:${sid}`, s, 24 * 3600);
    } catch {}
  }
}
