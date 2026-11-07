/**
 * Pantalla de carga con hámster · Escuela Primaria Rafael Ramírez · Ruta: js/ambiente.js
 * Se muestra unos segundos mientras llegan los datos del Sheets (alumnos y avisos).
 * Mínimo 3 segundos; máximo 9 por si el internet va lento (la web sigue funcionando igual).
 */
(function(){
  'use strict';
  var el = document.getElementById('cargando');
  if (!el) return;
  var MIN = 3000, MAX = 9000, t0 = Date.now(), cerrado = false;
  document.documentElement.classList.add('cargando-bloq');

  function datosListos(){
    var a = document.getElementById('alumno');
    var v = document.getElementById('avisosLista');
    var alumnos = !!a && a.options.length > 1;
    var avisos = !!v && v.textContent.trim() !== '' && !/cargando/i.test(v.textContent);
    return alumnos || avisos;
  }
  function cerrar(){
    if (cerrado) return;
    cerrado = true;
    el.classList.add('fuera');
    document.documentElement.classList.remove('cargando-bloq');
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }
  (function ciclo(){
    var t = Date.now() - t0;
    if ((t >= MIN && datosListos()) || t >= MAX) cerrar();
    else setTimeout(ciclo, 200);
  })();
})();
