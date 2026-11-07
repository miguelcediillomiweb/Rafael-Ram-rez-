/**
 * Autorización y avatar con foto · Escuela Primaria Rafael Ramírez · Ruta: js/autorizacion-foto.js
 * UN SOLO ARCHIVO que se engancha a la página actual, sin reemplazar index.html ni escuela.js:
 *  - Cuando un niño entra con su fecha de nacimiento, la PRIMERA vez pide permiso al padre (ventana emergente).
 *  - Sí: cámara en vivo, 3-2-1, flash y obturador, la camarita imprime la tarjeta y la foto se vuelve caricatura
 *    dentro del teléfono (la foto original se borra; solo queda la caricatura en ese dispositivo).
 *  - No: imagen genérica de niño o niña.
 *  - Quita el botón y la ventana viejos de "Perfil familiar" / "Elegir imagen".
 * Si ya está cargado perfil.js (versión nueva de la web), este archivo no hace nada.
 */
(function(){
  'use strict';
  if (window.Perfil) return;

/**
 * Perfil del alumno · Escuela Primaria Rafael Ramírez
 * Avatar de caricatura creado en el teléfono del padre. Ruta: js/perfil.js
 * - La foto original NUNCA se guarda ni se envía: se convierte en dibujo en el
 *   propio teléfono y se borra al instante.
 * - Solo se conserva la caricatura, en este dispositivo (localStorage).
 */
(function(){
  'use strict';

  var TAM = 256;
  var K_AV = 'ra_avatar_', K_MODO = 'ra_modo_';
  var ctxA = null, modal = null, stream = null, facing = 'user', audio = null, tmrs = [];

  function $(s){ return document.querySelector(s); }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function leer(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function guardar(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }
  function borrar(k){ try{ localStorage.removeItem(k); }catch(e){} }
  function later(fn, ms){ var t = setTimeout(fn, ms); tmrs.push(t); return t; }
  function limpiarTimers(){ tmrs.forEach(clearTimeout); tmrs = []; }

  /* ---------- Navegadores incrustados (WhatsApp, Facebook...) ---------- */
  var UA = navigator.userAgent || '';
  var enApp = /FBAN|FBAV|Instagram|Messenger|MicroMessenger|Snapchat|TikTok|; wv\)|WhatsApp/i.test(UA);
  var esAndroid = /Android/i.test(UA);

  function avisoNavegador(){
    if (!enApp) return;
    var cerrado = false;
    try{ cerrado = sessionStorage.getItem('ra_nav_aviso') === '1'; }catch(e){}
    if (cerrado) return;
    var d = document.createElement('div');
    d.className = 'nav-aviso';
    var intent = 'intent://' + location.host + location.pathname + location.search +
      '#Intent;scheme=https;package=com.android.chrome;end';
    d.innerHTML = '<span>📸🔔 Para que funcionen la cámara y las notificaciones, abre esta página en <b>Chrome</b> o <b>Safari</b>.' +
      (esAndroid ? '' : ' Toca el icono de compartir y elige «Abrir en Safari».') + '</span>' +
      (esAndroid ? '<a class="btn-dorado" href="' + esc(intent) + '">Abrir en Chrome</a>' : '') +
      '<button type="button" class="btn-dorado" data-a="copiar">Copiar enlace</button>' +
      '<button type="button" class="btn-salir" data-a="x" aria-label="Cerrar aviso">✖</button>';
    d.addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'x'){ d.remove(); try{ sessionStorage.setItem('ra_nav_aviso', '1'); }catch(e){} }
      if (b.dataset.a === 'copiar'){
        try{ navigator.clipboard.writeText(location.href); b.textContent = '¡Copiado!'; }catch(e){ b.textContent = 'Copia desde la barra'; }
      }
    });
    document.body.insertBefore(d, document.body.firstChild);
  }

  /* ---------- Sonidos (sin archivos, con Web Audio) ---------- */
  function ac(){
    try{
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      if (!audio) audio = new A();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    }catch(e){ return null; }
  }
  function ruido(t0, dur, freq, vol){
    var a = ac(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = a.createBufferSource(); s.buffer = buf;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    var g = a.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t0);
  }
  function obturador(){ var a = ac(); if (!a) return; var t = a.currentTime; ruido(t, 0.05, 2600, 0.9); ruido(t + 0.07, 0.07, 1500, 0.8); }
  function pitido(freq){
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.14);
  }
  function motor(){
    var a = ac(); if (!a) return;
    var t = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(95, t + 1.8);
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    o.connect(f); f.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 2);
  }

  /* ---------- Caricatura (todo ocurre en el teléfono) ---------- */
  function desenfocar(d, W, r){
    var tmp = new Uint8ClampedArray(d.length), x, y, c, k, sum, cnt, p;
    for (y = 0; y < W; y++) for (c = 0; c < 3; c++) for (x = 0; x < W; x++){
      sum = 0; cnt = 0;
      for (k = -r; k <= r; k++){ p = x + k; if (p >= 0 && p < W){ sum += d[(y * W + p) * 4 + c]; cnt++; } }
      tmp[(y * W + x) * 4 + c] = sum / cnt;
    }
    for (x = 0; x < W; x++) for (c = 0; c < 3; c++) for (y = 0; y < W; y++){
      sum = 0; cnt = 0;
      for (k = -r; k <= r; k++){ p = y + k; if (p >= 0 && p < W){ sum += tmp[(p * W + x) * 4 + c]; cnt++; } }
      d[(y * W + x) * 4 + c] = sum / cnt;
    }
  }
  function caricaturizar(d, W){
    var N = W * W, L = new Float32Array(N), borde = new Uint8Array(N), i, x, y, c;
    desenfocar(d, W, 2); desenfocar(d, W, 2);
    for (i = 0; i < N; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    for (y = 1; y < W - 1; y++) for (x = 1; x < W - 1; x++){
      i = y * W + x;
      var gx = -L[i - W - 1] - 2 * L[i - 1] - L[i + W - 1] + L[i - W + 1] + 2 * L[i + 1] + L[i + W + 1];
      var gy = -L[i - W - 1] - 2 * L[i - W] - L[i - W + 1] + L[i + W - 1] + 2 * L[i + W] + L[i + W + 1];
      if (Math.sqrt(gx * gx + gy * gy) > 60) borde[i] = 1;
    }
    var niveles = 5, paso = 255 / (niveles - 1);
    for (i = 0; i < N; i++){
      var o = i * 4;
      if (borde[i]){ d[o] = 30; d[o + 1] = 30; d[o + 2] = 52; d[o + 3] = 255; continue; }
      var gris = L[i];
      for (c = 0; c < 3; c++){
        var v = d[o + c];
        v = gris + (v - gris) * 1.45;
        v = (v - 128) * 1.12 + 128 + 6;
        v = v < 0 ? 0 : v > 255 ? 255 : v;
        d[o + c] = Math.round(v / paso) * paso;
      }
      d[o + 3] = 255;
    }
  }
  function capturar(video){
    var vw = video.videoWidth, vh = video.videoHeight, s = Math.min(vw, vh);
    var c = document.createElement('canvas'); c.width = c.height = TAM;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, TAM, TAM);
    var im = x.getImageData(0, 0, TAM, TAM);
    caricaturizar(im.data, TAM);
    x.putImageData(im, 0, 0);
    var url = c.toDataURL('image/jpeg', 0.85);
    c.width = c.height = 0;               // se borra la foto original de la memoria
    return url;
  }

  /* ---------- Ventana ---------- */
  function abrirModal(){
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'perfilModal';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="pf-card" id="pfCard"></div><div class="pf-flash" id="pfFlash"></div>';
    modal.addEventListener('click', clic);
    document.body.appendChild(modal);
    document.documentElement.classList.add('bloqueado');
  }
  function cerrar(){
    detener(); limpiarTimers();
    if (modal){ modal.remove(); modal = null; }
    document.documentElement.classList.remove('bloqueado');
  }
  function detener(){
    if (stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
    var v = $('#pfVideo'); if (v) v.srcObject = null;
  }
  function pintar(html){ abrirModal(); $('#pfCard').innerHTML = '<button type="button" class="pf-x" data-a="cerrar" aria-label="Cerrar">✖</button>' + html; }

  function pantallaConsentimiento(){
    if (!ctxA) return;
    var aviso = enApp ? '<div class="pf-aviso">⚠️ Estás en un navegador incrustado. Si la cámara no abre, usa <b>Chrome</b> o <b>Safari</b>.</div>' : '';
    pintar(
      '<div class="pf-emoji emo">📸</div>' +
      '<h2>¡Creemos el avatar de ' + esc(ctxA.nombre) + '!</h2>' +
      '<p>Para ofrecer una mejor experiencia, y <b>solo si usted, como madre, padre o tutor, lo autoriza</b>, tomaremos una foto de su hijo(a) con la cámara de su teléfono y la convertiremos en un avatar de caricatura.</p>' +
      '<ul class="pf-lista"><li>🔒 La foto original <b>no se guarda ni se envía</b>: se convierte en dibujo en este teléfono y se borra al instante.</li>' +
      '<li>🖼️ Solo se conserva la caricatura, en este dispositivo.</li>' +
      '<li>🙂 Si prefiere no hacerlo, usaremos una imagen genérica.</li></ul>' + aviso +
      '<button type="button" class="pf-btn si" data-a="si">📸 Sí, autorizo tomar la foto</button>' +
      '<button type="button" class="pf-btn no" data-a="no">No, usar imagen genérica</button>'
    );
  }
  function pantallaGestion(){
    pintar(
      '<div class="pf-emoji emo">🖼️</div><h2>Avatar de ' + esc(ctxA.nombre) + '</h2>' +
      '<p>¿Qué desea hacer?</p>' +
      '<button type="button" class="pf-btn si" data-a="si">📸 Crear un avatar nuevo</button>' +
      '<button type="button" class="pf-btn no" data-a="quitar">🗑️ Quitar el avatar y usar la imagen genérica</button>'
    );
  }
  function pantallaCamara(){
    pintar(
      '<h2>¡Sonríe! 😄</h2><p>Coloca al niño o niña en el cuadro y toca el botón.</p>' +
      '<div class="visor-foto"><video id="pfVideo" playsinline muted autoplay></video><div id="pfCuenta"></div></div>' +
      '<p class="pf-msg" id="pfMsg"></p>' +
      '<div class="pf-controles"><button type="button" class="disparo" id="pfDisparo" data-a="disparo" aria-label="Tomar foto"></button></div>' +
      '<button type="button" class="pf-link" data-a="voltear">🔄 Cambiar cámara</button>'
    );
    iniciarCamara();
  }
  function errorCamara(txt){
    var m = $('#pfMsg'); if (!m) return;
    m.innerHTML = esc(txt) + '<br><button type="button" class="pf-link" data-a="reintentar">🔁 Reintentar</button>' +
      ' · <button type="button" class="pf-link" data-a="no">Usar imagen genérica</button>';
  }
  function iniciarCamara(){
    detener();
    var v = $('#pfVideo');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      errorCamara('Este navegador no permite usar la cámara. Abre la página en Chrome o Safari.'); return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 960 } }, audio: false })
      .then(function(s){
        if (!modal){ s.getTracks().forEach(function(t){ t.stop(); }); return; }
        stream = s; v.srcObject = s;
        v.classList.toggle('espejo', facing === 'user');
        var p = v.play(); if (p && p.catch) p.catch(function(){});
      })
      .catch(function(e){
        var n = e && e.name;
        if (n === 'NotFoundError' || n === 'OverconstrainedError')
          errorCamara('No encontramos una cámara en este dispositivo.');
        else if (n === 'NotReadableError')
          errorCamara('La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.');
        else
          errorCamara('El teléfono no dejó abrir la cámara. Si aparece el aviso «superposición de pantalla», cierra las burbujas o ventanas flotantes (Messenger, WhatsApp, filtro de luz azul), toca Reintentar y elige «Permitir».');
      });
  }
  function disparar(){
    var v = $('#pfVideo'), b = $('#pfDisparo');
    if (!stream || !v || !v.videoWidth || !b || b.disabled) return;
    b.disabled = true;
    var n = 3, c = $('#pfCuenta');
    (function paso(){
      if (n > 0){
        c.textContent = n; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
        pitido(660); n--; later(paso, 850);
      } else { c.textContent = ''; foto(); }
    })();
  }
  function foto(){
    var v = $('#pfVideo'), url, f = $('#pfFlash');
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    obturador();
    try{ if (navigator.vibrate) navigator.vibrate(40); }catch(e){}
    try{ url = capturar(v); }catch(e){ errorCamara('No se pudo tomar la foto. Intenta de nuevo.'); var b = $('#pfDisparo'); if (b) b.disabled = false; return; }
    detener();
    later(function(){ pantallaResultado(url); }, 450);
  }
  function escribir(el, txt){
    var i = 0;
    (function t(){ if (!el.isConnected) return; el.textContent = txt.slice(0, ++i); if (i < txt.length) later(t, 70); })();
  }
  function pantallaResultado(url){
    pintar(
      '<h2>¡Tu avatar! 🎉</h2>' +
      '<div class="cam"><div class="tarjeta-foto" id="pfTarjeta"><div class="foto-box"><img id="pfImg" src="' + url + '" alt="Avatar de caricatura"></div><div class="nombre-foto" id="pfNombre"></div></div>' +
      '<svg class="cam-cuerpo" viewBox="0 0 280 150" aria-hidden="true">' +
      '<rect x="0" y="0" width="280" height="150" rx="26" fill="#6EA6E6"/><rect x="0" y="0" width="280" height="150" rx="26" fill="none" stroke="#4F86C6" stroke-width="3"/>' +
      '<rect x="62" y="6" width="156" height="12" rx="6" fill="#2E4A7A"/>' +
      '<rect x="24" y="36" width="40" height="28" rx="6" fill="#FFF6D6" stroke="#E8D9AE" stroke-width="2"/>' +
      '<circle cx="236" cy="40" r="10" fill="#F3E6CF" stroke="#E8D9AE" stroke-width="2"/>' +
      '<circle cx="140" cy="88" r="46" fill="#F3E6CF"/><circle cx="140" cy="88" r="36" fill="#2B3A55"/><circle cx="140" cy="88" r="24" fill="#0E1626"/>' +
      '<circle cx="130" cy="78" r="6" fill="#fff" opacity=".85"/><circle cx="152" cy="100" r="3" fill="#fff" opacity=".5"/>' +
      '<path d="M226 112c-6-8-16-2-9 7l9 9 9-9c7-9-3-15-9-7z" fill="#4F86C6"/></svg></div>' +
      '<div class="pf-final" id="pfFinal" hidden>' +
      '<button type="button" class="pf-btn si" data-a="usar">✅ Usar este avatar</button>' +
      '<button type="button" class="pf-btn no" data-a="repetir">🔄 Repetir la foto</button></div>'
    );
    modal._url = url;
    later(function(){ motor(); $('#pfTarjeta').classList.add('imprime'); }, 250);
    later(function(){ $('#pfTarjeta').classList.add('revelada'); }, 1500);
    later(function(){ escribir($('#pfNombre'), ctxA.nombre); }, 3000);
    later(function(){ var f = $('#pfFinal'); if (f) f.hidden = false; }, 3600);
  }
  function usar(){
    var url = modal && modal._url; if (!url) return;
    guardar(K_AV + ctxA.id, url); guardar(K_MODO + ctxA.id, 'foto');
    var cb = ctxA.cb; cerrar(); if (cb) cb(url);
    var av = document.getElementById('avatarAlumno');
    if (av){ av.classList.remove('nuevo'); void av.offsetWidth; av.classList.add('nuevo'); }
  }
  function generico(){
    borrar(K_AV + ctxA.id); guardar(K_MODO + ctxA.id, 'generico');
    var cb = ctxA.cb; cerrar(); if (cb) cb('');
  }
  function clic(ev){
    var b = ev.target.closest('[data-a]'); if (!b || !ctxA) return;
    var a = b.dataset.a;
    if (a === 'cerrar') cerrar();
    else if (a === 'si'){ ac(); pantallaCamara(); }
    else if (a === 'no' || a === 'quitar') generico();
    else if (a === 'disparo') disparar();
    else if (a === 'voltear'){ facing = facing === 'user' ? 'environment' : 'user'; iniciarCamara(); }
    else if (a === 'repetir') pantallaCamara();
    else if (a === 'reintentar'){ var m = $('#pfMsg'); if (m) m.textContent = ''; iniciarCamara(); }
    else if (a === 'usar') usar();
  }

  /* ---------- API pública ---------- */
  window.Perfil = {
    obtener: function(id){ return leer(K_AV + id); },
    iniciar: function(id, nombre, cb){
      ctxA = { id: id, nombre: nombre, cb: cb };
      if (!leer(K_MODO + id)) later(pantallaConsentimiento, 700);   // solo la primera vez
    },
    reabrir: function(){
      if (!ctxA) return;
      if (leer(K_AV + ctxA.id)) pantallaGestion(); else pantallaConsentimiento();
    }
  };
  var btn = document.getElementById('btnAvatar');
  if (btn) btn.addEventListener('click', function(){ window.Perfil.reabrir(); });
  avisoNavegador();

  if (typeof module !== 'undefined') module.exports = { caricaturizar: caricaturizar };
})();


  /* ---------- Enganche a la página actual ---------- */
  (function(){
    var P = window.Perfil; if (!P) return;
    function norm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    /* Avatares del alumno */
const NINAS = ('maria ana sofia valentina camila isabella isabel ximena regina fernanda daniela victoria andrea paola mariana renata natalia jimena diana karla carla abigail alexa ariana ashley brenda citlali dulce emily evelyn fatima frida guadalupe itzel jennifer julia karen kimberly lucia nina luna melany mia michelle miranda nicole paulina romina samantha sara sarah vanessa yaretzi zoe aranza naomi scarlett monserrat montserrat lizbeth leslie jazmin ivanna ines gabriela estefania elizabeth dana cristina claudia angela alejandra aylin ailyn keila nayeli perla rosa lupita kenia britany brithany atziri luz marisol yoselin yesenia viridiana tania teresa sandra patricia olivia noemi nancy mayte lilian liliana laura lesly jessica jazmine ingrid helena giselle fabiola esmeralda erika elena dayana danna cynthia constanza celeste catalina bianca berenice ariadna arely angelica amairani alma alicia aline alison adriana').split(' ');
const NINOS = ('juan nino jose luis carlos miguel angel diego daniel david jesus santiago mateo sebastian emiliano leonardo alejandro fernando gael ian iker jorge javier kevin axel adrian bruno christian cristian dylan eduardo erick erik ethan ivan joaquin jonathan julian liam lucas manuel marco mario mauricio max nicolas oscar pablo pedro rafael ricardo roberto rodrigo samuel tadeo thiago victor yahir yael uriel aaron abraham alan alexis andres antonio armando brandon cesar damian dario edgar elias enrique francisco gerardo gustavo hugo isaac jaime jair josue kenneth lorenzo marcos martin matias noe omar orlando raul ruben saul sergio valentino vicente benjamin bryan carlo emmanuel esteban felipe gabriel gonzalo guillermo ismael jacobo jeremy johan leandro lionel marcelo maximiliano moises nestor patricio ramon santino tomas ulises wilson zaid').split(' ');

function generoDe(d){
  const g = norm(d.sexo || d.genero || d.sex || '');
  if (g){
    if (/^(f|nina|mujer)/.test(g)) return 'f';
    if (/^(m|h|nino|hombre)/.test(g)) return 'm';
  }
  const toks = norm(d.nombre).split(/\s+/);
  for (const t of toks){
    if (NINAS.indexOf(t) > -1) return 'f';
    if (NINOS.indexOf(t) > -1) return 'm';
  }
  return '';
}
const OJOS = '<ellipse class="ojo" cx="51" cy="57" rx="3" ry="3.4" fill="#2B2B2B"/><ellipse class="ojo" cx="69" cy="57" rx="3" ry="3.4" fill="#2B2B2B"/>';
const CARA = OJOS + '<path d="M51 67q9 9 18 0" stroke="#B5533C" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="44" cy="64" r="4" fill="#F4A6A0" opacity=".65"/><circle cx="76" cy="64" r="4" fill="#F4A6A0" opacity=".65"/>';
const SVG_NINO = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="#DCEBFF"/><path d="M26 120c0-24 15-36 34-36s34 12 34 36z" fill="#1F4591"/><rect x="50" y="74" width="20" height="14" rx="6" fill="#F2C29B"/><circle cx="60" cy="54" r="24" fill="#F7CFAA"/><path d="M35 54c-2-20 11-30 25-30s27 10 25 30c-5-9-14-13-25-13s-20 4-25 13z" fill="#3B2A1E"/>' + CARA + '</svg>';
const SVG_NINA = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="#FFE4EE"/><circle cx="32" cy="66" r="10" fill="#5A3420"/><circle cx="88" cy="66" r="10" fill="#5A3420"/><path d="M26 120c0-24 15-36 34-36s34 12 34 36z" fill="#D9577F"/><rect x="50" y="74" width="20" height="14" rx="6" fill="#F2C29B"/><circle cx="60" cy="54" r="24" fill="#F7CFAA"/><path d="M34 56c-3-22 11-33 26-33s29 11 26 33c-3-9-8-15-14-17-8 6-22 6-30 2-4 3-6 8-8 15z" fill="#5A3420"/><circle cx="36" cy="44" r="5" fill="#F3C442"/><circle cx="84" cy="44" r="5" fill="#F3C442"/>' + CARA + '</svg>';
function avatar(d){
  const g = generoDe(d);
  return g === 'f' ? SVG_NINA : g === 'm' ? SVG_NINO : '<span class="grande emo">🧒</span>';
}


    var estilo = document.createElement('style'); estilo.textContent = "#perfilModal,.nav-aviso,.fx-card{--navy:#0B1B3D;--navy-blue:#1F4591;--gold:#D4AF37;--gold-light:#FFF6D6;--blue-soft:#EBF3FC;--slate-100:#F1F5F9;--slate-200:#E2E8F0;--slate-300:#CBD5E1;--slate-700:#334155;--font-head:Outfit,system-ui,sans-serif;--font-body:\"Plus Jakarta Sans\",system-ui,sans-serif;--font-chalk:Schoolbell,cursive;--radius-sm:8px;--radius-md:12px;--radius-lg:18px;--radius-xl:24px}\n/* ===== PERFIL: AVATAR CON CÁMARA ===== */\n.nav-aviso{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;background:var(--gold-light);color:var(--navy);border-bottom:2px solid var(--gold);padding:10px 14px;font-size:.85rem;font-weight:600;text-align:center}\n.nav-aviso .btn-dorado{font-size:.8rem;padding:6px 12px}\n\n#perfilModal{position:fixed;inset:0;z-index:9800;display:flex;padding:14px;background:radial-gradient(circle at 50% 15%,rgba(31,69,145,.97),rgba(7,19,43,.99));overflow-y:auto;-webkit-overflow-scrolling:touch}\n.pf-card{position:relative;width:min(100%,420px);margin:auto;background:#fff;border:2px solid var(--gold);border-radius:var(--radius-xl);padding:28px 20px 22px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.5)}\n.pf-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border:none;border-radius:50%;background:var(--slate-100);color:var(--navy);font-size:.95rem;cursor:pointer}\n.pf-card h2{font-family:var(--font-head);font-size:1.35rem;color:var(--navy);margin:0 0 8px;line-height:1.25}\n.pf-card p{font-size:.92rem;color:var(--slate-700);margin:8px 0}\n.pf-emoji{font-size:2.6rem;line-height:1.2}\n.pf-lista{list-style:none;padding:0;margin:12px 0;text-align:left;font-size:.85rem;color:var(--slate-700)}\n.pf-lista li{margin:7px 0;padding:8px 10px;background:var(--blue-soft);border-radius:var(--radius-sm)}\n.pf-aviso{margin:10px 0;padding:8px 10px;border-radius:var(--radius-sm);background:var(--gold-light);border:1px solid rgba(212,175,55,.5);font-size:.82rem;color:#7D4924}\n.pf-btn{display:block;width:100%;margin-top:10px;padding:13px 16px;border-radius:var(--radius-md);font-family:var(--font-body);font-weight:800;font-size:.98rem;cursor:pointer;border:2px solid transparent}\n.pf-btn.si{background:linear-gradient(135deg,#F3C442 0%,var(--gold) 100%);color:var(--navy);box-shadow:0 6px 18px rgba(212,175,55,.45)}\n.pf-btn.no{background:#fff;color:var(--navy);border-color:var(--slate-300)}\n.pf-link{background:none;border:none;color:var(--navy-blue);font-weight:700;font-size:.88rem;text-decoration:underline;cursor:pointer;margin-top:6px}\n.pf-msg{min-height:1.2em;color:#B91C1C;font-size:.85rem;font-weight:600}\n\n.visor-foto{position:relative;width:min(76vw,300px);aspect-ratio:1;margin:10px auto;border-radius:24px;overflow:hidden;background:#0E1626;border:4px solid #6EA6E6;box-shadow:0 8px 24px rgba(11,27,61,.35),inset 0 0 0 2px rgba(255,255,255,.15)}\n.visor-foto video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}\n.visor-foto video.espejo{transform:scaleX(-1)}\n#pfCuenta{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-head);font-weight:800;font-size:6rem;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.6)}\n#pfCuenta.pop{animation:pfCuenta .85s ease-out}\n@keyframes pfCuenta{0%{transform:scale(2);opacity:0}25%{transform:scale(1);opacity:1}100%{transform:scale(.8);opacity:.2}}\n.pf-controles{display:flex;justify-content:center;margin:6px 0}\n.disparo{width:72px;height:72px;border-radius:50%;background:#fff;border:7px solid #6EA6E6;box-shadow:0 0 0 4px #fff,0 6px 16px rgba(0,0,0,.3);cursor:pointer;transition:transform .15s}\n.disparo:active{transform:scale(.9)}\n.disparo:disabled{opacity:.5}\n.pf-flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:9900}\n.pf-flash.on{animation:pfDestello .75s ease-out}\n@keyframes pfDestello{0%{opacity:0}8%{opacity:1}100%{opacity:0}}\n\n.cam{position:relative;width:280px;max-width:100%;height:354px;margin:6px auto 4px;overflow:hidden}\n.cam-cuerpo{position:absolute;left:0;bottom:0;width:100%;height:auto;z-index:3;filter:drop-shadow(0 6px 8px rgba(0,0,0,.25))}\n.tarjeta-foto{position:absolute;left:50%;bottom:130px;width:172px;margin-left:-86px;padding:10px 10px 8px;background:#fff;border:1px solid var(--slate-200);border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:1;transform:translateY(232px)}\n.tarjeta-foto.imprime{animation:pfImprimir 2.6s cubic-bezier(.4,.1,.3,1) forwards}\n@keyframes pfImprimir{0%{transform:translateY(232px)}30%{transform:translateY(160px)}42%{transform:translateY(160px)}75%{transform:translateY(42px)}86%{transform:translateY(42px)}100%{transform:translateY(0)}}\n.foto-box{width:100%;aspect-ratio:1;background:#D9D9D9;overflow:hidden}\n.foto-box img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1) brightness(1.9) contrast(.5) blur(6px);transition:filter 3s ease-out}\n.tarjeta-foto.revelada .foto-box img{filter:none}\n.nombre-foto{min-height:2.5em;margin-top:6px;font-family:var(--font-chalk);font-size:1rem;line-height:1.15;color:var(--navy)}\n\n@media (prefers-reduced-motion:reduce){.tarjeta-foto.imprime{animation-duration:.01s}.foto-box img{transition-duration:.01s}.avatar.nuevo,#pfCuenta.pop,.pf-flash.on{animation-duration:.01s}}\n\n.pf-emoji{display:inline-block;animation:pfRebote 2.4s ease-in-out infinite}\n@keyframes pfRebote{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}\n.nav-aviso .btn-dorado{display:inline-block;background:linear-gradient(135deg,#F3C442,#D4AF37);color:#0B1B3D;font-weight:700;border:none;border-radius:8px;padding:6px 12px;text-decoration:none;cursor:pointer}\n.nav-aviso .btn-salir,.fx-btn{background:none;border:1px solid #CBD5E1;padding:5px 12px;border-radius:8px;font-size:.8rem;cursor:pointer;color:#0B1B3D}\n.fx-card{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;margin:0 0 14px;border-radius:18px;background:linear-gradient(135deg,#EBF3FC 0%,#FFF6D6 100%);border:1px solid rgba(212,175,55,.45);box-shadow:0 4px 16px -2px rgba(11,27,61,.1);font-family:var(--font-body)}\n.fx-avatar{width:92px;height:92px;flex:none;border-radius:50%;overflow:hidden;border:3px solid #D4AF37;background:#DCEBFF;animation:pfFlotar 3s ease-in-out infinite}\n.fx-avatar svg,.fx-avatar img{width:100%;height:100%;display:block;object-fit:cover}\n.fx-avatar .grande{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:3rem}\n.fx-avatar .ojo{transform-box:fill-box;transform-origin:center;animation:pfParpadeo 4s infinite}\n.fx-avatar.nuevo{animation:pfAparecer .7s cubic-bezier(.3,1.6,.5,1),pfFlotar 3s ease-in-out .7s infinite}\n@keyframes pfFlotar{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}\n@keyframes pfParpadeo{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}\n@keyframes pfAparecer{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}\n.fx-texto{flex:1;min-width:150px}\n.fx-pre{margin:0;font-size:.8rem;font-weight:700;color:#1F4591;text-transform:uppercase;letter-spacing:.04em}\n.fx-card h3{margin:2px 0 0;font-size:1.25rem;line-height:1.2;color:#0B1B3D}\n@media (prefers-reduced-motion:reduce){.fx-avatar,.fx-avatar .ojo,.pf-emoji{animation:none!important}}\n"; document.head.appendChild(estilo);

    function nombreDe(sel){ var o = sel.options[sel.selectedIndex]; return o ? o.text.trim() : ''; }
    function contenedor(){
      var viejo = document.getElementById('fxAvatarImg'); if (viejo) return viejo;
      var priv = document.getElementById('privado'); if (!priv) return null;
      var card = document.createElement('div'); card.className = 'fx-card'; card.id = 'fxCard';
      card.innerHTML = '<div id="fxAvatarImg" class="fx-avatar"></div><div class="fx-texto"><p class="fx-pre">Te encuentras en la página de evidencias de</p><h3 id="fxNombre"></h3></div><button type="button" id="btnAvatar" class="fx-btn">📸 Mi avatar</button>';
      priv.insertBefore(card, priv.firstChild);
      card.querySelector('#btnAvatar').addEventListener('click', function(){ P.reabrir(); });
      return card.querySelector('#fxAvatarImg');
    }
    function entrar(){
      var sel = document.getElementById('alumno'); if (!sel || !sel.value) return;
      var id = sel.value, nombre = nombreDe(sel), cont = contenedor(); if (!cont) return;
      var d = { nombre: nombre };
      function pintarAv(url){
        cont.innerHTML = url ? '<img src="' + url + '" alt="Avatar de ' + esc(nombre) + '">' : avatar(d);
        var n = document.getElementById('fxNombre'); if (n) n.textContent = nombre;
        if (url){ cont.classList.remove('nuevo'); void cont.offsetWidth; cont.classList.add('nuevo'); }
      }
      pintarAv(P.obtener(id));
      P.iniciar(id, nombre, function(url){ pintarAv(url); });
    }
    var ultimo = false;
    setInterval(function(){
      var p = document.getElementById('privado');
      var vis = !!p && !p.hidden && p.offsetParent !== null;
      if (vis && !ultimo) entrar();
      ultimo = vis;
    }, 400);

    /* Quita el botón y la ventana viejos de "Perfil familiar" / "Elegir imagen" */
    function raizFija(el){
      for (var n = el; n && n !== document.body; n = n.parentElement){
        if (getComputedStyle(n).position === 'fixed') return n;
      }
      return null;
    }
    function ocultar(el){ var r = raizFija(el) || el.closest('button,a') || el; r.dataset.fxOff = '1'; r.style.setProperty('display', 'none', 'important'); }
    function limpiarViejo(){
      document.querySelectorAll('button,a,div,span,h1,h2,h3').forEach(function(el){
        if (el.dataset.fxOff || el.children.length > 3) return;
        if (el.closest('#perfilModal,#fxCard,.nav-aviso')) return;
        var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (t.length < 46 && /perfil familiar/i.test(t)) ocultar(el);
      });
      document.querySelectorAll('button').forEach(function(b){
        if (b.closest('#perfilModal') || b.dataset.fxOff) return;
        if (/elegir imagen/i.test(b.textContent)) ocultar(b);
      });
    }
    var tl = null;
    new MutationObserver(function(){ if (!tl) tl = setTimeout(function(){ tl = null; limpiarViejo(); }, 300); })
      .observe(document.body, { childList: true, subtree: true });
    limpiarViejo();
  })();

})();