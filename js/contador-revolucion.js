/* CONTADOR REVOLUCIÓN MEXICANA · Escuela Primaria Rafael Ramírez
   Fecha del evento: 20 de noviembre de 2026, 08:30 (Ciudad de México).
   Inicio de progreso compartido: 7 de noviembre de 2026, 00:00 (UTC-6). */

(() => {
  "use strict";

  const tarjeta = document.getElementById("contador-revolucion");
  if (!tarjeta || tarjeta.dataset.inicializado === "true") return;
  tarjeta.dataset.inicializado = "true";

  const destino = new Date("2026-11-20T08:30:00-06:00").getTime();
  const inicio = new Date("2026-11-07T00:00:00-06:00").getTime();

  const tren = tarjeta.querySelector("#rev-tren");
  const zona = tarjeta.querySelector(".rev-tren-zona");
  const via = tarjeta.querySelector("#rev-via-progreso");
  const finalizado = tarjeta.querySelector("#rev-finalizado");

  const salida = {
    dias: tarjeta.querySelector("#rev-dias"),
    horas: tarjeta.querySelector("#rev-horas"),
    minutos: tarjeta.querySelector("#rev-minutos"),
    segundos: tarjeta.querySelector("#rev-segundos")
  };

  const dosDigitos = valor => String(valor).padStart(2, "0");
  let intervalo = null;

  function actualizar() {
    const ahora = Date.now();
    const duracion = destino - inicio;
    const transcurrido = Math.max(0, Math.min(duracion, ahora - inicio));
    const porcentaje = duracion > 0 ? transcurrido / duracion : 1;
    const porcentajeSeguro = Math.max(0, Math.min(1, porcentaje));

    const recorrido = Math.max(0, zona.clientWidth - tren.offsetWidth);
    const posicion = recorrido * porcentajeSeguro;

    tren.style.transform = "translate3d(" + posicion + "px,0,0)";
    via.style.width = (porcentajeSeguro * 100) + "%";

    const restante = Math.max(0, destino - ahora);
    const total = Math.floor(restante / 1000);

    const valores = {
      dias: Math.floor(total / 86400),
      horas: Math.floor((total % 86400) / 3600),
      minutos: Math.floor((total % 3600) / 60),
      segundos: total % 60
    };

    Object.keys(valores).forEach(unidad => {
      salida[unidad].textContent = dosDigitos(valores[unidad]);
    });

    if (ahora >= destino) {
      via.style.width = "100%";
      tren.style.transform = "translate3d(" + recorrido + "px,0,0)";
      finalizado.hidden = false;
      finalizado.textContent = "¡Ha llegado el día de nuestra celebración!";
      if (intervalo !== null) {
        clearInterval(intervalo);
        intervalo = null;
      }
    }
  }

  actualizar();
  intervalo = setInterval(actualizar, 1000);
  window.addEventListener("resize", actualizar, { passive: true });
})();
