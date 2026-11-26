-- Dinero exacto: double precision -> numeric(12,2)
--
-- Los seis campos representan COP. Con FLOAT la suma de precios y la conciliación
-- de pagos arrastran error binario (0.1 + 0.2 != 0.3), inadmisible frente a la
-- facturación DIAN.
--
-- El cast desde double precision aborta si la columna guarda NaN/Infinity o un
-- valor que no cabe en numeric(12,2). Se comprueban antes de alterar para que el
-- error nombre la tabla, la columna y las filas afectadas.

DO $$
DECLARE
  r      RECORD;
  n_nan  BIGINT;
  n_big  BIGINT;
  falta  BOOLEAN;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('Propiedad',       'precioNoche'),
      ('Advertisement',   'pagoTotal'),
      ('Reserva',         'total'),
      ('ProyectoDonacion','meta'),
      ('Donacion',        'monto'),
      ('Plato',           'precio')
    ) AS t(tbl, col)
  LOOP
    -- Esta comprobación es diagnóstica: si la tabla no está, el ALTER correspondiente
    -- dará el error real. No conviene que el prechequeo opaque ese mensaje.
    EXECUTE 'SELECT to_regclass($1) IS NULL' INTO falta USING r.tbl;
    IF falta THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM %I WHERE %I::text IN (''NaN'', ''Infinity'', ''-Infinity'')',
      r.tbl, r.col
    ) INTO n_nan;

    EXECUTE format(
      'SELECT count(*) FROM %I WHERE %I IS NOT NULL AND abs(%I) >= 10000000000',
      r.tbl, r.col, r.col
    ) INTO n_big;

    IF n_nan > 0 OR n_big > 0 THEN
      RAISE EXCEPTION
        'No se puede convertir %.% a numeric(12,2): % valor(es) NaN/Infinity y % fuera de rango. Sanquelos antes de migrar.',
        r.tbl, r.col, n_nan, n_big;
    END IF;
  END LOOP;
END $$;

-- round(.., 2) deja explícito que los decimales sobrantes del float se ajustan
-- ahora, de forma controlada, y no de forma silenciosa en la primera escritura.
ALTER TABLE "Propiedad"        ALTER COLUMN "precioNoche" TYPE numeric(12,2) USING round("precioNoche"::numeric, 2);
ALTER TABLE "Advertisement"    ALTER COLUMN "pagoTotal"   TYPE numeric(12,2) USING round("pagoTotal"::numeric, 2);
ALTER TABLE "Reserva"          ALTER COLUMN "total"       TYPE numeric(12,2) USING round("total"::numeric, 2);
ALTER TABLE "ProyectoDonacion" ALTER COLUMN "meta"        TYPE numeric(12,2) USING round("meta"::numeric, 2);
ALTER TABLE "Donacion"         ALTER COLUMN "monto"       TYPE numeric(12,2) USING round("monto"::numeric, 2);
ALTER TABLE "Plato"            ALTER COLUMN "precio"      TYPE numeric(12,2) USING round("precio"::numeric, 2);
