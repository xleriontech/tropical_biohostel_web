export const metadata = {
  title: "Términos y condiciones · Tropical Biohostel",
  description:
    "Términos, condiciones y políticas de reserva de Tropical Biohostel: documentación de ingreso, horarios, pagos, cancelaciones, normas de convivencia, ESCNNA y protección de datos.",
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Términos y condiciones</span>
      </nav>

      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Tropical Biohostel
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Términos, Condiciones y Políticas de Reserva
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        NIT: 21.087.918-6 — RNT No. 52552
      </p>

      <p className="mt-8 leading-relaxed text-muted-foreground">
        Al realizar una reserva o hacer uso de nuestras instalaciones y servicios, el huésped o
        visitante acepta de manera expresa los presentes Términos, Condiciones y Políticas de
        Reserva, los cuales se rigen por la legislación turística y comercial vigente en la
        República de Colombia.
      </p>

      <div className="mt-12 space-y-10 leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.1. Registro Obligatorio y Documentación de Ingreso (Check-in)
          </h2>
          <p>
            De conformidad con la Ley 2068 de 2020 y el Decreto 1836 de 2021, todos los huéspedes
            (incluidos acompañantes y menores de edad) deberán presentar su documento de identidad
            original y vigente al momento del ingreso para el diligenciamiento obligatorio de la
            Tarjeta de Registro de Alojamiento (TRA) ante el Ministerio de Comercio, Industria y
            Turismo:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Ciudadanos colombianos:</strong> Cédula de Ciudadanía o Tarjeta de Identidad.
            </li>
            <li>
              <strong className="text-foreground">Ciudadanos extranjeros:</strong> Pasaporte vigente, Cédula de Extranjería o
              Permiso por Protección Temporal (PPT), según corresponda.
            </li>
            <li>
              <strong className="text-foreground">Menores de edad:</strong> Registro Civil de Nacimiento o Tarjeta de Identidad.
              En cumplimiento de la Ley 679 de 2001 y la Ley 1336 de 2009, si el menor no ingresa
              acompañado de ambos padres, el adulto responsable deberá presentar autorización
              escrita y autenticada de los padres junto con copia de sus documentos de identidad.
              Sin este requisito, no se permitirá el ingreso.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.2. Horarios de Ingreso (Check-in) y Salida (Check-out)
          </h2>
          <p>
            <strong className="text-foreground">Check-in (Ingreso):</strong> A partir de las [3:00 p.m.].
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Check-out (Salida):</strong> Hasta las [12:00 m. / 1:00 p.m.].
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Ingresos anticipados (Early Check-in) o salidas tardías (Late Check-out):</strong>{" "}
            Están sujetos a disponibilidad previa debido a la exclusividad de nuestras 3 unidades de
            alojamiento y podrán generar un cargo adicional.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Pasadías y Experiencias sin alojamiento:</strong> El ingreso y salida se regirán
            estrictamente por el horario confirmado en la reserva de la experiencia contratada.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.3. Política de Reservas, Pagos y Tarifas
          </h2>
          <p>
            <strong className="text-foreground">Confirmación de reserva:</strong> Debido a nuestra capacidad limitada (2
            cabañas y 1 glamping en un área privada de 14.000 m²), toda reserva requiere
            confirmación previa y el pago de un anticipo equivalente al [50%] del valor total de la
            estadía o experiencia. El saldo restante deberá cancelarse [al momento del check-in /
            48 horas antes del ingreso].
          </p>
          <p className="mt-3">
            <strong className="text-foreground">Vigencia de tarifas:</strong> Todas las tarifas están expresadas en pesos
            colombianos (COP) y corresponden exclusivamente al número de personas y servicios
            detallados en la confirmación. Cualquier huésped o visitante adicional no registrado
            previamente tendrá un costo extra sujeto a disponibilidad y capacidad máxima de la unidad
            (máximo 7 personas en cabañas y 4 personas en glamping).
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.4. Política de Modificaciones, Cancelaciones y No Presentación (No-Show)
          </h2>
          <p>
            En ningún caso se realizarán reembolsos ni devoluciones de dinero por concepto de
            cancelaciones, modificaciones de reserva o no presentación (No-Show). En su lugar, el
            huésped podrá solicitar un cambio de fecha para su estadía o experiencia, el cual
            estará estrictamente sujeto a la disponibilidad del establecimiento.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.5. Normas de Convivencia, Seguridad y Protección Ambiental
          </h2>
          <p>
            Nuestro alojamiento se encuentra inmerso en un ecosistema natural de 14.000 m² con flora
            nativa, árboles frutales, plantas medicinales, fauna silvestre y fuentes de agua natural.
            Para garantizar el descanso y la conservación ambiental:
          </p>

          <p className="mt-4">
            <strong className="text-foreground">Silencio y privacidad:</strong> Al contar con solo 3 alojamientos, está prohibido el uso de equipos de sonido a alto
            volumen, fiestas o actividades que perturben la tranquilidad de otros huéspedes y de la
            fauna nativa (Ley 1801 de 2016).
          </p>

          <h3 className="mt-6 font-display text-base font-semibold text-foreground">
            Uso de áreas naturales y seguridad
          </h3>
          <p className="mt-2">
            El uso de la plataforma mirador en el árbol (360°), la pileta al aire libre y el pozo
            alimentado por agua de nacimiento natural se realiza bajo la responsabilidad y
            autocuidado de cada huésped. Los menores de edad deben permanecer bajo supervisión
            permanente de un adulto responsable.
          </p>
          <p className="mt-2">
            Por respeto al ecosistema orgánico, está prohibido ingresar al pozo natural o a la
            pileta utilizando bloqueadores solares químicos, aceites, jabones o sustancias
            contaminantes.
          </p>

          <p className="mt-4">
            <strong className="text-foreground">Protección de flora y fauna:</strong> Queda estrictamente prohibido extraer plantas medicinales, aromáticas o nativas, cortar
            ramas, alimentar o perturbar a las especies animales silvestres, así como encender
            fogatas fuera de las zonas expresamente autorizadas.
          </p>

          <p className="mt-4">
            <strong className="text-foreground">Espacios libres de humo:</strong> De conformidad con la Ley 1335 de 2009, está prohibido fumar o vapear dentro de las
            cabañas, el glamping, el mándala de bienestar y las áreas cerradas.
          </p>

          <p className="mt-4">
            <strong className="text-foreground">Política de mascotas:</strong> Se permite el ingreso de mascotas con un máximo de dos animales por cabaña. El propietario
            es totalmente responsable de su debida regulación, cuidado y supervisión durante toda la
            estancia para garantizar la armonía con el entorno y otros huéspedes.
          </p>

          <p className="mt-4">
            <strong className="text-foreground">Daños y pérdida de objetos:</strong> El huésped responderá por cualquier daño, deterioro o pérdida causada a la infraestructura
            (guadua, ladrillo, mobiliario, lencería, kits de bienestar o equipos) por mal uso o
            negligencia. El establecimiento no se hace responsable por objetos de valor olvidados o no
            custodiados dentro de las instalaciones.
          </p>

          <p className="mt-4">
            <strong className="text-foreground">Consumo de alcohol y medicamentos:</strong> Se permite el consumo moderado de bebidas alcohólicas. Sin embargo, en caso de
            evidenciarse excesos o comportamientos que alteren la tranquilidad y convivencia del lugar,
            el establecimiento se reserva el derecho de permanencia y podrá dar por cancelada la
            estancia de forma inmediata, sin que haya lugar a la devolución del dinero pagado.
            Asimismo, el consumo y administración de cualquier medicamento o fármaco durante la
            estadía se realiza bajo la estricta y exclusiva responsabilidad del huésped.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.6. Prevención de la Explotación Sexual Comercial de Niños, Niñas y Adolescentes (ESCNNA)
          </h2>
          <p>
            En estricto cumplimiento de la Ley 679 de 2001, la Ley 1336 de 2009 y la Resolución 3840 de
            2009 del Ministerio de Comercio, Industria y Turismo, Tropical Biohostel rechaza y previene
            cualquier forma de explotación, pornografía y turismo sexual con niños, niñas y
            adolescentes. Estas conductas están tipificadas como delito en el Código Penal Colombiano
            (Ley 599 de 2000) y serán denunciadas de inmediato ante las autoridades competentes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            1.7. Protección de Datos Personales (Habeas Data)
          </h2>
          <p>
            En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, los datos personales
            suministrados durante el proceso de cotización, reserva y registro (TRA) serán tratados
            únicamente para gestionar su estadía, cumplir con los reportes legales obligatorios ante
            las autoridades migratorias y turísticas, facturación y envío de información
            relacionada con su servicio. El titular podrá ejercer sus derechos de consulta, actualización,
            rectificación y supresión escribiendo al correo electrónico <a href="mailto:hola@tropicalbiohostel.com" className="font-medium text-primary hover:underline">hola@tropicalbiohostel.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}