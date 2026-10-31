"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

export interface PagoPaypal {
  /** La moneda del SDK se fija al cargar el script: cambiarla exige remontar. */
  moneda: string;
  /** Cambiar esta clave vuelve a pintar el botón (otra casilla, otro pedido). */
  clave: string;
  /** Se llama en el clic del donante: debe devolver el id de la orden ya creada. */
  crearOrden: () => Promise<string>;
  alAprobar: (orderId: string) => Promise<void> | void;
  alCancelar: () => void;
  alError: () => void;
}

/**
 * El botón de PayPal: trae el client id público, carga el SDK una vez y lo pinta
 * en el div que devuelve. Los callbacks se leen siempre vigentes, así que el
 * formulario puede cambiar sin repintar el botón con cada tecleo.
 */
export function usarPagoPaypal({ moneda, clave, crearOrden, alAprobar, alCancelar, alError }: PagoPaypal) {
  const [clientId, setClientId] = useState("");
  const [sinBoton, setSinBoton] = useState(false);
  const [sdkListo, setSdkListo] = useState(false);
  const [reintento, setReintento] = useState(0);
  const boton = useRef<HTMLDivElement>(null);
  const sdk = useRef(false);
  const vivos = useRef({ crearOrden, alAprobar, alCancelar, alError });
  vivos.current = { crearOrden, alAprobar, alCancelar, alError };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/donaciones/paypal-public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const id = d?.clientId || "";
        setClientId(id);
        // Sin client id no hay botón que cargar: mejor decirlo que girar para siempre.
        if (!id) setSinBoton(true);
      })
      .catch(() => setSinBoton(true));
  }, [reintento]);

  useEffect(() => {
    if (!clientId || sdk.current) return;
    sdk.current = true;
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${moneda}&intent=capture`;
    s.onload = () => (window.paypal ? setSdkListo(true) : setSinBoton(true));
    s.onerror = () => setSinBoton(true);
    document.body.appendChild(s);
    return () => s.remove();
  }, [clientId, moneda, reintento]);

  useEffect(() => {
    if (!sdkListo || !boton.current) return;
    const cont = boton.current;
    cont.innerHTML = "";
    window.paypal!
      .Buttons({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "donate" },
        createOrder: () => vivos.current.crearOrden(),
        onApprove: (data: any) => vivos.current.alAprobar(data.orderID),
        onCancel: () => vivos.current.alCancelar(),
        onError: () => vivos.current.alError(),
      })
      .render(cont)
      .catch(() => setSinBoton(true));
  }, [sdkListo, clave, sinBoton]);

  const reintentar = () => {
    sdk.current = false;
    setSinBoton(false);
    setReintento((n) => n + 1);
  };

  return { boton, clientId, sinBoton, reintentar };
}
