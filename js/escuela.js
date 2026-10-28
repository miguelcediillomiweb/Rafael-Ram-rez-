/**
 * Escuela Primaria Rafael Ramírez (CCT 15DPR082X)
 * Script oficial de integración: Google Apps Script, Google Drive y OneSignal
 * Ruta del archivo: js/escuela.js
 */

const API = 'https://script.google.com/macros/s/AKfycbyizN5oq0LMc4uCabXVayS_6JsNM1HuWgWIZzwh_mlpHCu0oidYimuj1K4-eHc4Fcmz/exec';
const $ = s => document.querySelector(s);

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const CICLO = [
  {n:'Octubre 2026',k:'octubre',e:'🍂'},
  {n:'Noviembre 2026',k:'noviembre',e:'🍁'},
  {n:'Diciembre 2026',k:'diciembre',e:'🎄'},
  {n:'Enero 2027',k:'enero',e:'⛄'},
  {n:'Febrero 2027',k:'febrero',e:'💌'},
  {n:'Marzo 2027',k:'marzo',e:'🌸'},
  {n:'Abril 2027',k:'abril',e:'🌱'},
  {n:'Mayo 2027',k:'mayo',e:'🌷'},
  {n:'Junio 2027',k:'junio',e:'☀️'},
  {n:'Julio 2027',k:'julio',e:'🏖️'}
];

function esc(s){ const d = document.createElement('div'); d.textContent = (s == null ? '' : s); return d.innerHTML; }
function seguro(u){ return /^https:\/\//i.test(u || '') ? u : '#'; }
function norm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function folderId(u){ const m = String(u || '').match(/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|folderview\?id=|open\?id=)([\w-]+)/); return m ? m[1] : ''; }
function driveId(u){ const m = String(u || '').match(/drive\.google\.com\/file\/d\/([\w-]+)/); return m ? m[1] : null; }

/* Reloj y Saludo Dinámico */
let ultSaludo = '';
function reloj(){
  const n = new Date(), h = n.getHours();
  let e, t;
  if (h >= 6 && h < 12){ e = '☀️'; t = '¡Buenos días!'; }
  else if (h >= 12 && h < 19){ e = '🌤️'; t = '¡Buenas tardes!'; }
  else { e = '🌙'; t = '¡Buenas noches!'; }

  if (t !== ultSaludo){
    ultSaludo = t;
    const sEmo = $('#saludoEmo'), sTxt = $('#saludoTxt');
    if (sEmo) sEmo.textContent = e;
    if (sTxt) sTxt.textContent = t;
  }

  const fTxt = $('#fechaTexto'), hTxt = $('#horaTexto');
  if (fTxt) fTxt.textContent = DIAS[n.getDay()] + ', ' + n.getDate() + ' de ' + MESES[n.getMonth()] + ' de ' + n.getFullYear();
  if (hTxt) hTxt.textContent = n.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}
reloj();
setInterval(reloj, 1000);

/* Máscara de Fecha DD/MM/AAAA */
function mascara(inp){
  if (!inp) return;
  inp.addEventListener('input', () => {
    const d = inp.value.replace(/\D/g, '').slice(0, 8);
    inp.value = d.length > 4 ? d.slice(0,2) + '/' + d.slice(2,4) + '/' + d.slice(4)
              : d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d;
  });
}
mascara($('#fecha2'));
mascara($('#waFecha'));

/* Llamadas a la API de Google Apps Script */
async function llamar(params){
  const r = await fetch(API + '?' + new URLSearchParams(params));
  return r.json();
}

/* Cargar Datos Públicos Escolares */
async function cargar(){
  try{
    const d = await llamar({action:'publico'});
    if (!d.ok) throw new Error();

    // Avisos en pizarrón
    const avisosEl = $('#avisosLista');
    if (avisosEl){
      avisosEl.innerHTML = d.avisos && d.avisos.length ? d.avisos.map(a =>
        '<div class="gis' + (a.importante ? ' imp' : '') + '"><h3>' +
        (a.importante ? '★ ' : '') + esc(a.titulo) + '</h3>' +
        '<div class="meta">' + esc(a.fecha) + '</div>' +
        '<p>' + esc(a.mensaje) + '</p></div>'
      ).join('') : '<p class="gis">No hay avisos pendientes en el pizarrón por ahora.</p>';
    }

    // Calendario escolar
    const calEl = $('#calLista');
    if (calEl){
      calEl.innerHTML = d.calendario && d.calendario.length ? d.calendario.map(c =>
        '<div class="item-evento"><div class="ico">' + esc(c.icono || '📅') + '</div><div>' +
        '<h3>' + esc(c.evento) + '</h3>' +
        '<div class="meta">' + esc(c.fecha) + '</div>' +
        (c.descripcion ? '<p>' + esc(c.descripcion) + '</p>' : '') +
        '</div></div>'
      ).join('') : '<p style="color:var(--slate-500);font-size:0.9rem;">No hay actividades próximas agendadas.</p>';
    }

    // Lo más relevante / Destacados
    const destEl = $('#destLista');
    if (destEl){
      const dest = d.destacados || [];
      destEl.innerHTML = dest.length ? dest.map(x => {
        const id = driveId(x.enlace);
        const fId = folderId(x.enlace);
        const media = id
          ? '<div style="position:relative;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;margin-bottom:8px;"><iframe loading="lazy" allowfullscreen src="https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview" style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe></div>'
          : '';
        const link = fId
          ? '<button type="button" class="btn-dorado" onclick="abrirVisor(\'' + esc(fId) + '\',\'' + esc(x.titulo || 'Destacado') + '\',\'' + esc(seguro(x.enlace)) + '\')">Ver carpeta ➜</button>'
          : ((!id && x.enlace) ? '<a class="btn-dorado" target="_blank" rel="noopener" href="' + esc(seguro(x.enlace)) + '">Ver en Drive ↗</a>' : '');
        return '<div style="background:#fff;border:1px solid var(--slate-200);border-radius:12px;padding:12px;margin-bottom:12px;">' +
          media + '<h3 style="margin:4px 0;color:var(--navy);font-size:1rem;">' + esc(x.titulo || 'Destacado del mes') + '</h3>' +
          (x.descripcion ? '<p style="margin:4px 0 8px;font-size:0.85rem;color:var(--slate-700);">' + esc(x.descripcion) + '</p>' : '') +
          link + '</div>';
      }).join('') : '<p style="color:var(--slate-500);font-size:0.9rem;">Pronto verás aquí lo más especial del mes.</p>';
    }

    // Cumpleaños del mes
    const cumpEl = $('#cumpLista'), feliEl = $('#felicidades');
    if (cumpEl){
      if (d.cumples && d.cumples.length){
        cumpEl.innerHTML = d.cumples.map(c => '<span class="chip-cumple">🎈 ' + esc(c.nombre) + '</span>').join('');
        if (feliEl) feliEl.hidden = false;
      } else {
        cumpEl.innerHTML = '<span class="chip-cumple">Este mes no hay cumpleaños registrados</span>';
        if (feliEl) feliEl.hidden = true;
      }
    }

    // Llenar select de alumnos
    const opciones = '<option value="">Elige al alumno(a)</option>' +
      (d.alumnos || []).map(a => '<option value="' + esc(a.id) + '">' + esc(a.nombre) + '</option>').join('');
    if ($('#alumno')) $('#alumno').innerHTML = opciones;
    if ($('#waAlumno')) $('#waAlumno').innerHTML = opciones;

    if (d.hayWhatsapp && $('#btnWa')) $('#btnWa').hidden = false;

  }catch(e){
    console.error(e);
    if ($('#avisosLista')) $('#avisosLista').innerHTML = '<p class="gis">No se pudo cargar la información. Revisa tu conexión a internet.</p>';
  }
}

/* Acceso al Aula Virtual */
const formAcceso = $('#formAcceso');
if (formAcceso){
  formAcceso.addEventListener('submit', async ev => {
    ev.preventDefault();
    const msg = $('#msgAcceso'), btn = $('#btnEntrar');
    if (msg) { msg.style.color = 'var(--navy)'; msg.textContent = 'Verificando con el padrón escolar...'; }
    if (btn) btn.disabled = true;

    try{
      const d = await llamar({action:'acceso', id:$('#alumno').value, fecha:$('#fecha2').value});
      if (!d.ok){
        if (msg) { msg.style.color = '#B91C1C'; msg.textContent = d.error || 'Datos no coinciden. Revisa la fecha.'; }
        return;
      }
      if (msg) msg.textContent = '';
      $('#tituloAula').textContent = 'Aula Virtual: ' + d.nombre;
      $('#carpetas').innerHTML = CICLO.map(m => {
        const c = d.carpetas ? d.carpetas.find(x => norm(x.mes).indexOf(m.k) === 0) : null;
        return c
          ? '<a class="carpeta-item" target="_blank" rel="noopener" data-folder="' + esc(folderId(c.enlace)) + '" data-titulo="' + esc(m.n) + '" href="' + esc(seguro(c.enlace)) + '"><span class="ico">' + m.e + '</span><span>' + esc(m.n) + '</span><small>📁 Abrir</small></a>'
          : '<div class="carpeta-item off"><span class="ico">' + m.e + '</span><span>' + esc(m.n) + '</span><small>🔒 Próximamente</small></div>';
      }).join('');

      const galTit = $('#galTit'), galeria = $('#galeria');
      if (galTit && galeria){
        const tieneGal = d.galeria && d.galeria.length;
        galTit.hidden = !tieneGal;
        galeria.hidden = !tieneGal;
        if (tieneGal){
          galeria.innerHTML = d.galeria.map(g =>
            '<a class="carpeta-item" target="_blank" rel="noopener" data-folder="' + esc(folderId(g.enlace)) + '" data-titulo="' + esc(g.titulo) + '" href="' + esc(seguro(g.enlace)) + '"><span class="ico">📸</span><span>' + esc(g.titulo) + '</span>' +
            (g.descripcion ? '<small>' + esc(g.descripcion) + '</small>' : '') + '</a>'
          ).join('');
        }
      }

      $('#formAcceso').hidden = true;
      $('#privado').hidden = false;
      $('#contacto').hidden = true;
    }catch(e){
      if (msg) { msg.style.color = '#B91C1C'; msg.textContent = 'Error de conexión. Inténtalo de nuevo.'; }
    }finally{
      if (btn) btn.disabled = false;
    }
  });
}

const btnSalir = $('#btnSalir');
if (btnSalir){
  btnSalir.addEventListener('click', () => {
    $('#privado').hidden = true;
    $('#formAcceso').hidden = false;
    $('#contacto').hidden = false;
    $('#fecha2').value = '';
    $('#carpetas').innerHTML = '';
  });
}

/* WhatsApp Seguro */
const btnWa = $('#btnWa'), dlgWa = $('#dlgWa'), btnWaCerrar = $('#btnWaCerrar'), formWa = $('#formWa');
if (btnWa && dlgWa){
  btnWa.addEventListener('click', () => {
    $('#msgWa').textContent = '';
    dlgWa.showModal();
  });
}
if (btnWaCerrar && dlgWa){
  btnWaCerrar.addEventListener('click', () => {
    dlgWa.close();
    $('#waFecha').value = '';
  });
}
if (formWa){
  formWa.addEventListener('submit', async ev => {
    ev.preventDefault();
    const msg = $('#msgWa'), btn = $('#btnWaIr');
    if (msg) { msg.style.color = 'var(--navy)'; msg.textContent = 'Validando alumno...'; }
    if (btn) btn.disabled = true;

    try{
      const d = await llamar({action:'whatsapp', id:$('#waAlumno').value, fecha:$('#waFecha').value});
      if (!d.ok){
        if (msg) { msg.style.color = '#B91C1C'; msg.textContent = d.error || 'No se pudo abrir WhatsApp.'; }
        return;
      }
      $('#waFecha').value = '';
      window.location.href = d.url;
    }catch(e){
      if (msg) { msg.style.color = '#B91C1C'; msg.textContent = 'Error de conexión.'; }
    }finally{
      if (btn) btn.disabled = false;
    }
  });
}

/* Visor para Carpetas de Drive */
function abrirVisor(id, titulo, url){
  $('#visorTitulo').textContent = titulo || 'Carpeta de Evidencias';
  $('#visorDrive').href = seguro(url);
  $('#visorMarco').src = 'https://drive.google.com/embeddedfolderview?id=' + encodeURIComponent(id) + '#grid';
  $('#visor').hidden = false;
  document.documentElement.classList.add('bloqueado');
  history.pushState({visor:1}, '');
}
function cerrarVisor(){
  $('#visor').hidden = true;
  $('#visorMarco').src = 'about:blank';
  document.documentElement.classList.remove('bloqueado');
}
const visorAtras = $('#visorAtras');
if (visorAtras){
  visorAtras.addEventListener('click', () => {
    if (history.state && history.state.visor) history.back();
    else cerrarVisor();
  });
}
window.addEventListener('popstate', () => {
  if (!$('#visor').hidden) cerrarVisor();
});
document.addEventListener('click', ev => {
  const a = ev.target.closest('a.carpeta-item[data-folder]');
  if (!a || !a.dataset.folder || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
  ev.preventDefault();
  abrirVisor(a.dataset.folder, a.dataset.titulo, a.href);
});

/* OneSignal Notificaciones */
window.OneSignalDeferred = window.OneSignalDeferred || [];
setTimeout(() => {
  const m = $('#msgNotif');
  if (m && m.textContent.indexOf('Cargando') === 0) {
    m.textContent = 'Avisos disponibles directamente en este portal escolar.';
  }
}, 5000);

OneSignalDeferred.push(async function(OneSignal){
  const btn = $('#btnNotif'), msg = $('#msgNotif');
  try{
    const base = location.pathname.replace(/[^\/]*$/, '');
    await OneSignal.init({
      appId: '97d0ae47-97ab-482b-9312-d45a45a4b33f',
      serviceWorkerPath: base.replace(/^\//, '') + 'OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: base },
      serviceWorkerOverrideForTypical: true,
      notifyButton: { enable: false }
    });
    if (!OneSignal.Notifications.isPushSupported()){
      if (msg) msg.textContent = 'Este navegador no admite notificaciones push.';
      return;
    }
    function estado(){
      if (OneSignal.User.PushSubscription.optedIn){
        if (btn) btn.hidden = true;
        if (msg) msg.textContent = '✅ Notificaciones activadas. Recibirás avisos importantes en tu dispositivo.';
        OneSignal.User.addTag('escuela', 'si');
      } else if (Notification.permission === 'denied'){
        if (btn) btn.hidden = true;
        if (msg) msg.textContent = 'Notificaciones bloqueadas en el navegador. Puedes activarlas en la configuración del sitio.';
      } else {
        if (btn) btn.hidden = false;
        if (msg) msg.textContent = 'Toca el botón para recibir los avisos directamente en tu teléfono.';
      }
    }
    estado();
    if (btn) btn.addEventListener('click', async () => {
      await OneSignal.Notifications.requestPermission();
      estado();
    });
    OneSignal.User.PushSubscription.addEventListener('change', estado);
  }catch(e){
    if (msg) msg.textContent = 'Servicio de avisos disponible en la página escolar.';
  }
});

/* Efecto suave de aparición al hacer scroll (reveal) */
const obs = ('IntersectionObserver' in window)
  ? new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
  : null;
document.querySelectorAll('.reveal').forEach(el => obs ? obs.observe(el) : el.classList.add('in'));

// Iniciar carga
cargar();
