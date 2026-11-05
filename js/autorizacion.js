/* Caricatura del niño con autorización del papá.
   La decisión se guarda en Google Sheets; la caricatura la prepara la escuela (Drive)
   y solo se entrega al papá cuando escribe la clave correcta. */
(() => {
  'use strict';
  const API = 'https://script.google.com/macros/s/AKfycbwyr82o7DdfFF_9gBSynpGquPPyBGkkr32xX_XxJomTip7OwB0x5ntxLgt2Nw-R4RxPaA/exec';
  const KEY = 'rr_perfil_';
  const VERSION = 'v8';
  const $ = s => document.querySelector(s);
  const esperar = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
  let dlg = null, ctx = {}, corriendo = false, hecho = false;

  /* ===== Conexión con Apps Script ===== */
  async function api(params, ms = 15000) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(API + '?' + new URLSearchParams(params), { cache: 'no-store', signal: ac.signal });
      if (!r.ok) throw Error('red');
      return await r.json();
    } finally { clearTimeout(t); }
  }
  async function guardarDecision(id, fecha, decision) {
    for (let i = 0; i < 3; i++) {
      try { const r = await api({ action: 'aut_guardar', id, fecha, decision }); if (r && r.ok) return true; } catch (_) {}
      await esperar(1500);
    }
    return false;
  }
  async function obtenerFoto(id, fecha) {
    try { const r = await api({ action: 'aut_foto', id, fecha }, 30000); return (r && r.ok && r.foto) ? r.foto : null; }
    catch (_) { return null; }
  }

  /* ===== Guardado en el celular ===== */
  const guardarFoto = (id, d) => { try { localStorage.setItem(KEY + id, d); localStorage.setItem(KEY + 'ts_' + id, String(Date.now())); } catch (_) {} };
  const leerFoto = id => { try { return localStorage.getItem(KEY + id); } catch (_) { return null; } };
  const marcarVisto = id => { try { localStorage.setItem(KEY + 'visto_' + id, '1'); } catch (_) {} };
  const yaVisto = id => { try { return localStorage.getItem(KEY + 'visto_' + id) === '1'; } catch (_) { return false; } };

  /* ===== Sonidos (se generan en el código) ===== */
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
  function tic(alto) {
    const a = audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = alto ? 1320 : 880;
    g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.001, t + .15);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .17);
  }
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
  function obturador() {
    const a = audio(); if (!a) return; const t = a.currentTime;
    chasquido(a, t, .04, 2500, .7);
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + .08);
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .1);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .12);
    chasquido(a, t + .11, .07, 1200, .55);
  }
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

  function estilos() {
    if ($('#rrEstilos')) return;
    const st = document.createElement('style'); st.id = 'rrEstilos';
    st.textContent = `
      #rrAutorizacion{position:fixed;width:min(92vw,440px);max-height:92dvh;overflow:auto;padding:0;border:2px solid #d4af37;border-radius:24px;background:#f7f9fd;color:#17243b;box-shadow:0 25px 90px #06132999}
      #rrAutorizacion::backdrop{background:rgba(4,13,31,.82);backdrop-filter:blur(4px)}
      .rr-panel{position:relative;padding:22px 20px;text-align:center}
      .rr-insignia{font-size:44px;animation:rrlat 1.6s ease-in-out infinite}
      .rr-kicker{margin:4px 0;font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.08em;color:#8a6d12}
      .rr-panel h2{margin:6px 0 10px;font-size:1.3rem;color:#14306b}
      .rr-panel p{margin:8px 0;line-height:1.5}
      .rr-estado{font-size:.95rem;color:#243a5e}
      .rr-actions{display:flex;flex-direction:column;gap:12px;margin-top:16px}
      .rr-actions button,#rrContinuar{border:0;border-radius:16px;padding:15px;font:800 17px system-ui,sans-serif;cursor:pointer}
      .rr-si,#rrContinuar{background:linear-gradient(135deg,#14306b,#234779);color:#fff;border:2px solid #d4af37!important}
      .rr-no{background:#e7ecf5;color:#17243b}
      .rr-actions button:disabled{opacity:.5}
      #rrAceptar{animation:rrpulsa 1.6s ease-in-out infinite}
      #rrRechazar{animation:rrsuave 2.4s ease-in-out infinite}
      .rr-ver{margin:12px 0 0!important;font-size:.7rem;color:#9aa8c2}
      #rrPrep .rr-visor{position:relative;margin:6px auto 0;width:min(100%,280px);aspect-ratio:3/4;border-radius:18px;background:linear-gradient(160deg,#0b1530,#1b3b7a);overflow:hidden}
      .rr-visor i{position:absolute;width:34px;height:34px;border:4px solid #fff;opacity:.9}
      .rr-visor i:nth-child(1){left:14px;top:14px;border-right:0;border-bottom:0;border-radius:10px 0 0 0}
      .rr-visor i:nth-child(2){right:14px;top:14px;border-left:0;border-bottom:0;border-radius:0 10px 0 0}
      .rr-visor i:nth-child(3){left:14px;bottom:14px;border-right:0;border-top:0;border-radius:0 0 0 10px}
      .rr-visor i:nth-child(4){right:14px;bottom:14px;border-left:0;border-top:0;border-radius:0 0 10px 0}
      .rr-cuenta2{position:absolute;inset:0;display:grid;place-items:center;font:900 110px system-ui,sans-serif;color:#fff;text-shadow:0 4px 24px #000}
      .rr-cuenta2.pulso{animation:rrpulso .8s ease-out}
      .rr-visor-txt{position:absolute;left:0;right:0;bottom:22px;color:#dce6fb;font:700 15px system-ui,sans-serif}
      .rr-pantallazo{position:absolute;inset:0;z-index:20;background:#fff;opacity:0;pointer-events:none;border-radius:22px}
      .rr-pantallazo.on{animation:rrpant .9s ease-out}
      .rr-polaroid{width:200px;min-height:200px;margin:8px auto;background:#fff;border-radius:6px;box-shadow:0 10px 26px #0004;display:grid;place-items:center;font-size:90px;transform:rotate(-3deg)}
      #rrPerfil{display:flex;align-items:center;gap:12px;margin:10px 0 14px;padding:10px 14px;background:#eaf0fb;border:2px solid #d4af37;border-radius:18px;text-align:left}
      #rrPerfil p{margin:0;font-weight:700;color:#14306b}
      .rr-avatar{flex:0 0 64px;width:64px;height:64px;border-radius:50%;overflow:hidden;border:3px solid #d4af37;background:#fff;display:grid;place-items:center;font-size:34px}
      .rr-avatar img{width:100%;height:100%;object-fit:cover;object-position:center top}
      .rr-escena-wrap{position:relative;width:300px;height:380px;margin:0 auto}
      @media (max-width:380px){.rr-escena-wrap{zoom:.9}}
      .rr-escena{position:absolute;inset:0;overflow:hidden;border-radius:16px}
      .rr-cam{position:absolute;left:0;bottom:0;width:300px;height:230px;z-index:2;transform:translateY(125%)}
      .rr-cam.sube{transform:translateY(0);transition:transform 1s cubic-bezier(.2,1.25,.35,1)}
      .rr-cam.rebote{animation:rrbote .5s ease-out}
      .rr-card{position:absolute;z-index:1;left:75px;top:14px;width:150px;padding:32px 8px 12px;background:#fff;border:1px solid #e4dccb;box-shadow:0 6px 16px rgba(0,0,0,.25);transform:translateY(205px);visibility:hidden}
      .rr-card.sale{visibility:visible;transform:translateY(0);transition:transform 2.6s cubic-bezier(.35,.05,.25,1)}
      .rr-card img{display:block;width:100%;height:142px;object-fit:cover;object-position:center top;background:#f1efe8;filter:brightness(2.8) saturate(.2) blur(9px);opacity:.15}
      .rr-card img.revela{filter:none;opacity:1;transition:filter 4.5s ease-in-out,opacity 4.5s ease-in}
      .rr-card-nombre{position:absolute;left:0;right:0;top:7px;min-height:20px;text-align:center;font:700 16px 'Segoe Print','Bradley Hand','Comic Sans MS',cursive;color:#27406e}
      .rr-escena-flash{position:absolute;inset:0;z-index:5;background:#fff;opacity:0;pointer-events:none}
      .rr-escena-flash.rr-dispara{animation:rrflash2 .9s ease-out}
      #rrcGlow,#rrcLG{opacity:0}
      .rr-cam.destello #rrcGlow,.rr-cam.destello #rrcLG{animation:rrdest .8s ease-out}
      .rr-escena.trabaja{animation:rrvibra .12s linear infinite}
      .rr-revela-txt{min-height:24px;margin:6px 0 0!important;font-weight:800;color:#14306b;transition:opacity .5s}
      .rr-fin{opacity:0;pointer-events:none;transition:opacity .6s}
      .rr-fin.ya{opacity:1;pointer-events:auto}
      .rr-brillo{position:absolute;z-index:6;color:#ffd34d;opacity:0;pointer-events:none;text-shadow:0 0 8px #fff;animation:rrbrillo 1.2s ease-out forwards}
      .rr-conf{position:absolute;top:-12px;z-index:6;width:8px;height:12px;border-radius:2px;pointer-events:none;animation:rrconf 2.4s ease-in forwards}
      @keyframes rrlat{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
      @keyframes rrpulsa{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(212,175,55,.6)}50%{transform:scale(1.04);box-shadow:0 0 0 10px rgba(212,175,55,0)}}
      @keyframes rrsuave{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      @keyframes rrpulso{0%{transform:scale(1.6);opacity:0}30%{opacity:1}100%{transform:scale(1);opacity:.9}}
      @keyframes rrpant{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
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

  /* ===== Imagen de perfil dentro de la carpeta del niño ===== */
  function mostrarPerfil(id, nombre, foto) {
    const priv = $('#privado'); if (!priv) return;
    const viejo = $('#rrPerfil'); if (viejo) viejo.remove();
    const box = document.createElement('div'); box.id = 'rrPerfil';
    const av = document.createElement('div'); av.className = 'rr-avatar';
    if (foto) { const img = document.createElement('img'); img.src = foto; img.alt = 'Caricatura de ' + nombre; av.append(img); }
    else av.textContent = '🧒';
    const t = document.createElement('p');
    t.append('Te encuentras en la página de evidencias de ');
    const b = document.createElement('b'); b.textContent = nombre; t.append(b);
    box.append(av, t); priv.prepend(box);
  }

  /* ===== Pantalla de autorización ===== */
  function crear() {
    estilos();
    if (dlg) return;
    dlg = document.createElement('dialog'); dlg.id = 'rrAutorizacion';
    dlg.innerHTML = `
      <section class="rr-panel">
        <div class="rr-pantallazo" id="rrPantallazo"></div>
        <div class="rr-insignia">📸</div>
        <p class="rr-kicker">ESCUELA PRIMARIA RAFAEL RAMÍREZ</p>
        <h2 id="rrTitulo">Un recuerdo especial</h2>
        <div id="rrConsentimiento">
          <p id="rrTexto"></p>
          <div class="rr-actions">
            <button type="button" class="rr-si" id="rrAceptar">✅ Sí, autorizo</button>
            <button type="button" class="rr-no" id="rrRechazar">No, gracias</button>
          </div>
        </div>
        <div id="rrPrep" hidden>
          <div class="rr-visor"><i></i><i></i><i></i><i></i><div class="rr-cuenta2" id="rrCuenta2"></div><div class="rr-visor-txt" id="rrVisorTxt">Preparando todo…</div></div>
        </div>
        <div id="rrFinal" hidden>
          <div class="rr-escena-wrap" id="rrEscenaWrap" hidden></div>
          <div class="rr-polaroid" id="rrPolaroid" hidden>🧒</div>
          <p class="rr-revela-txt" id="rrRevelaTxt" hidden></p>
          <div class="rr-fin" id="rrFin">
            <p class="rr-estado" id="rrFinalTxt"></p>
            <button type="button" class="rr-si" id="rrContinuar">Entrar</button>
          </div>
        </div>
        <p class="rr-ver">Versión ${VERSION}</p>
      </section>`;
    document.body.append(dlg);
    $('#rrAceptar').onclick = aceptar;
    $('#rrRechazar').onclick = rechazar;
    $('#rrContinuar').onclick = cerrar;
    dlg.addEventListener('cancel', e => e.preventDefault());
  }

  function mostrarSolo(id) {
    ['rrConsentimiento', 'rrPrep', 'rrFinal'].forEach(x => { $('#' + x).hidden = x !== id; });
  }

  function pantallaSimple(texto, emoji) {
    mostrarSolo('rrFinal');
    $('#rrEscenaWrap').hidden = true; $('#rrRevelaTxt').hidden = true;
    const pol = $('#rrPolaroid'); pol.hidden = false; pol.textContent = emoji || '🧒';
    $('#rrFinalTxt').textContent = texto;
    $('#rrFin').classList.add('ya');
  }

  function rechazar() {
    $('#rrRechazar').disabled = true; $('#rrAceptar').disabled = true;
    ctx.foto = null;
    guardarDecision(ctx.id, ctx.fecha, 'no');
    pantallaSimple('Agradecemos la sinceridad de su respuesta. Puede acceder a la carpeta de actividades de su hijo(a). Usaremos una imagen genérica y, en un mes, le volveremos a preguntar por si cambia de opinión.');
  }

  async function aceptar() {
    $('#rrAceptar').disabled = true; $('#rrRechazar').disabled = true;
    audio(); /* el toque habilita los sonidos */
    guardarDecision(ctx.id, ctx.fecha, 'si');
    $('#rrTitulo').textContent = 'Preparando todo…';
    mostrarSolo('rrPrep'); $('#rrCuenta2').textContent = ''; $('#rrVisorTxt').textContent = 'Preparando todo…';
    const [foto] = await Promise.all([obtenerFoto(ctx.id, ctx.fecha), esperar(1400)]);
    if (!foto) {
      $('#rrTitulo').textContent = 'Un recuerdo especial para ' + ctx.nombre;
      pantallaSimple('¡Gracias por autorizar! La caricatura de ' + ctx.nombre + ' todavía se está preparando. Por ahora verá una imagen genérica y se la mostraremos en cuanto esté lista.');
      return;
    }
    guardarFoto(ctx.id, foto); ctx.foto = foto;
    await animacion(foto);
  }

  /* Cuenta 3, 2, 1 → pantallazo blanco → sube la camarita → flash → imprime → revela */
  async function animacion(foto) {
    mostrarSolo('rrPrep');
    $('#rrVisorTxt').textContent = 'Mira hacia la cámara…';
    const c = $('#rrCuenta2');
    for (let n = 3; n > 0; n--) {
      c.textContent = n; c.classList.remove('pulso'); void c.offsetWidth; c.classList.add('pulso'); tic(false);
      await esperar(850);
    }
    c.textContent = ''; tic(true);
    const pant = $('#rrPantallazo'); pant.classList.remove('on'); void pant.offsetWidth; pant.classList.add('on');
    await esperar(260);
    escenaCamara(foto);
  }

  function escenaCamara(foto) {
    mostrarSolo('rrFinal'); $('#rrTitulo').textContent = 'Un recuerdo especial para ' + ctx.nombre;
    $('#rrPolaroid').hidden = true;
    const wrap = $('#rrEscenaWrap'); wrap.hidden = false;
    wrap.innerHTML = '<div class="rr-escena" id="rrEscena"><div class="rr-card" id="rrCard"><img id="rrCardImg" alt="Caricatura"><div class="rr-card-nombre" id="rrCardNombre"></div></div>' +
      SVG_CAMARA + '<div class="rr-escena-flash" id="rrEscFlash"></div></div>';
    const esc = $('#rrEscena'), cam = $('#rrCam'), card = $('#rrCard'), img = $('#rrCardImg'), nom = $('#rrCardNombre'),
      fl = $('#rrEscFlash'), fin = $('#rrFin'), rev = $('#rrRevelaTxt');
    img.src = foto; fin.classList.remove('ya'); rev.hidden = true;
    $('#rrFinalTxt').textContent = '¡Listo! Esta es la caricatura de ' + ctx.nombre + '.';
    const normal = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const T = (ms, fn) => setTimeout(fn, normal ? ms : 30);
    let terminado = false;
    const final = () => { if (terminado) return; terminado = true; fin.classList.add('ya'); ding(); marcarVisto(ctx.id); if (normal) confeti(esc); };
    const escribir = () => {
      const nombre = ctx.nombre || ''; let i = 0;
      if (!nombre) { final(); return; }
      const iv = setInterval(() => { nom.textContent = nombre.slice(0, ++i); if (i >= nombre.length) { clearInterval(iv); final(); } }, 110);
    };
    const porcentaje = () => {
      rev.hidden = false; const t0 = Date.now();
      const iv = setInterval(() => {
        const p = Math.min(100, Math.round((Date.now() - t0) / 4500 * 100));
        rev.textContent = p < 35 ? 'Revelando la imagen… ' + p + '%' : p < 80 ? 'Ya casi está lista… ' + p + '%' : p < 100 ? 'Un momento más… ' + p + '%' : '¡Lista! 100%';
        if (p >= 100) { clearInterval(iv); setTimeout(() => { rev.style.opacity = '0'; }, 900); }
      }, 150);
    };
    T(300, () => { cam.classList.add('sube'); whoosh(); });
    T(1350, () => cam.classList.add('rebote'));
    T(1700, () => { cam.classList.add('destello'); fl.classList.add('rr-dispara'); obturador(); });
    T(2400, () => { esc.classList.add('trabaja'); motorcito(); });
    T(2700, () => card.classList.add('sale'));
    T(5300, () => { esc.classList.remove('trabaja'); img.classList.add('revela'); if (normal) { brillitos(esc); porcentaje(); } });
    T(10000, escribir);
    T(14000, final);
  }

  function cerrar() {
    if (dlg.open) dlg.close();
    mostrarPerfil(ctx.id, ctx.nombre, ctx.foto);
    fin(ctx.continuar);
  }
  function fin(continuar) { corriendo = false; hecho = true; if (typeof continuar === 'function') continuar(); }

  /* Actualiza la caricatura guardada si cambió o si no existe (una vez por semana) */
  function refrescar(id, fecha, nombre) {
    let ts = 0; try { ts = Number(localStorage.getItem(KEY + 'ts_' + id) || 0); } catch (_) {}
    if (leerFoto(id) && Date.now() - ts < 6048e5) return;
    obtenerFoto(id, fecha).then(f => { if (f) { guardarFoto(id, f); mostrarPerfil(id, nombre, f); } });
  }

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

    /* Ya autorizó antes */
    if (est && est.ok && !est.preguntar && est.estado === 'si') {
      if (yaVisto(id)) { mostrarPerfil(id, nombre, leerFoto(id)); refrescar(id, fecha, nombre); fin(continuar); return; }
      const foto = await Promise.race([obtenerFoto(id, fecha), esperar(8000, null)]);
      if (!foto) { mostrarPerfil(id, nombre, null); fin(continuar); return; }
      guardarFoto(id, foto);
      ctx = { id, fecha, nombre, continuar, foto };
      crear(); $('#rrTitulo').textContent = 'Un recuerdo especial para ' + nombre; dlg.showModal();
      await animacion(foto);
      return;
    }
    /* Dijo que no (aún no toca volver a preguntar) o no hay conexión */
    if (!est || !est.ok || !est.preguntar) { mostrarPerfil(id, nombre, null); fin(continuar); return; }

    /* Primera vez (o ya pasó un mes desde su "no") */
    ctx = { id, fecha, nombre, continuar, foto: null };
    crear();
    $('#rrTitulo').textContent = 'Un recuerdo especial para ' + nombre;
    $('#rrTexto').textContent = (est.estado === 'no' ? 'Ha pasado un mes desde su última respuesta. ' : '') +
      'Para una mejor experiencia, mostraremos en su portal una caricatura de su hijo(a), elaborada por la escuela con cuidado y respeto a su privacidad. Solo usted la verá con su clave y no se publica. ¿Autoriza?';
    mostrarSolo('rrConsentimiento');
    $('#rrAceptar').disabled = false; $('#rrRechazar').disabled = false;
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
