# BioHostel OS — Anexo Técnico 4/4

## Matriz de hitos para vesting (enfoque PMP)

> **Objeto del anexo.** Vincular la liberación de acciones del aporte en industria
> valorado en **$120.000.000 COP** a hitos técnicos verificables, con criterios de
> aceptación medibles y evidencia reproducible. El objetivo es que el equity se
> libere por valor entregado y que el software quede como activo de propiedad
> intelectual de la sociedad, no como dependencia de una persona.

| Parámetro | Definición |
|---|---|
| Aporte | Industria/tecnología valorada en $120.000.000 COP, sujeta a valoración y aprobación societaria |
| Beneficiario | Socio fundador a cargo de tecnología (CTO) |
| Horizonte | 24 meses, 4 fases, 4 gates |
| Liberación total | 100% de las acciones sujetas a vesting |
| Verificador | Revisor fiscal o verificador técnico independiente designado por la Asamblea |
| Evidencia | Producción, repositorio, métricas, actas y reportes reproducibles |
| Moneda | COP |

### Supuestos de estructura

1. Las acciones se emiten al inicio y quedan sujetas a un **pacto de vesting con
   reversión** de las no liberadas; alternativamente, pueden emitirse por tramos
   con actas de capitalización. La estructura recomendada es la primera, para
   evitar dilución ambigua y múltiples aumentos de capital. La decisión final la
   valida el abogado corporativo y el contador.
2. El aporte no es un pago en efectivo: es la valoración acordada de tecnología,
   trabajo, propiedad intelectual e infraestructura aportados. La sociedad debe
   recibir la cesión de derechos patrimoniales y la documentación del activo.
3. La liberación es **acumulativa** y se certifica por acta. No se libera una
   fase por “porcentaje de avance” subjetivo: se libera cuando el gate completo
   cumple sus criterios y la evidencia está disponible.
4. Los porcentajes suman 100%. La ponderación refleja riesgo, diferenciación y
   valor de activo: MVP 20%, Pagos/Compliance 25%, IA 30%, Escalamiento/PI 25%.
5. Los porcentajes se calculan sobre las **acciones sujetas a vesting**, no sobre
   el capital social total. La participación final depende de la valoración
   pre/post-money, del número de acciones emitidas y de la prima de colocación.
   El valor de referencia del aporte ($120M COP) no implica que un 20% equivalga
   a $24M de equity de la compañía; es solo la porción del aporte reconocida en
   cada fase para efectos del pacto.

---

## 1. Tabla resumen de fases y liberación

| # | Fase | Periodo | Foco de valor | Entregable de cierre (gate) | % liberación | % acumulado |
|---|---|---|---|---|---|---|
| 1 | **MVP Operativo y Reservas Directas** | Mes 0–4 | Pilar 1: motor de ingresos directos | Reserva directa transaccional en producción, sin overbooking, con panel operativo y CI/CD | **20%** | 20% |
| 2 | **Pagos Locales, DIAN y Compliance** | Mes 4–8 | Pilares 1 y 4: margen y cumplimiento | Wompi/Nequi conciliados + facturación electrónica DIAN + auditoría y consentimiento | **25%** | 45% |
| 3 | **IA Avanzada y Revenue Intelligence** | Mes 8–14 | Pilares 2 y 3: IA operativa y datos | Nati con RAG, extracción de intención, upselling, handoff y dashboards de ahorro | **30%** | 75% |
| 4 | **Escalamiento Multi-Tenant y Activo de PI** | Mes 14–24 | Pilares 3 y 5: escala y propiedad intelectual | IaC, multi-tenant, SLO 99.9%, DR, piloto con segunda finca y dossier de PI | **25%** | **100%** |

**Regla de oro:** el porcentaje se libera por fase cerrada, no por tarea. Un
entregable individual terminado no libera equity si el gate de la fase no cumple
todos sus criterios.

---

## 2. Matriz detallada por fase

### Fase 1 — MVP Operativo y Reservas Directas (20%)

**Objetivo:** sustituir la operación manual y las reservas por OTA como canal
principal, con un motor transaccional confiable y trazable.

| ID | Entregable técnico | Criterio de aceptación medible | Evidencia verificable |
|---|---|---|---|
| F1.1 | Esquema multi-tenant y RLS | 100% de tablas de negocio con `tenantId`; pruebas de aislamiento entre 2 tenants sintéticos sin fugas | Migraciones + test de aislamiento en CI |
| F1.2 | Motor de reservas y holds | Reserva atómica; 0 overbookings en 60 días consecutivos; conflicto de inventario responde 409 | Reporte de producción + prueba de concurrencia |
| F1.3 | Panel operativo (Admin/Staff) | CRUD de propiedades, unidades, calendario, reservas y roles; UAT firmado por operación | Acta UAT + video/demo + release tag |
| F1.4 | Checkout directo y correos transaccionales | Flujo completo en ES/EN; conversión medida; correo de confirmación con código de reserva | E2E en producción + métricas de embudo |
| F1.5 | Sincronización iCal (Airbnb/Booking) | Importación/exportación sin traslapes; alerta ante conflicto | Log de sync + prueba con calendario real |
| F1.6 | RNT, privacidad y consentimiento | RNT visible; aviso de privacidad; consentimiento registrado en 100% de reservas | Capturas + consulta a `ConsentRecord` |
| F1.7 | CI/CD, observabilidad y backups | Deploy a staging en cada merge; rollback < 10 min; logs, métricas y trazas; backup diario probado | Pipeline + dashboard + prueba de restore |
| F1.8 | Calidad y seguridad | Cobertura ≥ 70% en módulos de reserva/precio; 0 vulnerabilidades críticas/altas en SAST/DAST | Reporte de cobertura + escaneo |

**Gate 1 (Mes 4):** 100% de reservas directas del piloto por el sistema; 0
overbookings en 60 días; p95 de creación de reserva ≤ 800 ms; p95 de consulta de
disponibilidad ≤ 300 ms; UAT firmado; release `v0.1.0`.

**Liberación:** 20% (acumulado 20%).

---

### Fase 2 — Pagos Locales, DIAN y Compliance (25%)

**Objetivo:** capturar el margen completo del canal directo y convertir el
cumplimiento en ventaja competitiva, no en costo.

| ID | Entregable técnico | Criterio de aceptación medible | Evidencia verificable |
|---|---|---|---|
| F2.1 | Wompi y Nequi en producción | Pago exitoso ≥ 98%; 0 cobros duplicados en 1.000 transacciones; checkout y retorno funcionando | Métricas de pasarela + conciliación |
| F2.2 | Máquina de estados de pago | Estados `PENDING/AUTHORIZED/PAID/FAILED/REFUNDED` consistentes; reintentos idempotentes; reembolsos probados | Pruebas de integración + logs |
| F2.3 | Conciliación diaria | 100% de transacciones conciliadas; diferencias < 0.1%; cierre diario automatizado | Reporte de conciliación + dashboard |
| F2.4 | Facturación electrónica DIAN | ≥ 99% de facturas aceptadas en 48 h; 0 facturas sin CUFE; notas crédito probadas | Reporte del PTE/DIAN + muestra XML/PDF |
| F2.5 | Webhooks de pago y factura | 100% de firmas validadas; idempotencia por `eventId`; prueba de replay superada | Test de webhooks + `WebhookEvent` |
| F2.6 | Auditoría inmutable | 100% de eventos de reserva/pago/factura en `AuditLog`; prueba de alteración detectada | Test de integridad de hash chain |
| F2.7 | Consentimiento y retención | 100% de reservas con consentimiento versionado; política de retención configurada | Consulta a `ConsentRecord` + política publicada |
| F2.8 | Seguridad de pagos | PCI scope minimizado (sin datos de tarjeta); secretos en vault; pentest sin críticos/altos | Informe de pentest + arquitectura de secretos |

**Gate 2 (Mes 8):** producción con Wompi/Nequi y DIAN durante 30 días
consecutivos; conciliación diaria al 100%; aceptación DIAN ≥ 99%; pentest sin
hallazgos críticos/altos; facturación y auditoría aprobadas por revisor fiscal.

**Liberación:** 25% (acumulado 45%).

---

### Fase 3 — IA Avanzada y Revenue Intelligence (30%)

**Objetivo:** reducir carga administrativa, atender 24/7 en ES/EN y aumentar el
ingreso por reserva con upselling contextual, midiendo el ahorro de forma auditable.

| ID | Entregable técnico | Criterio de aceptación medible | Evidencia verificable |
|---|---|---|---|
| F3.1 | Pipeline RAG multi-tenant | Ingesta, chunking, embeddings y búsqueda híbrida (pgvector + FTS); 0 resultados cruzados entre tenants | Test de aislamiento + evaluación de retrieval |
| F3.2 | Nati con extracción de intención | Set dorado de 200 casos: intención/slots ≥ 95%; groundedness ≥ 95%; alucinación ≤ 2% | Reporte de evaluación + set dorado versionado |
| F3.3 | Cumplimiento de políticas | Mascotas, horarios, capacidad y pagos = 100% correctos en el set dorado | Matriz de pruebas + revisión de políticas |
| F3.4 | Upselling y add-ons | Attach rate de add-ons ≥ 20%; recomendaciones solo de catálogo; sin presión | A/B test + métricas de reserva |
| F3.5 | Handoff humano | Handoff < 30 s a WhatsApp/agente; 100% de casos con resumen y trazabilidad | Panel de handoff + logs |
| F3.6 | Dashboards de ahorro y ingreso | Contención ≥ 60%; CSAT ≥ 4.5/5; horas administrativas ahorradas ≥ 20%; ingreso atribuido visible | Dashboard `AIMetric` + informe mensual |
| F3.7 | Evaluación y red team | Prompt injection ≥ 95% detectado; 0 fugas de PII en 100 casos; regresión en CI | Informe de red team + pipeline |
| F3.8 | Precio dinámico v1 | Reglas de temporada/ocupación con guardrails; aprobación humana; sin precios fuera de rango | Simulador + bitácora de cambios |

**Gate 3 (Mes 14):** 30 días de operación con Nati; umbrales del set dorado
cumplidos; contención ≥ 60%; CSAT ≥ 4.5/5; ahorro auditado en `AIMetric`;
aprobación del revisor fiscal sobre la métrica de ahorro.

**Liberación:** 30% (acumulado 75%).

---

### Fase 4 — Escalamiento Multi-Tenant y Activo de PI (25%)

**Objetivo:** convertir BioHostel OS en un activo licenciable, operable y
auditable, con costo unitario decreciente y capacidad de onboarding de nuevas fincas.

| ID | Entregable técnico | Criterio de aceptación medible | Evidencia verificable |
|---|---|---|---|
| F4.1 | Aprovisionamiento multi-tenant | Onboarding de un tenant nuevo < 1 día hábil; subdominio, branding, roles y datos aislados | Runbook + prueba cronometrada |
| F4.2 | Infraestructura como código (Terraform) | 100% de infraestructura en Terraform; `terraform plan` limpio; deploy desde cero < 2 h | Repo IaC + pipeline + prueba de recreate |
| F4.3 | SLO y operación | 99.9% de uptime en 90 días; alertas, on-call y error budget; p95 dentro de SLO | Dashboard SLO + incidentes |
| F4.4 | Continuidad y DR | RTO ≤ 1 h; RPO ≤ 15 min; simulacro trimestral exitoso; backups cifrados | Acta de simulacro + reporte |
| F4.5 | Seguridad y cadena de suministro | SBOM de 100% de dependencias; 0 críticos/altos; rotación de secretos; política de licencias | SBOM + escaneo + política |
| F4.6 | Dossier de propiedad intelectual | ADRs, OpenAPI, runbooks, arquitectura, contratos de cesión, auditoría de licencias open source | Repo documental + acta de cesión |
| F4.7 | Piloto con segunda finca | 1 tenant externo operando; acuerdo de licencia firmado; feedback y plan de mejora | Contrato + métricas del piloto |
| F4.8 | Eficiencia unitaria | Costo por reserva -30%; ahorro de comisión OTA ≥ 10 pp; margen bruto mejorado | Reporte financiero + costos cloud |

**Gate 4 (Mes 24):** piloto externo live; SLO 99.9% sostenido 90 días; DR
probado; IaC al 100%; dossier de PI completo; acuerdo de licencia firmado;
aprobación de la Asamblea.

**Liberación:** 25% (acumulado 100%).

---

## 3. Reglas de liberación y protección del activo

### 3.1 Condiciones de liberación

1. **Evidencia en producción, no presentaciones.** Métricas de 30 días continuos
   (o el periodo indicado), consultas reproducibles, release tag y acta firmada.
2. **Verificación independiente.** El CTO no se autoevalúa. El revisor fiscal o
   el verificador técnico designado revisa la evidencia y emite concepto.
3. **Acta de Asamblea.** La liberación se formaliza en acta, se actualiza el libro
   de accionistas y se registra en el pacto de accionistas.
4. **Gate completo.** Si un criterio no se cumple, la fase no se libera; se puede
   liberar parcialmente solo si la Asamblea aprueba un plan de remediación con
   fecha y el % se mantiene retenido hasta el cierre.
5. **Plazo de subsanación.** 30 días calendario para corregir brechas imputables
   al fundador. Si se corrige, se libera; si no, el hito queda pendiente.
6. **Retrasos imputables a la sociedad.** Falta de accesos, credenciales DIAN,
   contratos con pasarelas, decisiones de negocio o aprobaciones extienden el
   cronograma día por día, sin penalización al fundador.

### 3.2 Reversión y salida

- Las acciones **no liberadas** se revierten a la sociedad (o a los accionistas
  que esta designe) a valor nominal, salvo pacto distinto.
- Las acciones **liberadas** se conservan, aunque el fundador se retire.
- Si el retiro es por causa imputable a la sociedad, se reconoce la liberación
  proporcional al avance verificable del gate en curso, con valoración aprobada
  por la Asamblea.
- Si el retiro es por incumplimiento grave o fraude, aplican las cláusulas de
  buen/mal saliente que defina el pacto, revisadas por el abogado corporativo.

### 3.3 Aceleración

- **Doble disparador:** cambio de control (≥ 50% del capital) + despido sin justa
  causa o cambio sustancial de rol, acelera el 100% de las acciones no liberadas.
- **Muerte o incapacidad permanente:** aceleración total, sujeta a la ley y a la
  póliza aplicable.
- Cualquier aceleración debe quedar en el pacto y no puede afectar derechos de
  terceros ni la valoración de la sociedad.

### 3.4 Propiedad intelectual

- **Cesión total a la sociedad** de código, prompts, esquemas, documentación,
  datasets, marcas, nombres de dominio, know-how y desarrollos derivados.
- **Derechos morales:** se respetan y se reconoce su carácter irrenunciable; se
  acuerda la no oposición al uso, modificación y explotación por parte de la
  sociedad, en la medida permitida por la ley.
- **Colaboradores y contratistas:** contratos con cesión de PI y confidencialidad
  antes del primer commit.
- **Open source:** política de licencias; prohibido GPL/AGPL en el núcleo
  propietario sin aprobación; SBOM y auditoría de dependencias.
- **Secretos:** claves, certificados y API keys en vault, nunca en el repositorio;
  rotación y registro de accesos.
- **Datos:** la sociedad es la responsable del tratamiento; el fundador no puede
  usar datos de huéspedes para proyectos personales ni entrenar modelos externos
  sin autorización.

### 3.5 Valoración y efectos societarios

- El aporte de $120.000.000 COP debe sustentarse en una **valoración
  independiente** (código, prompts, infraestructura, trabajo aportado) y ser
  aprobado por la Asamblea.
- Definir si se estructura como aporte en especie, aporte en industria o una
  combinación, con el tratamiento contable y tributario que corresponda. La
  Ley 1258 de 2008 y los estatutos determinan el procedimiento; validar con
  abogado corporativo y contador.
- Si se emiten acciones con prima de colocación, dejar explícito el destino de la
  prima y el impacto en el capital suscrito y pagado.
- La liberación de acciones no implica desembolso de caja: es un reconocimiento
  de equity ya suscrito.

---

## 4. Gobernanza PMP

### 4.1 Cadencia y roles (RACI)

| Actividad | CTO / Fundador | CEO / Representante legal | Revisor fiscal / Verificador | Asamblea |
|---|---|---|---|---|
| Ejecutar entregables técnicos | **R** | I | I | I |
| Aprobar alcance y cambios | C | **A** | C | I |
| Verificar evidencia de gate | C | C | **R** | I |
| Liberar acciones | C | C | C | **A** |
| Aprobar presupuesto e infraestructura | R | **A** | C | I |
| Gestionar riesgos | **R** | A | C | I |

R = responsable, A = aprueba, C = consultado, I = informado.

### 4.2 Control de cambios

Todo cambio de alcance, fecha o criterio de aceptación se tramita con:
1. Solicitud de cambio (descripción, motivo, impacto en alcance, tiempo, costo y equity).
2. Análisis de impacto técnico y financiero.
3. Aprobación del comité (CEO + CTO) y, si afecta el % de vesting, de la Asamblea.
4. Actualización de la línea base y comunicación a las partes.

**Regla:** no se acepta un cambio que reduzca un criterio de aceptación sin
compensación equivalente o aprobación expresa de la Asamblea.

### 4.3 Gestión del valor ganado (EVM)

| Indicador | Fórmula | Uso |
|---|---|---|
| PV | Valor planeado del periodo | Línea base |
| EV | Valor de entregables aceptados | Avance real |
| AC | Costo real (horas + infraestructura) | Eficiencia |
| SPI | EV / PV | Desviación de cronograma |
| CPI | EV / AC | Desviación de costo |

Reporte mensual; si SPI o CPI < 0.85 durante dos periodos, se activa plan de
recuperación y revisión de riesgos.

### 4.4 Riesgos principales

| Riesgo | Prob. | Impacto | Mitigación | Dueño |
|---|---|---|---|---|
| Rechazo o demora DIAN | Media | Alto | PTE con SLA, reintentos, monitoreo, plan de contingencia y validación con contador | CTO |
| Caída o cambio de condiciones de pasarela | Media | Alto | Doble proveedor (Wompi/Nequi), conciliación, fallback de pago en sitio | CTO |
| Alucinación o fuga de datos del LLM | Media | Alto | RAG estricto, evaluación, moderación, red team, DPA y retención cero si es posible | CTO |
| Overbooking por concurrencia | Baja | Alto | Transacción serializable + exclusion constraint + pruebas de carga | CTO |
| Dependencia de una sola persona | Alta | Alto | Documentación, ADRs, pair programming, code ownership y runbooks | CEO/CTO |
| Baja adopción del canal directo | Media | Medio | UX, campañas, precio directo competitivo, medición de CAC/LTV | CEO |
| RNT vencido o incumplimiento Habeas Data | Baja | Alto | Calendario de renovación, auditoría trimestral, revisión legal | CEO |

---

## 5. KPIs por pilar de valor

| Pilar | KPI | Meta al cierre | Fase |
|---|---|---|---|
| 1. Ingresos directos | % de reservas por canal directo | ≥ 70% | 2–3 |
| 1. Ingresos directos | Ahorro de comisión OTA (pp de margen) | ≥ 10 pp | 2–4 |
| 1. Ingresos directos | ADR / RevPAR | Crecimiento medido vs. línea base | 3–4 |
| 2. IA operativa | Contención sin humano | ≥ 60% | 3 |
| 2. IA operativa | CSAT de conversaciones | ≥ 4.5/5 | 3 |
| 2. IA operativa | Horas administrativas ahorradas | ≥ 20% | 3 |
| 2. IA operativa | Costo por conversación | Dentro del presupuesto aprobado | 3 |
| 3. Datos y gobernanza | Frescura del dashboard | < 15 min | 2–3 |
| 3. Datos y gobernanza | CAC, LTV y margen por canal | Visibles y auditables | 3 |
| 4. Compliance | Aceptación DIAN | ≥ 99% en 48 h | 2 |
| 4. Compliance | Cobertura de consentimiento | 100% de reservas | 2 |
| 4. Compliance | Integridad del audit log | 100% verificable | 2 |
| 5. PI y escala | Cobertura IaC | 100% | 4 |
| 5. PI y escala | Uptime | 99.9% en 90 días | 4 |
| 5. PI y escala | Onboarding de tenant | < 1 día hábil | 4 |
| 5. PI y escala | Costo por reserva | -30% | 4 |

---

## 6. Plantilla de acta de verificación de hito

```text
ACTA DE VERIFICACIÓN DE HITO — BIOHOSTEL OS
Fecha:
Hito / Fase:
Periodo evaluado:
Verificador independiente:

1. Evidencia revisada
   [ ] Release tag: __________
   [ ] Reporte de pruebas: __________
   [ ] Métricas de producción (fecha y fuente): __________
   [ ] Informe de seguridad: __________
   [ ] Acta UAT / aprobación operativa: __________
   [ ] Documento de arquitectura / ADR actualizado: __________

2. Resultado por criterio de aceptación
   Criterio 1: [ ] Cumple  [ ] No cumple  Observación:
   Criterio 2: [ ] Cumple  [ ] No cumple  Observación:
   ...

3. Decisión
   [ ] Se libera el ___% de las acciones sujetas a vesting.
   [ ] Se retiene hasta subsanar: __________ (fecha límite: __________).
   [ ] Se aprueba plan de remediación: __________.

4. Firmas
   CTO / Fundador: ____________________
   CEO / Representante legal: ____________________
   Revisor fiscal / Verificador: ____________________
   Asamblea: ____________________
```

---

## 7. Notas de cumplimiento y alcance

### 7.1 Verificación de la Resolución 0313 de 2021

La sociedad citó la “Res. 0313 de 2021 DIAN”. La verificación en el normograma de
la DIAN y en el Diario Oficial no identifica una Resolución 0313 de 2021 expedida
por esa entidad; la Resolución 313 de 2021 que consta con esa numeración es:

> **Resolución 313 de 2021** (10 de marzo de 2021), **Ministerio de Salud y
> Protección Social**, Diario Oficial No. 51.612 del 10 de marzo de 2021,
> *“Por medio de la cual se modifica la Resolución 843 de 2020 que adopta el
> protocolo de bioseguridad para el manejo y control del riesgo de
> coronavirus-COVID-19 en establecimientos penitenciarios y carcelarios.”*

**Alcance verificado:** esta norma no es de la DIAN y no regula facturación
electrónica. Se incorpora a este anexo como registro de la cita y para evitar un
error material; no se usa como fundamento del módulo DIAN. Si la sociedad quiso
citar otra resolución, debe sustituirse por el número y título correctos.

### 7.2 Norma DIAN aplicable a facturación electrónica

Para el módulo DIAN, la referencia vigente que debe validar el contador/PTE es:

> **Resolución 000165 de 2023** (1 de noviembre de 2023), **Dirección de
> Impuestos y Aduanas Nacionales**, Diario Oficial No. 52.567 del 2 de noviembre
> de 2023, *“Por la cual se desarrolla el sistema de facturación, los proveedores
> tecnológicos, se adopta la Versión 1.9 del Anexo Técnico de Factura Electrónica
> de Venta, se expide el Anexo Técnico 1.0 del documento equivalente electrónico,
> y se dictan otras disposiciones en materia del sistema de facturación.”*

Esta resolución y sus modificaciones son la base técnica del modelo `Invoice`
(CUFE/CUDE, XML/PDF, validación previa y proveedor tecnológico). Su fundamento
legal está en el Estatuto Tributario (arts. 616-1 y 617) y en la Ley 527 de 1999
para mensajes de datos y firma electrónica. La referencia se verificó en octubre
de 2026; la implementación debe fijar la versión del anexo técnico aplicable al
momento del despliegue.

### 7.3 Alcance del anexo

- **Naturaleza del documento.** Este anexo es técnico y estratégico; no sustituye
  la revisión de un abogado corporativo, un contador o un revisor fiscal. La
  instrumentación del aporte, la emisión de acciones, el vesting, la reversión y
  la aceleración deben quedar en el pacto de accionistas y en los estatutos.
- **Ley 1258 de 2008 (SAS).** La estructura de capital, los aportes, la valoración
  y las mayorías se rigen por la ley y los estatutos; validar el procedimiento de
  emisión y capitalización.
- **Ley 1581 de 2012 (Habeas Data).** Aviso de privacidad, autorización previa,
  finalidad, retención, seguridad, atención de titulares y registro de bases de
  datos cuando aplique. Sus decretos reglamentarios están compilados en el
  Decreto 1074 de 2015 (DUR del Sector Comercio, Industria y Turismo).
- **DIAN.** La facturación electrónica exige habilitación como software propio o
  contrato con proveedor tecnológico autorizado, cumplimiento de la resolución
  vigente y de sus anexos técnicos, y conservación de XML/PDF. Validar con el
  contador y el PTE.
- **RNT (Ley 300 de 1996, art. 61, modificado por la Ley 1101 de 2006 y la
  Ley 1558 de 2012).** Mantener el Registro Nacional de Turismo vigente y
  visible; su vencimiento es un riesgo operativo y reputacional.
- **Protección al consumidor (Ley 1480 de 2011).** Información veraz, precios
  claros, condiciones de cancelación y reversión del pago; revisar con abogado.
- **Seguridad de pagos.** No almacenar datos de tarjeta; usar checkout alojado o
  tokenización; delimitar el alcance PCI DSS.
- **IA.** Ser transparente sobre el uso de IA, no usar datos sensibles, permitir
  escalamiento humano y verificar los términos de tratamiento del proveedor del
  modelo.

### 7.4 Fuentes de verificación

Citas consultadas y verificadas en octubre de 2026, con enlace a la fuente
oficial o al repositorio normativo institucional:

| Norma | Fuente |
| --- | --- |
| Resolución 313 de 2021 (MinSalud) | [Sisjur Bogotá](https://sisjur.bogotajuridica.gov.co/sisjur/normas/Norma1.jsp?i=108751) |
| Resolución 000165 de 2023 (DIAN) | [Normograma DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm) · [PDF oficial](https://www.dian.gov.co/normatividad/Normatividad/Resoluci%C3%B3n%20000165%20de%2001-11-2023.pdf) |
| Ley 1258 de 2008 (SAS) | [Gestor Normativo — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=34130) |
| Ley 1581 de 2012 (Habeas Data) | [Gestor Normativo — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981) |
| Ley 300 de 1996 (turismo, art. 61) | [Gestor Normativo — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8634) |
| Ley 1101 de 2006 (modifica Ley 300) | [Compilación DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1101_2006.htm) |
| Ley 1480 de 2011 (Estatuto del Consumidor) | [Gestor Normativo — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306) |

Las citas de leyes se mantienen sin fecha ni número de Diario Oficial en el
cuerpo del anexo; la identificación completa se consulta en estas fuentes. Si el
revisor fiscal o el abogado corporativo identifican una norma posterior que
modifique alguna de las anteriores, debe actualizarse esta tabla antes de la
firma.
