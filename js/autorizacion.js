/* Autorización de foto del niño: aviso al papá, cámara en vivo y perfil.
   La decisión se guarda en Google Sheets (script de autorización).
   La foto (en caricatura) se queda solo en este dispositivo. */
(() => {
  'use strict';
  const API = 'https://script.google.com/macros/s/AKfycbwyr82o7DdfFF_9gBSynpGquPPyBGkkr32xX_XxJomTip7OwB0x5ntxLgt2Nw-R4RxPaA/exec';
  const KEY = 'rr_perfil_';
  const $ = s => document.querySelector(s);
  let stream = null, dlg = null, ctx = {}, corriendo = false, hecho = false;

  async function api(params) {
    const r = await fetch(API + '?' + new URLSearchParams(params), { cache: 'no-store' });
    if (!r.ok) throw Error('red');
    return r.json();
  }
  const stop = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };

  function obturador() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const a = new AC(), dur = .09;
      [0, .11].forEach(t => {
        const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
        const s = a.createBufferSource(), g = a.createGain(); g.gain.value = .5;
        s.buffer = buf; s.connect(g); g.connect(a.destination); s.start(a.currentTime + t);
      });
      setTimeout(() => a.close(), 600);
    } catch (_) {}
  }

  /* Convierte la foto en caricatura (colores planos + contornos). La original no se guarda. */
  function caricatura(v) {
    const W = 360, H = Math.round(W * v.videoHeight / v.videoWidth);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.save(); x.translate(W, 0); x.scale(-1, 1);
    x.filter = 'saturate(1.5) contrast(1.15) blur(1.2px)';
    x.drawImage(v, 0, 0, W, H); x.restore(); x.filter = 'none';
    const im = x.getImageData(0, 0, W, H), d = im.data, lum = new Float32Array(W * H);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) lum[p] = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
    const out = x.createImageData(W, H), o = out.data, paso = 255 / 4;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const p = y * W + xx, i = p * 4;
      let borde = 0;
      if (xx > 0 && y > 0 && xx < W - 1 && y < H - 1) {
        const gx = -lum[p - W - 1] - 2 * lum[p - 1] - lum[p + W - 1] + lum[p - W + 1] + 2 * lum[p + 1] + lum[p + W + 1];
        const gy = -lum[p - W - 1] - 2 * lum[p - W] - lum[p - W + 1] + lum[p + W - 1] + 2 * lum[p + W] + lum[p + W + 1];
        borde = Math.sqrt(gx * gx + gy * gy);
      }
      const k = borde > 110 ? .25 : 1;
      for (let j = 0; j < 3; j++) o[i + j] = Math.min(255, Math.round(d[i + j] / paso) * paso) * k;
      o[i + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    return c.toDataURL('image/jpeg', .85);
  }

  function guardarFoto(id, data) { try { localStorage.setItem(KEY + id, data); } catch (_) {} }
  function leerFoto(id) { try { return localStorage.getItem(KEY + id); } catch (_) { return null; } }

  /* Imagen de perfil dentro de la carpeta del alumno */
  function mostrarPerfil(id, nombre, conFoto) {
    const priv = $('#privado'); if (!priv) return;
    const viejo = $('#rrPerfil'); if (viejo) viejo.remove();
    const box = document.createElement('div'); box.id = 'rrPerfil';
    const av = document.createElement('div'); av.className = 'rr-avatar';
    const foto = conFoto ? leerFoto(id) : null;
    if (foto) { const img = document.createElement('img'); img.src = foto; img.alt = 'Foto de ' + nombre; av.append(img); }
    else av.textContent = '🧒';
    const t = document.createElement('p');
    t.append('Te encuentras en la página de evidencias de ');
    const b = document.createElement('b'); b.textContent = nombre; t.append(b);
    box.append(av, t); priv.prepend(box);
  }

  function crear() {
    if (dlg) return;
    dlg = document.createElement('dialog'); dlg.id = 'rrAutorizacion';
    dlg.innerHTML = `
      <section class="rr-panel">
        <div class="rr-insignia">📸</div>
        <p class="rr-kicker">ESCUELA PRIMARIA RAFAEL RAMÍREZ</p>
        <h2 id="rrTitulo">Un recuerdo especial</h2>
        <div id="rrConsentimiento">
          <p id="rrTexto"></p>
          <p class="rr-privacidad">La foto se convierte en caricatura y se queda solo en este dispositivo. No se envía ni se publica. Tú decides.</p>
          <div class="rr-actions">
            <button type="button" class="rr-si" id="rrAceptar">Sí, autorizo</button>
            <button type="button" class="rr-no" id="rrRechazar">No autorizo</button>
          </div>
        </div>
        <div id="rrCamara" hidden>
          <div class="rr-camara-marco">
            <video id="rrVideo" autoplay muted playsinline></video>
            <div id="rrCuenta" class="rr-cuenta" hidden>3</div>
            <div id="rrFlash" class="rr-flash"></div>
          </div>
          <p id="rrEstado" class="rr-estado"></p>
          <div class="rr-actions">
            <button type="button" class="rr-si" id="rrTomar">📸 Tomar foto</button>
            <button type="button" class="rr-no" id="rrOmitir">Cancelar</button>
          </div>
        </div>
        <div id="rrFinal" hidden>
          <div class="rr-polaroid" id="rrPolaroid">🧒</div>
          <p class="rr-estado" id="rrFinalTxt"></p>
          <button type="button" class="rr-si" id="rrContinuar">Entrar</button>
        </div>
      </section>`;
    document.body.append(dlg);
    $('#rrAceptar').onclick = abrirCamara;
    $('#rrRechazar').onclick = rechazar;
    $('#rrTomar').onclick = capturar;
    $('#rrOmitir').onclick = () => { stop(); $('#rrCamara').hidden = true; $('#rrConsentimiento').hidden = false; $('#rrAceptar').disabled = false; };
    $('#rrContinuar').onclick = cerrar;
    dlg.addEventListener('cancel', e => e.preventDefault());
    dlg.addEventListener('close', stop);
  }

  function pantallaFinal(data, texto) {
    stop();
    $('#rrConsentimiento').hidden = true; $('#rrCamara').hidden = true; $('#rrFinal').hidden = false;
    const pol = $('#rrPolaroid'); pol.replaceChildren();
    if (data) { const img = document.createElement('img'); img.src = data; img.alt = 'Foto'; pol.append(img); pol.classList.add('revela'); }
    else { pol.textContent = '🧒'; pol.classList.remove('revela'); }
    $('#rrFinalTxt').textContent = texto;
  }

  async function rechazar() {
    $('#rrRechazar').disabled = true;
    try { await api({ action: 'aut_guardar', id: ctx.id, fecha: ctx.fecha, decision: 'no' }); } catch (_) {}
    pantallaFinal(null, 'Gracias. Usaremos una imagen genérica. Te lo volveremos a preguntar en un mes por si cambias de opinión.');
    ctx.foto = false;
  }

  async function abrirCamara() {
    $('#rrAceptar').disabled = true;
    $('#rrConsentimiento').hidden = true; $('#rrCamara').hidden = false;
    $('#rrEstado').textContent = 'Abriendo la cámara…';
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Error('Este navegador no permite abrir la cámara.');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      const v = $('#rrVideo'); v.srcObject = stream; await v.play();
      $('#rrEstado').textContent = 'Cuando estén listos, toquen Tomar foto 😊';
      $('#rrTomar').disabled = false;
    } catch (e) {
      $('#rrEstado').textContent = 'No se pudo abrir la cámara. Revisa el permiso del navegador e inténtalo de nuevo.';
    }
  }

  async function capturar() {
    const v = $('#rrVideo');
    if (!stream || !v.videoWidth) { $('#rrEstado').textContent = 'La cámara aún no está lista.'; return; }
    $('#rrTomar').disabled = true;
    const cuenta = $('#rrCuenta'); cuenta.hidden = false;
    for (let n = 3; n > 0; n--) {
      cuenta.textContent = n; cuenta.classList.remove('pulso'); void cuenta.offsetWidth; cuenta.classList.add('pulso');
      await new Promise(r => setTimeout(r, 800));
    }
    cuenta.hidden = true;
    const fl = $('#rrFlash'); fl.classList.remove('disparo'); void fl.offsetWidth; fl.classList.add('disparo');
    obturador();
    let data = null;
    try { data = caricatura(v); } catch (_) {}
    if (!data) { $('#rrEstado').textContent = 'No se pudo preparar la foto. Inténtalo de nuevo.'; $('#rrTomar').disabled = false; return; }
    guardarFoto(ctx.id, data);
    try { await api({ action: 'aut_guardar', id: ctx.id, fecha: ctx.fecha, decision: 'si' }); } catch (_) {}
    ctx.foto = true;
    setTimeout(() => pantallaFinal(data, '¡Listo! Esta será la imagen de ' + ctx.nombre + '.'), 600);
  }

  function cerrar() {
    stop(); if (dlg.open) dlg.close();
    mostrarPerfil(ctx.id, ctx.nombre, ctx.foto);
    fin(ctx.continuar);
  }
  function fin(continuar) { corriendo = false; hecho = true; if (typeof continuar === 'function') continuar(); }

  async function flujo(continuar) {
    if (corriendo) return;
    if (hecho) { if (typeof continuar === 'function') continuar(); return; }
    const sel = $('#alumno'), id = sel && sel.value, fecha = $('#fecha2') && $('#fecha2').value;
    const nombre = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent.trim() : '';
    if (!id || !fecha) { if (typeof continuar === 'function') continuar(); return; }
    corriendo = true;
    let est = null;
    try { est = await api({ action: 'aut_consultar', id, fecha }); } catch (_) {}
    if (!est || !est.ok || !est.preguntar) {
      mostrarPerfil(id, nombre, est && est.estado === 'si');
      fin(continuar); return;
    }
    ctx = { id, fecha, nombre, continuar, foto: false };
    crear();
    $('#rrTitulo').textContent = 'Un recuerdo especial para ' + nombre;
    $('#rrTexto').textContent = (est.estado === 'no' ? 'Ha pasado un mes desde tu última respuesta. ' : '') +
      '¿Autorizas que tomemos una foto de tu hijo(a)? Es para darle más entusiasmo y un toque personal a esta página. Si no la autorizas, se usará una imagen genérica de niño o niña.';
    $('#rrConsentimiento').hidden = false; $('#rrCamara').hidden = true; $('#rrFinal').hidden = true;
    $('#rrAceptar').disabled = false; $('#rrRechazar').disabled = false; $('#rrTomar').disabled = true;
    dlg.showModal();
  }

  window.RRAutorizacion = { iniciar: (id, nombre, continuar) => flujo(continuar) };

  /* Se activa solo cuando el aula del niño se muestra */
  function vigilar() {
    const priv = $('#privado'); if (!priv) return;
    new MutationObserver(() => {
      if (priv.hidden) { hecho = false; corriendo = false; const p = $('#rrPerfil'); if (p) p.remove(); }
      else flujo();
    }).observe(priv, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar); else vigilar();
})();