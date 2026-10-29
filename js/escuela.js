const API = 'https://script.google.com/macros/s/AKfycbyizN5oq0LMc4uCabXVayS_6JsNM1HuWgWIZzwh_mlpHCu0oidYimuj1K4-eHc4Fcmz/exec';
const $ = s => document.querySelector(s);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const CICLO = [
  {n:'Octubre 2026',k:'octubre',e:'🎃'}, {n:'Noviembre 2026',k:'noviembre',e:'🍂'}, {n:'Diciembre 2026',k:'diciembre',e:'🎄'},
  {n:'Enero 2027',k:'enero',e:'⛄'}, {n:'Febrero 2027',k:'febrero',e:'💌'}, {n:'Marzo 2027',k:'marzo',e:'🌸'},
  {n:'Abril 2027',k:'abril',e:'🐣'}, {n:'Mayo 2027',k:'mayo',e:'🌷'}, {n:'Junio 2027',k:'junio',e:'☀️'}, {n:'Julio 2027',k:'julio',e:'🏖️'}
];

function esc(s){ const d = document.createElement('div'); d.textContent = (s == null ? '' : s); return d.innerHTML; }
function seguro(u){ return /^https:\/\//i.test(u || '') ? u : '#'; }
function norm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function folderId(u){ const m = String(u || '').match(/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|folderview\?id=|open\?id=)([\w-]+)/); return m ? m[1] : ''; }
function driveId(u){ const m = String(u || '').match(/drive\.google\.com\/file\/d\/([\w-]+)/); return m ? m[1] : null; }

/* Evitar que el navegador restaure la página desplazada al abrirla */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('pageshow', () => window.scrollTo(0, 0));

/* Puerta */
document.documentElement.classList.add('bloqueado');
$('#btnPuerta').addEventListener('click', () => {
  $('#puerta').classList.add('abierta');
  setTimeout(() => {
    $('#puerta').remove(); document.documentElement.classList.remove('bloqueado');
    window.puertaAbierta = true;
    document.documentElement.classList.add('puerta-abierta');
    document.dispatchEvent(new Event('puerta-abierta'));
  }, 1700);
});

/* Aparecer al hacer scroll */
const obs = ('IntersectionObserver' in window) ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); } }), {threshold:.08}) : null;
document.querySelectorAll('.reveal').forEach(el => obs ? obs.observe(el) : el.classList.add('in'));

/* Saludo, fecha y hora */
let ultSaludo = '';
function reloj(){
  const n = new Date(), h = n.getHours();
  let e, t;
  if (h >= 6 && h < 12){ e = '☀️'; t = '¡Buenos días!'; }
  else if (h >= 12 && h < 19){ e = '🌤️'; t = '¡Buenas tardes!'; }
  else { e = '🌙'; t = '¡Buenas noches!'; }
  if (t !== ultSaludo){ ultSaludo = t; $('#saludoEmo').textContent = e; $('#saludoTxt').textContent = t; }
  $('#fecha').textContent = DIAS[n.getDay()] + ' ' + n.getDate() + ' de ' + MESES[n.getMonth()] + ' de ' + n.getFullYear();
  $('#horaTxt').textContent = n.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}
reloj(); setInterval(reloj, 1000);

/* Máscara DD/MM/AAAA */
function mascara(inp){
  inp.addEventListener('input', () => {
    const d = inp.value.replace(/\D/g, '').slice(0, 8);
    inp.value = d.length > 4 ? d.slice(0,2) + '/' + d.slice(2,4) + '/' + d.slice(4)
              : d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d;
  });
}
mascara($('#fecha2')); mascara($('#waFecha'));

async function llamar(params){
  const r = await fetch(API + '?' + new URLSearchParams(params));
  return r.json();
}

/* Datos públicos */
async function cargar(){
  try{
    const d = await llamar({action:'publico'});
    if (!d.ok) throw new Error();

    $('#avisosLista').innerHTML =
      '<div class="gis bienvenida-pizarron">' +
      '<h3>🌟 ¡Bienvenidos! 🌟</h3>' +
      '<p class="bienvenida-texto">📚 Bienvenidos plataforma de evidencias<br><strong>Segundo A</strong><br>Ciclo escolar <strong>2026-2027</strong> 🎒</p>' +
      '</div>';

    const eventoMuertos = '<div class="item evento evento-cerrado">' +
      '<div class="ico emo">💀</div><div class="evento-contenido">' +
      '<h3>Evento Día de Muertos en la Rafael Ramírez</h3>' +
      '<div class="meta">29/10/2026 · 8:30 de la mañana</div>' +
      '<div class="sello-exito" aria-label="Este evento fue un éxito">¡ESTE EVENTO<br>FUE UN ÉXITO!</div>' +
      '<p>Madres y padres de familia: gracias por disfrutar la participación de sus hijos en las diferentes actividades con motivo del Día de Muertos. Conservamos esta invitación como evidencia de un evento que fue todo un éxito.</p>' +
      '<button class="btn invitacion-btn" type="button" data-popup-url="https://youtube.com/shorts/5xaJE-PWyLs" data-popup-title="Invitación · Día de Muertos">🎬 Invitación <span aria-hidden="true">✨</span></button>' +
      '</div></div>';
    // Evitar que el aviso de Día de Muertos aparezca dos veces en la web.
    // El registro puede seguir en la hoja de cálculo; aquí se oculta el duplicado.
    const calendarioSinDuplicado = (d.calendario || []).filter(c =>
      !norm((c.evento || '') + ' ' + (c.descripcion || '')).includes('dia de muertos'));
    const calendarioActual = calendarioSinDuplicado.length ? calendarioSinDuplicado.map(c =>
      '<div class="item evento"><div class="ico emo">' + esc(c.icono || '📚') + '</div><div><h3>' + esc(c.evento) + '</h3>' +
      '<div class="meta">' + esc(c.fecha) + '</div>' + (c.descripcion ? '<p>' + esc(c.descripcion) + '</p>' : '') + '</div></div>').join('')
      : '<p class="vacio">No hay actividades próximas <span class="emo">🎒</span></p>';
    $('#calLista').innerHTML = eventoMuertos + calendarioActual;

    const dest = d.destacados || [];
    $('#destLista').innerHTML = dest.length ? dest.map(x => {
      const id = driveId(x.enlace);
      const media = id
        ? '<div class="media"><iframe loading="lazy" allowfullscreen allow="autoplay; fullscreen" src="https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview" title="' + esc(x.titulo) + '"></iframe></div>'
        : (x.enlace ? '' : '');
      const link = (!id && x.enlace) ? '<button class="btn sec destacado-ver" type="button" data-popup-url="' + esc(seguro(x.enlace)) + '" data-popup-title="' + esc(x.titulo) + '">Ver ➜</button>' : '';
      return '<div class="dcard">' + media + '<div class="txt"><h3><span class="emo p">🌟</span> ' + esc(x.titulo) + '</h3>' +
        (x.descripcion ? '<p>' + esc(x.descripcion) + '</p>' : '') + link + '</div></div>';
    }).join('') : '<p class="vacio">Pronto verás aquí lo más especial del mes <span class="emo">🎬</span></p>';

    if (d.cumples.length){
      $('#cumpLista').innerHTML = d.cumples.map(c => '<span class="chip">🎈 ' + esc(c.nombre) + '</span>').join('');
      $('#felicidades').hidden = false;
    } else {
      $('#cumpLista').innerHTML = '<span class="chip">Este mes no hay cumpleaños 🎈</span>';
    }

    const opciones = '<option value="">Elige al alumno(a)</option>' +
      d.alumnos.map(a => '<option value="' + esc(a.id) + '">' + esc(a.nombre) + '</option>').join('');
    $('#alumno').innerHTML = opciones;
    $('#waAlumno').innerHTML = opciones;
    if (d.hayWhatsapp) $('#btnWa').hidden = false;
  }catch(e){
    const m = '<p class="vacio">No se pudo cargar la información. Revisa tu internet e inténtalo de nuevo.</p>';
    $('#avisosLista').innerHTML = '<p class="gis-vacio">No se pudo cargar. Revisa tu internet.</p>'; $('#calLista').innerHTML = m; $('#destLista').innerHTML = m;
    $('#cumpLista').innerHTML = '<span class="chip">🎈</span>';
    $('#alumno').innerHTML = '<option value="">No disponible</option>';
  }
}

/* Acceso de los papás */
$('#formAcceso').addEventListener('submit', async ev => {
  ev.preventDefault();
  const msg = $('#msgAcceso'), btn = $('#btnEntrar');
  msg.className = 'msg'; msg.textContent = 'Verificando…'; btn.disabled = true;
  try{
    const d = await llamar({action:'acceso', id:$('#alumno').value, fecha:$('#fecha2').value});
    if (!d.ok){ msg.className = 'msg err'; msg.textContent = d.error || 'No se pudo entrar.'; return; }
    msg.textContent = '';
    $('#tituloAula').innerHTML = '<span class="emo">🏫</span> Aula de ' + esc(d.nombre);
    $('#carpetas').innerHTML = CICLO.map(m => {
      const c = d.carpetas.find(x => norm(x.mes).indexOf(m.k) === 0);
      return c
        ? '<a class="carpeta" target="_blank" rel="noopener" data-folder="' + esc(folderId(c.enlace)) + '" data-titulo="' + esc(m.n) + '" href="' + esc(seguro(c.enlace)) + '"><span class="ico emo">' + m.e + '</span>' + esc(m.n) + '<small>📁 Abrir</small></a>'
        : '<div class="carpeta off"><span class="ico emo">' + m.e + '</span>' + esc(m.n) + '<small>🔒 Próximamente</small></div>';
    }).join('');
    $('#galTit').hidden = !d.galeria.length; $('#galeria').hidden = !d.galeria.length;
    $('#galeria').innerHTML = d.galeria.map(g =>
      '<a class="carpeta" target="_blank" rel="noopener" data-folder="' + esc(folderId(g.enlace)) + '" data-titulo="' + esc(g.titulo) + '" href="' + esc(seguro(g.enlace)) + '"><span class="ico emo">📸</span>' + esc(g.titulo) +
      (g.descripcion ? '<small>' + esc(g.descripcion) + '</small>' : '') + '</a>').join('');
    $('#formAcceso').hidden = true; $('#privado').hidden = false; $('#contacto').hidden = true;
  }catch(e){
    msg.className = 'msg err'; msg.textContent = 'Error de conexión. Inténtalo de nuevo.';
  }finally{ btn.disabled = false; }
});

$('#btnSalir').addEventListener('click', () => {
  $('#privado').hidden = true; $('#formAcceso').hidden = false; $('#contacto').hidden = false;
  $('#fecha2').value = ''; $('#carpetas').innerHTML = ''; $('#galeria').innerHTML = '';
});

/* WhatsApp protegido */
$('#btnWa').addEventListener('click', () => { $('#msgWa').textContent = ''; $('#dlgWa').showModal(); });
$('#btnWaCerrar').addEventListener('click', () => { $('#dlgWa').close(); $('#waFecha').value = ''; });
$('#formWa').addEventListener('submit', async ev => {
  ev.preventDefault();
  const msg = $('#msgWa'), btn = $('#btnWaIr');
  msg.className = 'msg'; msg.textContent = 'Verificando…'; btn.disabled = true;
  try{
    const d = await llamar({action:'whatsapp', id:$('#waAlumno').value, fecha:$('#waFecha').value});
    if (!d.ok){ msg.className = 'msg err'; msg.textContent = d.error || 'No se pudo abrir WhatsApp.'; return; }
    $('#waFecha').value = '';
    window.location.href = d.url;
  }catch(e){
    msg.className = 'msg err'; msg.textContent = 'Error de conexión. Inténtalo de nuevo.';
  }finally{ btn.disabled = false; }
});

/* Animar automáticamente cualquier emoji de la página */
const RE_EMO = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu;
const VARS = ['', 'w', 'p'];
let nEmo = 0;
function envTexto(t){
  const p = t.parentNode;
  if (!p || !p.closest || p.closest('.emo,select,option,script,style,textarea,title')) return;
  const txt = t.nodeValue;
  RE_EMO.lastIndex = 0;
  if (!RE_EMO.test(txt)) return;
  RE_EMO.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m;
  while ((m = RE_EMO.exec(txt))){
    if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
    const sp = document.createElement('span');
    sp.className = 'emo ' + VARS[nEmo % 3];
    sp.style.animationDelay = (-(nEmo % 7) * 0.35) + 's';
    nEmo++;
    sp.textContent = m[0];
    frag.appendChild(sp);
    last = m.index + m[0].length;
  }
  if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
  p.replaceChild(frag, t);
}
function envolver(n){
  if (n.nodeType === 3) return envTexto(n);
  if (n.nodeType !== 1 || n.classList.contains('emo') || /^(SCRIPT|STYLE|SELECT|OPTION|TEXTAREA|INPUT|IFRAME|CANVAS)$/.test(n.tagName)) return;
  Array.from(n.childNodes).forEach(envolver);
}
envolver(document.body);
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(envolver))).observe(document.body, {childList:true, subtree:true});

/* Partículas de luz */
(function(){
  const cv = document.getElementById('luces'), cx = cv.getContext('2d');
  const COL = [[0,229,255],[255,45,149],[255,214,0],[124,77,255],[0,230,118]];
  let W, H, P = [];
  function nueva(ini){
    return { x: Math.random()*W, y: ini ? Math.random()*H : H + 20, r: 1.8 + Math.random()*3.4,
             vy: .15 + Math.random()*.5, ph: Math.random()*6.28, sp: .6 + Math.random()*1.4, c: COL[Math.floor(Math.random()*COL.length)] };
  }
  function medir(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W*dpr; cv.height = H*dpr; cx.setTransform(dpr,0,0,dpr,0,0);
    const n = Math.round(Math.min(48, Math.max(26, W/11)));
    while (P.length < n) P.push(nueva(true));
    P.length = n;
  }
  function pinta(t){
    cx.clearRect(0, 0, W, H);
    for (const p of P){
      p.y -= p.vy; p.x += Math.sin(t/1400*p.sp + p.ph)*.35;
      if (p.y < -25) Object.assign(p, nueva(false));
      const a = .4 + .5*Math.abs(Math.sin(t/700*p.sp + p.ph));
      const rgb = p.c[0] + ',' + p.c[1] + ',' + p.c[2];
      const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*5);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(.3, 'rgba(' + rgb + ',' + (a*.45) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r*5, 0, 6.2832); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a + .2) + ')'; cx.beginPath(); cx.arc(p.x, p.y, p.r*.55, 0, 6.2832); cx.fill();
    }
    requestAnimationFrame(pinta);
  }
  medir(); window.addEventListener('resize', medir); requestAnimationFrame(pinta);
})();

/* Ventana emergente para carpetas de Drive */
function mostrarVisor(titulo, url, contenido){
  $('#visorTitulo').textContent = titulo || 'Contenido destacado';
  $('#visorDrive').href = seguro(url);
  $('#visorMarco').src = contenido || seguro(url);
  $('#visorMarco').title = titulo || 'Contenido destacado';
  $('#visor').hidden = false;
  document.documentElement.classList.add('bloqueado');
  history.pushState({visor:1}, '');
}
function abrirVisor(id, titulo, url){
  mostrarVisor(titulo || 'Carpeta', url, 'https://drive.google.com/embeddedfolderview?id=' + encodeURIComponent(id) + '#grid');
}
function cerrarVisor(){
  $('#visor').hidden = true;
  $('#visorMarco').src = 'about:blank';
  document.documentElement.classList.remove('bloqueado');
}
$('#visorAtras').addEventListener('click', () => { if (history.state && history.state.visor) history.back(); else cerrarVisor(); });
window.addEventListener('popstate', () => { if (!$('#visor').hidden) cerrarVisor(); });
document.addEventListener('click', ev => {
  const b = ev.target.closest('button.destacado-ver[data-popup-url]');
  if (!b) return;
  const url = seguro(b.dataset.popupUrl);
  if (url === '#') return;
  const file = driveId(url);
  const folder = folderId(url);
  let contenido = url;
  const yt = url.match(/(?:youtube\\.com\\/(?:shorts\/|watch\\?v=)|youtu\\.be\/)([A-Za-z0-9_-]{11})/i);
  if (yt) {
    // El botón se pulsa conscientemente; se solicita reproducción automática dentro del visor.
    contenido = 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1';
  } else if (file) contenido = 'https://drive.google.com/file/d/' + encodeURIComponent(file) + '/preview';
  else if (folder) contenido = 'https://drive.google.com/embeddedfolderview?id=' + encodeURIComponent(folder) + '#grid';
  mostrarVisor(b.dataset.popupTitle || 'Lo más relevante del mes', url, contenido);
});
document.addEventListener('click', ev => {
  const a = ev.target.closest('a.carpeta[data-folder]');
  if (!a || !a.dataset.folder || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
  ev.preventDefault();
  abrirVisor(a.dataset.folder, a.dataset.titulo, a.href);
});

cargar();

/* Notificaciones (OneSignal): el worker vive en la misma carpeta que esta página */
window.OneSignalDeferred = window.OneSignalDeferred || [];
setTimeout(function(){
  var m = document.getElementById('msgNotif');
  if (m && m.textContent.indexOf('Preparando') === 0) m.textContent = 'No se pudo cargar el servicio de notificaciones. Revisa tu conexión o desactiva el bloqueador de anuncios.';
}, 7000);
OneSignalDeferred.push(async function(OneSignal){
  const btn = document.getElementById('btnNotif'), msg = document.getElementById('msgNotif');
  try{
    const base = location.pathname.replace(/[^\/]*$/, '');
    await OneSignal.init({
      appId: '97d0ae47-97ab-482b-9312-d45a45a4b33f',
      serviceWorkerPath: base.replace(/^\//, '') + 'OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: base },
      serviceWorkerOverrideForTypical: true,
      notifyButton: { enable: false }
    });
    if (!OneSignal.Notifications.isPushSupported()){ msg.textContent = 'Este navegador no admite notificaciones.'; return; }
    const marcar = () => OneSignal.User.addTag('escuela', 'si');
    function estado(){
      if (OneSignal.User.PushSubscription.optedIn){
        btn.hidden = true; msg.textContent = '✅ Notificaciones activadas. Te avisaremos cuando haya novedades.'; marcar();
      } else if (Notification.permission === 'denied'){
        btn.hidden = true; msg.textContent = 'Las notificaciones están bloqueadas en tu navegador. Puedes activarlas desde los permisos del sitio.';
      } else { btn.hidden = false; msg.textContent = 'Toca el botón para recibir los avisos.'; }
    }
    estado();
    btn.addEventListener('click', async () => { await OneSignal.Notifications.requestPermission(); estado(); });
    OneSignal.User.PushSubscription.addEventListener('change', estado);
  }catch(e){
    msg.textContent = 'No se pudieron iniciar las notificaciones: ' + (e && e.message ? e.message : e);
  }
});


/* Despedida interactiva: frases educativas y emojis diferentes en cada visita */
(function(){
  const boton=document.getElementById('btnSalirWeb');
  const pantalla=document.getElementById('pantallaDespedida');
  const campoEmojis=document.getElementById('despedidaEmojis');
  const frase=document.getElementById('pensamientoTexto');
  const autor=document.getElementById('pensamientoAutor');
  if(!boton||!pantalla||!campoEmojis||!frase||!autor)return;
  const pensamientos=[
    {texto:'La educación es el arma más poderosa que puedes usar para cambiar el mundo.',autor:'Nelson Mandela'},
    {texto:'Se necesita un pueblo entero para educar a un niño.',autor:'Proverbio africano'},
    {texto:'La educación no cambia el mundo: cambia a las personas que van a cambiar el mundo.',autor:'Paulo Freire'},
    {texto:'Enseñar es dejar una huella en la vida de otra persona.',autor:'Adaptación de una reflexión educativa'},
    {texto:'Cada niño es un artista; el desafío está en seguir siéndolo cuando crece.',autor:'Pablo Picasso'},
    {texto:'La mente no es un vaso que hay que llenar, sino una lámpara que hay que encender.',autor:'Plutarco'},
    {texto:'Juntos podemos lograr que cada pequeño paso se convierta en un gran aprendizaje.',autor:'Reflexión educativa'},
    {texto:'La educación es la llave que abre las puertas de las oportunidades.',autor:'Reflexión educativa'},
    {texto:'Para educar a un niño hace falta la tribu entera.',autor:'Proverbio africano'},
    {texto:'Los niños no recuerdan todo lo que les dices, pero sí cómo los haces sentir.',autor:'Reflexión educativa'}
  ];
  const emojis=['📚','✏️','🎒','🍎','⭐','🌈','🧩','🖍️','🎨','🔬','🦋','🌻','🪁','📖','💡','🧠','🏫','📝','🌟','🧸','🎓','❤️','🪴','☀️','🕊️','🦉','🧮','🪄'];
  function aleatorio(arr){return arr[Math.floor(Math.random()*arr.length)]}
  function llenarEmojis(){
    campoEmojis.replaceChildren();
    const total=Math.min(32,Math.max(18,Math.round(window.innerWidth/18)));
    for(let i=0;i<total;i++){
      const span=document.createElement('span');
      span.className='despedida-emoji';
      span.textContent=aleatorio(emojis);
      span.style.left=(Math.random()*100)+'%';
      span.style.fontSize=(1.15+Math.random()*1.5)+'rem';
      span.style.animationDuration=(7+Math.random()*9)+'s';
      span.style.animationDelay=(-Math.random()*12)+'s';
      span.style.setProperty('--deriva',((Math.random()*140)-70)+'px');
      campoEmojis.appendChild(span);
    }
  }
  boton.addEventListener('click',()=>{
    const p=aleatorio(pensamientos);
    frase.textContent=p.texto;
    autor.textContent='— '+p.autor;
    llenarEmojis();
    pantalla.hidden=false;
    document.body.style.overflow='hidden';
    document.getElementById('despedidaTitulo').focus?.({preventScroll:true});
    setTimeout(salirDelSitio,10000);
  });
  function salirDelSitio(){
    // El navegador solo permite cerrar la pestaña si sus reglas lo autorizan.
    window.close();
    setTimeout(()=>{
      // Si no pudo cerrarse, intenta regresar a la página anterior.
      if(history.length>1){
        history.back();
      }else{
        // Último recurso: abandonar la página del sitio.
        location.replace('about:blank');
      }
    },180);
  }
  // La pantalla de despedida queda como cierre final; después intenta salir.


})();
