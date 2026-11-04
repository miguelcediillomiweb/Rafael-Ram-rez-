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
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch(API + '?' + new URLSearchParams(params), { cache: 'no-store', signal: ac.signal });
      if (!r.ok) throw Error('red');
      return await r.json();
    } finally { clearTimeout(t); }
  }
  /* Guarda la decisión en el Sheets sin hacer esperar al papá (3 intentos) */
  async function guardarDecision(id, fecha, decision) {
    for (let i = 0; i < 3; i++) {
      try { const r = await api({ action: 'aut_guardar', id, fecha, decision }); if (r && r.ok) return true; } catch (_) {}
      await new Promise(r => setTimeout(r, 1500));
    }
    return false;
  }
  const stop = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };

  /* ===== Sonidos (se generan en el código, sin archivos) ===== */
  let AUD = null;
  function audio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!AUD) AUD = new AC();
      if (AUD.state === 'suspended') AUD.resume();
      return AUD;
    } catch (_) { return null; }
  }
  function ruido(a, dur) {
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  /* "fiuuu" cuando sube la camarita */
  function whoosh() {
    const a = audio(); if (!a) return; const t = a.currentTime;
    const s = a.createBufferSource(); s.buffer = ruido(a, .8);
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(2200, t + .55);
    const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .25); g.gain.linearRampToValueAtTime(0, t + .75);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  }
  function chasquido(a, t, dur, freq, vol) {
    const s = a.createBufferSource(); s.buffer = ruido(a, dur);
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  }
  /* Obturador mecánico de dos tiempos */
  function obturador() {
    const a = audio(); if (!a) return; const t = a.currentTime;
    chasquido(a, t, .04, 2500, .7);
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + .08);
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .1);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .12);
    chasquido(a, t + .11, .07, 1200, .55);
  }
  /* Motorcito que va y viene mientras imprime la foto */
  function motorcito() {
    const a = audio(); if (!a) return; const t0 = a.currentTime;
    for (let i = 0; i < 5; i++) {
      const t = t0 + i * .5, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(75 + i * 8, t); o.frequency.linearRampToValueAtTime(115 + i * 8, t + .18); o.frequency.linearRampToValueAtTime(85 + i * 8, t + .4);
      f.type = 'lowpass'; f.frequency.value = 600;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.14, t + .05); g.gain.setValueAtTime(.14, t + .34); g.gain.linearRampToValueAtTime(0, t + .42);
      o.connect(f); f.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .45);
    }
  }
  /* "Ding" alegre cuando termina */
  function ding() {
    const a = audio(); if (!a) return; const t = a.currentTime;
    [[1318.5, 0], [1760, .12]].forEach(([fr, d]) => {
      const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = fr;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.25, t + d + .01); g.gain.exponentialRampToValueAtTime(.001, t + d + 1.2);
      o.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + 1.3);
    });
  }

  /* ===== Efectos visuales ===== */
  function brillitos(esc) {
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('span'); b.className = 'rr-brillo'; b.textContent = i % 3 ? '✦' : '✨';
      b.style.left = (55 + Math.random() * 190) + 'px'; b.style.top = (5 + Math.random() * 190) + 'px';
      b.style.fontSize = (12 + Math.random() * 14) + 'px'; b.style.animationDelay = (Math.random() * 4) + 's';
      esc.append(b); setTimeout(() => b.remove(), 6000);
    }
  }
  function confeti(esc) {
    const col = ['#ff5e8a', '#ffc400', '#4aa3ff', '#7ee081', '#b57bff', '#ffffff'];
    for (let i = 0; i < 46; i++) {
      const c = document.createElement('i'); c.className = 'rr-conf';
      c.style.left = (Math.random() * 300) + 'px'; c.style.background = col[i % col.length];
      c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's'; c.style.animationDelay = (Math.random() * .6) + 's';
      c.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      esc.append(c); setTimeout(() => c.remove(), 4500);
    }
  }

  /* Estilos de la camarita instantánea (se agregan solos) */
  function estilosEscena() {
    if ($('#rrEstilosEscena')) return;
    const st = document.createElement('style'); st.id = 'rrEstilosEscena';
    st.textContent = `
      .rr-escena-wrap{position:relative;width:300px;height:380px;margin:0 auto}
      @media (max-width:380px){.rr-escena-wrap{zoom:.9}}
      .rr-escena{position:absolute;inset:0;overflow:hidden;border-radius:16px}
      .rr-cam{position:absolute;left:0;bottom:0;width:300px;height:230px;z-index:2;transform:translateY(125%)}
      .rr-cam.sube{transform:translateY(0);transition:transform 1s cubic-bezier(.2,1.25,.35,1)}
      .rr-card{position:absolute;z-index:1;left:75px;top:14px;width:150px;padding:32px 8px 12px;background:#fff;border:1px solid #e4dccb;box-shadow:0 6px 16px rgba(0,0,0,.25);transform:translateY(205px);visibility:hidden}
      .rr-card.sale{visibility:visible;transform:translateY(0);transition:transform 2.6s cubic-bezier(.35,.05,.25,1)}
      .rr-card img{display:block;width:100%;height:142px;object-fit:cover;background:#f1efe8;filter:brightness(2.8) saturate(.2) blur(9px);opacity:.15}
      .rr-card img.revela{filter:none;opacity:1;transition:filter 4.5s ease-in-out,opacity 4.5s ease-in}
      .rr-card-nombre{position:absolute;left:0;right:0;top:7px;min-height:20px;text-align:center;font:700 16px 'Segoe Print','Bradley Hand','Comic Sans MS',cursive;color:#27406e}
      .rr-escena-flash{position:absolute;inset:0;z-index:5;background:#fff;opacity:0;pointer-events:none}
      .rr-escena-flash.rr-dispara{animation:rrflash2 .9s ease-out}
      .rr-cam.rebote{animation:rrbote .5s ease-out}
      .rr-brillo{position:absolute;z-index:6;color:#ffd34d;opacity:0;pointer-events:none;text-shadow:0 0 8px #fff;animation:rrbrillo 1.2s ease-out forwards}
      .rr-conf{position:absolute;top:-12px;z-index:6;width:8px;height:12px;border-radius:2px;pointer-events:none;animation:rrconf 2.4s ease-in forwards}
      #rrcGlow,#rrcLG{opacity:0}
      .rr-cam.destello #rrcGlow,.rr-cam.destello #rrcLG{animation:rrdest .8s ease-out}
      .rr-escena.trabaja{animation:rrvibra .12s linear infinite}
      .rr-fin{opacity:0;pointer-events:none;transition:opacity .6s}
      .rr-fin.ya{opacity:1;pointer-events:auto}
      @keyframes rrflash2{0%{opacity:.95}18%{opacity:.15}32%{opacity:.75}100%{opacity:0}}
      @keyframes rrbote{0%,100%{transform:translateY(0)}30%{transform:translateY(-9px)}60%{transform:translateY(0)}80%{transform:translateY(-3px)}}
      @keyframes rrbrillo{0%{opacity:0;transform:scale(.2) rotate(0)}40%{opacity:1;transform:scale(1.2) rotate(90deg)}100%{opacity:0;transform:scale(.6) rotate(180deg)}}
      @keyframes rrconf{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:1;transform:translate(var(--dx,0),400px) rotate(720deg)}}
      @keyframes rrdest{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
      @keyframes rrvibra{0%{transform:translate(0,0)}25%{transform:translate(1px,0)}50%{transform:translate(0,1px)}75%{transform:translate(-1px,0)}100%{transform:translate(0,0)}}`;
    document.head.append(st);
  }

  const SVG_CAMARA = `
    <svg class="rr-cam" id="rrCam" viewBox="0 0 300 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="rrcBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d3f6"/><stop offset="1" stop-color="#6a98de"/></linearGradient>
        <radialGradient id="rrcLens" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4d74b8"/><stop offset=".55" stop-color="#14284f"/><stop offset="1" stop-color="#091226"/></radialGradient>
        <radialGradient id="rrcGl"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <clipPath id="rrcClip"><rect x="22" y="40" width="256" height="180" rx="36"/></clipPath>
      </defs>
      <ellipse cx="150" cy="224" rx="125" ry="7" fill="rgba(0,0,0,.18)"/>
      <path d="M36 80 C6 98 2 152 18 198 C24 212 40 210 38 196 C30 162 32 120 54 94 Z" fill="#7fa6df" stroke="#5c84c2" stroke-width="2"/>
      <path d="M31 94 C16 122 16 162 26 194" fill="none" stroke="#a9c6ee" stroke-width="2" stroke-dasharray="4 4"/>
      <rect x="12" y="128" width="26" height="34" rx="6" fill="#e9d4ae" stroke="#bfa273" stroke-width="2" transform="rotate(-8 25 145)"/>
      <circle cx="25" cy="137" r="3" fill="#bfa273"/>
      <rect x="22" y="40" width="256" height="180" rx="36" fill="url(#rrcBody)" stroke="#5d88cc" stroke-width="3"/>
      <rect x="30" y="47" width="240" height="24" rx="12" fill="#fff" opacity=".3"/>
      <rect x="22" y="192" width="256" height="30" fill="rgba(20,50,110,.16)" clip-path="url(#rrcClip)"/>
      <rect x="76" y="34" width="148" height="12" rx="6" fill="#36588f"/>
      <rect x="80" y="40" width="140" height="4" rx="2" fill="#1f3a66"/>
      <rect x="46" y="62" width="42" height="30" rx="8" fill="#f7f2e8" stroke="#cdbb97" stroke-width="2"/>
      <rect x="52" y="67" width="14" height="8" rx="3" fill="#fff"/>
      <rect x="100" y="64" width="26" height="26" rx="7" fill="#33496f"/>
      <rect x="104" y="68" width="10" height="7" rx="3" fill="#8fb1e8" opacity=".8"/>
      <path d="M250 92 C232 80 232 63 243 61 C247 60 250 64 250 67 C250 64 253 60 257 61 C268 63 268 80 250 92 Z" fill="#3d6fc4"/>
      <circle cx="172" cy="142" r="66" fill="#dbe8f9" stroke="#5d88cc" stroke-width="3"/>
      <circle cx="172" cy="142" r="58" fill="#f3e8d3" stroke="#cfbb95" stroke-width="2"/>
      <circle cx="172" cy="142" r="48" fill="#e5d6b8"/>
      <circle cx="172" cy="142" r="40" fill="#1c2f58"/>
      <circle cx="172" cy="142" r="33" fill="url(#rrcLens)"/>
      <ellipse cx="160" cy="130" rx="11" ry="7" fill="#fff" opacity=".75" transform="rotate(-30 160 130)"/>
      <circle cx="187" cy="157" r="4" fill="#fff" opacity=".35"/>
      <circle id="rrcGlow" cx="67" cy="77" r="78" fill="url(#rrcGl)"/>
      <circle id="rrcLG" cx="172" cy="142" r="62" fill="url(#rrcGl)"/>
    </svg>`;

  /* Escena: sube la camarita, dispara el flash, imprime y la foto se va revelando */
  function escenaCamara(data, texto) {
    stop();
    estilosEscena();
    $('#rrConsentimiento').hidden = true; $('#rrCamara').hidden = true; $('#rrFinal').hidden = false;
    $('#rrPolaroid').hidden = true;
    const wrap = $('#rrEscenaWrap'); wrap.hidden = false;
    wrap.innerHTML = '<div class="rr-escena" id="rrEscena"><div class="rr-card" id="rrCard"><img id="rrCardImg" alt="Foto"><div class="rr-card-nombre" id="rrCardNombre"></div></div>' +
      SVG_CAMARA + '<div class="rr-escena-flash" id="rrEscFlash"></div></div>';
    const esc = $('#rrEscena'), cam = $('#rrCam'), card = $('#rrCard'), img = $('#rrCardImg'), nom = $('#rrCardNombre'), fl = $('#rrEscFlash'), fin = $('#rrFin');
    img.src = data; $('#rrFinalTxt').textContent = texto; fin.classList.remove('ya');
    const normal = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const T = (ms, fn) => setTimeout(fn, normal ? ms : 30);
    let terminado = false;
    const final = () => { if (terminado) return; terminado = true; fin.classList.add('ya'); ding(); if (normal) confeti(esc); };
    const escribir = () => {
      const nombre = ctx.nombre || ''; let i = 0;
      if (!nombre) { final(); return; }
      const iv = setInterval(() => { nom.textContent = nombre.slice(0, ++i); if (i >= nombre.length) { clearInterval(iv); final(); } }, 110);
    };
    T(80, () => { cam.classList.add('sube'); whoosh(); });
    T(1150, () => cam.classList.add('rebote'));
    T(1500, () => { cam.classList.add('destello'); fl.classList.add('rr-dispara'); obturador(); });
    T(2200, () => { esc.classList.add('trabaja'); motorcito(); });
    T(2400, () => card.classList.add('sale'));
    T(5000, () => { esc.classList.remove('trabaja'); img.classList.add('revela'); if (normal) brillitos(esc); });
    T(5700, escribir);
    T(11000, final);
  }

  /* Convierte la foto en pop art: pocos colores planos, puntos de semitono y
     rasgos suavizados (no se distingue bien la cara). La foto original no se guarda. */
  function caricatura(v) {
    const W = 320, H = Math.round(W * v.videoHeight / v.videoWidth);
    const sw = 60, sh = Math.max(2, Math.round(sw * H / W));
    const s = document.createElement('canvas'); s.width = sw; s.height = sh;
    const sx = s.getContext('2d');
    sx.save(); sx.translate(sw, 0); sx.scale(-1, 1); sx.drawImage(v, 0, 0, sw, sh); sx.restore();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.filter = 'blur(2px)'; x.drawImage(s, 0, 0, W, H); x.filter = 'none';
    const d = x.getImageData(0, 0, W, H).data, n = W * H, lum = new Float32Array(n);
    for (let i = 0, p = 0; p < n; i += 4, p++) lum[p] = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
    /* ajusta contraste (5% más oscuro y 5% más claro) */
    const orden = Float32Array.from(lum).sort(), lo = orden[Math.floor(n * .05)], hi = orden[Math.floor(n * .95)], rango = Math.max(30, hi - lo);
    const PAL = [[18, 22, 74], [226, 40, 96], [255, 190, 0], [255, 243, 214]];
    const out = x.createImageData(W, H), o = out.data, cel = 7, k = Math.SQRT1_2;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const p = y * W + xx, i = p * 4;
      const t = Math.min(.999, Math.max(0, (lum[p] - lo) / rango)) * 3;
      let nivel = Math.floor(t); const frac = t - nivel;
      /* puntos de semitono a 45° */
      const u = (xx + y) * k, w = (xx - y) * k;
      const du = (u % cel) - cel / 2, dw = (w % cel) - cel / 2;
      const dist = Math.sqrt(du * du + dw * dw) / (cel * .7071);
      if (frac > dist) nivel += 1;
      let col = PAL[nivel];
      if (xx > 0 && y > 0 && xx < W - 1 && y < H - 1) {
        const gx = -lum[p - W - 1] - 2 * lum[p - 1] - lum[p + W - 1] + lum[p - W + 1] + 2 * lum[p + 1] + lum[p + W + 1];
        const gy = -lum[p - W - 1] - 2 * lum[p - W] - lum[p - W + 1] + lum[p + W - 1] + 2 * lum[p + W] + lum[p + W + 1];
        if (Math.sqrt(gx * gx + gy * gy) > 70) col = PAL[0];
      }
      o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; o[i + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    return c.toDataURL('image/jpeg', .9);
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
            <div id="rrCuenta" class="rr-cuenta" style="display:none">3</div>
            <div id="rrFlash" class="rr-flash"></div>
          </div>
          <p id="rrEstado" class="rr-estado"></p>
          <div class="rr-actions">
            <button type="button" class="rr-si" id="rrTomar">📸 Tomar foto</button>
            <button type="button" class="rr-si" id="rrReintentar" hidden>🔄 Reintentar</button>
            <button type="button" class="rr-no" id="rrOmitir">Cancelar</button>
          </div>
        </div>
        <div id="rrFinal" hidden>
          <div class="rr-escena-wrap" id="rrEscenaWrap" hidden></div>
          <div class="rr-polaroid" id="rrPolaroid" hidden>🧒</div>
          <div class="rr-fin" id="rrFin">
            <p class="rr-estado" id="rrFinalTxt"></p>
            <button type="button" class="rr-si" id="rrContinuar">Entrar</button>
          </div>
        </div>
      </section>`;
    document.body.append(dlg);
    $('#rrAceptar').onclick = abrirCamara;
    $('#rrRechazar').onclick = rechazar;
    $('#rrTomar').onclick = capturar;
    $('#rrReintentar').onclick = () => { $('#rrReintentar').hidden = true; abrirCamara(); };
    $('#rrOmitir').onclick = () => { stop(); $('#rrCamara').hidden = true; $('#rrConsentimiento').hidden = false; $('#rrAceptar').disabled = false; };
    $('#rrContinuar').onclick = cerrar;
    dlg.addEventListener('cancel', e => e.preventDefault());
    dlg.addEventListener('close', stop);
  }

  function pantallaFinal(data, texto) {
    stop();
    $('#rrConsentimiento').hidden = true; $('#rrCamara').hidden = true; $('#rrFinal').hidden = false;
    $('#rrEscenaWrap').hidden = true;
    const pol = $('#rrPolaroid'); pol.hidden = false; pol.replaceChildren(); pol.textContent = '🧒'; pol.classList.remove('revela');
    $('#rrFinalTxt').textContent = texto;
    $('#rrFin').classList.add('ya');
  }

  function rechazar() {
    $('#rrRechazar').disabled = true;
    ctx.foto = false;
    guardarDecision(ctx.id, ctx.fecha, 'no');
    pantallaFinal(null, 'Agradecemos la sinceridad de su respuesta. Puede acceder a la carpeta de actividades de su hijo(a). Usaremos una imagen genérica y, en un mes, le volveremos a preguntar por si cambia de opinión.');
  }

  async function abrirCamara() {
    $('#rrAceptar').disabled = true;
    $('#rrConsentimiento').hidden = true; $('#rrCamara').hidden = false;
    $('#rrReintentar').hidden = true; $('#rrTomar').disabled = true;
    $('#rrEstado').textContent = 'Preparando todo…';
    try {
      if (!window.isSecureContext) throw { name: 'SecurityError' };
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { name: 'SinSoporte' };
      const gum = o => navigator.mediaDevices.getUserMedia(o);
      try { stream = await gum({ video: { facingMode: 'user' }, audio: false }); }
      catch (e1) {
        if (e1 && (e1.name === 'OverconstrainedError' || e1.name === 'NotFoundError')) stream = await gum({ video: true, audio: false });
        else throw e1;
      }
      const v = $('#rrVideo'); v.srcObject = stream; await v.play();
      $('#rrEstado').textContent = 'Colóquense de frente a la cámara y toquen Tomar foto 😊';
      $('#rrTomar').disabled = false;
    } catch (e) {
      stop();
      const n = (e && e.name) || 'desconocido';
      let msg;
      if (n === 'NotAllowedError' || n === 'SecurityError') msg = 'La cámara está bloqueada para esta página. Toca el candado 🔒 junto a la dirección → Permisos → Cámara → Permitir, y luego toca Reintentar.';
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') msg = 'No se encontró una cámara en este dispositivo.';
      else if (n === 'NotReadableError' || n === 'AbortError') msg = 'La cámara la está usando otra app. Ciérrala y toca Reintentar.';
      else if (n === 'SinSoporte') msg = 'Este navegador no permite abrir la cámara. Abre la página en Chrome.';
      else msg = 'No se pudo abrir la cámara.';
      $('#rrEstado').textContent = msg + ' (Código: ' + n + ')';
      $('#rrReintentar').hidden = false;
    }
  }

  async function capturar() {
    const v = $('#rrVideo');
    if (!stream || !v.videoWidth) { $('#rrEstado').textContent = 'La cámara aún no está lista.'; return; }
    $('#rrTomar').disabled = true;
    const cuenta = $('#rrCuenta'); cuenta.style.display = 'grid';
    try {
      for (let n = 3; n > 0; n--) {
        cuenta.textContent = n; cuenta.classList.remove('pulso'); void cuenta.offsetWidth; cuenta.classList.add('pulso');
        await new Promise(r => setTimeout(r, 800));
      }
      cuenta.style.display = 'none';
      const data = caricatura(v);
      guardarFoto(ctx.id, data);
      ctx.foto = true;
      guardarDecision(ctx.id, ctx.fecha, 'si');
      escenaCamara(data, '¡Listo! Esta será la imagen de ' + ctx.nombre + '.');
    } catch (e) {
      cuenta.style.display = 'none';
      $('#rrEstado').textContent = 'No se pudo tomar la foto (' + ((e && e.message) || 'error') + '). Inténtalo de nuevo.';
      $('#rrTomar').disabled = false;
    }
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
    const prueba = /[?&]prueba=1/.test(location.search); /* modo de prueba: siempre pregunta */
    let est = null;
    if (prueba) est = { ok: true, preguntar: true, estado: 'nunca' };
    else { try { est = await api({ action: 'aut_consultar', id, fecha }); } catch (_) {} }
    if (!prueba && est && est.ok && est.preguntar && est.estado === 'nunca' && leerFoto(id)) {
      guardarDecision(id, fecha, 'si');
      mostrarPerfil(id, nombre, true);
      fin(continuar); return;
    }
    if (!est || !est.ok || !est.preguntar) {
      mostrarPerfil(id, nombre, est && est.estado === 'si');
      fin(continuar); return;
    }
    ctx = { id, fecha, nombre, continuar, foto: false };
    crear();
    $('#rrTitulo').textContent = 'Un recuerdo especial para ' + nombre;
    $('#rrTexto').textContent = (est.estado === 'no' ? 'Ha pasado un mes desde tu última respuesta. ' : '') +
      '¿Autorizas que tomemos una foto de frente de tu hijo(a)? Es para darle más entusiasmo y un toque personal a esta página. Si no la autorizas, se usará una imagen genérica de niño o niña.';
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