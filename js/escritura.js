/**
 * Texto que se escribe a mano · Escuela Primaria Rafael Ramírez · Ruta: js/escritura.js
 * Dibuja "Escuela Rafael Ramírez" en la placa de la puerta, letra por letra:
 * primero el contorno dorado y luego se rellena. Solo SVG + CSS, sin librerías.
 * No cambia nada más: si no encuentra la placa, no hace nada.
 */
(function(){
  'use strict';
  var h1 = document.querySelector('#puerta .placa h1');
  if (!h1) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var texto = (h1.textContent || '').replace(/\s+/g, ' ').trim();
  if (!texto) return;

  function esc(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Dos renglones: la primera palabra arriba y el resto abajo
  var corte = texto.indexOf(' ');
  var lineas = (texto.length > 14 && corte > 0) ? [texto.slice(0, corte), texto.slice(corte + 1)] : [texto];

  var estilo = document.createElement('style');
  estilo.textContent =
    '.esc-svg{display:block;width:100%;height:auto;overflow:visible}' +
    '.esc-txt{font-family:Schoolbell,"Comic Sans MS",cursive;text-anchor:middle}' +
    '.esc-l{fill:transparent;stroke:#F3C442;stroke-width:1.3;stroke-linejoin:round;stroke-dasharray:300;stroke-dashoffset:300;' +
      'animation:escDibujar .9s ease forwards,escRellenar .5s ease forwards;' +
      'animation-delay:calc(var(--i) * .09s + .3s),calc(var(--i) * .09s + .95s)}' +
    '@keyframes escDibujar{to{stroke-dashoffset:0}}' +
    '@keyframes escRellenar{to{fill:#FFF8D6;stroke-width:.5}}';
  document.head.appendChild(estilo);

  function construir(){
    var i = 0, y = 0, partes = [];
    lineas.forEach(function(linea, n){
      var tam = n === 0 ? 44 : 32;
      y += n === 0 ? 40 : 46;
      var letras = linea.split('').map(function(c){
        return c === ' ' ? ' ' : '<tspan class="esc-l" style="--i:' + (i++) + '">' + esc(c) + '</tspan>';
      }).join('');
      partes.push('<text class="esc-txt" x="160" y="' + y + '" font-size="' + tam + '">' + letras + '</text>');
    });
    var alto = y + 14;
    h1.setAttribute('aria-label', texto);
    h1.innerHTML = '<svg class="esc-svg" viewBox="0 0 320 ' + alto + '" aria-hidden="true" focusable="false">' + partes.join('') + '</svg>';
  }

  // Espera un momento a que cargue la letra de pizarrón; si tarda, sigue con la de respaldo
  var listo = false;
  function iniciar(){ if (listo) return; listo = true; construir(); }
  if (document.fonts && document.fonts.load){
    document.fonts.load('32px Schoolbell').then(iniciar, iniciar);
    setTimeout(iniciar, 900);
  } else { iniciar(); }
})();
