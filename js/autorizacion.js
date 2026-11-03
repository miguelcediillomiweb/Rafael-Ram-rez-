/* Vista de cámara y recuerdo fotográfico. La imagen se procesa en el dispositivo; modo de prueba sin bloqueo de registro familiar. */
(() => {
  'use strict';
  const API='https://script.google.com/macros/s/AKfycbyizN5oq0LMc4uCabXVayS_6JsNM1HuWgWIZzwh_mlpHCu0oidYimuj1K4-eHc4Fcmz/exec';
  const $=s=>document.querySelector(s);
  let stream=null, alumno=null, dlg=null;
  const KEY='rr_recuerdo_';
  const stop=()=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}};
  async function api(params){
    const r=await fetch(API+'?'+new URLSearchParams(params),{cache:'no-store'});
    if(!r.ok) throw Error('No se pudo consultar el registro de autorización.');
    return r.json();
  }
  function crear(){
    if($('#rrAutorizacion')) return;
    const box=document.createElement('dialog'); box.id='rrAutorizacion';
    box.innerHTML=`
      <section class="rr-panel">
        <div class="rr-luces" aria-hidden="true">✦　✧　✦　✧　✦</div>
        <div class="rr-insignia">🏫</div>
        <p class="rr-kicker">ESCUELA PRIMARIA RAFAEL RAMÍREZ</p>
        <h2 id="rrTitulo">Un recuerdo especial</h2>
        <p id="rrTexto">¿Autorizas que tomemos una fotografía de tu hijo(a) para mostrarla en este espacio escolar?</p>
        <p class="rr-privacidad">La fotografía se procesa en este dispositivo. No se enviará ni se publicará en internet. Puedes elegir que no se tome.</p>
        <div class="rr-actions" id="rrConsentimiento">
          <button type="button" class="rr-si" id="rrAceptar">Sí, autorizo</button>
          <button type="button" class="rr-no" id="rrRechazar">No autorizo</button>
        </div>
        <div id="rrCamara" hidden>
          <div class="rr-camara-marco">
            <div class="rr-esquinas"></div><video id="rrVideo" autoplay muted playsinline></video>
            <div id="rrCuenta" class="rr-cuenta" hidden>3</div>
            <div id="rrFlash" class="rr-flash"></div>
          </div>
          <p id="rrEstado" class="rr-estado">Prepara tu mejor sonrisa 😊</p>
          <div class="rr-actions"><button type="button" class="rr-si" id="rrTomar">📸 Tomar fotografía</button><button type="button" class="rr-no" id="rrOmitir">Continuar sin foto</button></div>
          <canvas id="rrCanvas" hidden></canvas>
        </div>
        <div id="rrFinal" hidden><div class="rr-polaroid" id="rrPolaroid">🧒</div><p class="rr-estado">¡Listo! Tu recuerdo está preparado.</p><button type="button" class="rr-si" id="rrContinuar">Entrar al aula</button></div>
      </section>`;
    document.body.append(box); dlg=box;
    $('#rrAceptar').onclick=async()=>{await decidir('si');};
    $('#rrRechazar').onclick=async()=>{await decidir('no');};
    $('#rrTomar').onclick=capturar;
    $('#rrOmitir').onclick=()=>finalizar(null);
    $('#rrContinuar').onclick=()=>{stop();dlg.close();if(alumno?.continuar)alumno.continuar();};
    dlg.addEventListener('cancel',e=>{e.preventDefault();});
    dlg.addEventListener('close',stop);
  }
  function tono(frecuencia=880,duracion=.12,volumen=.045){
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      const ctx=new Ctx(),osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type='sine';osc.frequency.value=frecuencia;gain.gain.value=volumen;
      osc.connect(gain);gain.connect(ctx.destination);osc.start();
      gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duracion);
      osc.stop(ctx.currentTime+duracion);osc.onended=()=>ctx.close();
    }catch(_){}
  }
  async function decidir(valor){
    const b=$('#rrAceptar'); b.disabled=true;
    if(valor==='no'){finalizar(null);return;}
    $('#rrConsentimiento').hidden=true; $('#rrCamara').hidden=false;
    $('#rrEstado').textContent='Solicitando acceso a la cámara…';
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw Error('Este navegador no permite abrir la cámara desde esta página.');
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      $('#rrVideo').srcObject=stream;
      await $('#rrVideo').play();
      $('#rrEstado').textContent='¡Ya estás frente a la cámara! Cuando estés listo, toca Tomar fotografía.';
    }catch(e){
      $('#rrEstado').textContent='No se pudo abrir la cámara. Revisa el permiso del navegador y vuelve a intentarlo. '+(e.message||'');
      b.disabled=false;
    }
  }
  async function capturar(){
    const v=$('#rrVideo'); if(!stream||!v.videoWidth){$('#rrEstado').textContent='La cámara no está disponible. Puedes continuar sin fotografía.';return;}
    const btn=$('#rrTomar');btn.disabled=true;
    const cuenta=$('#rrCuenta');cuenta.hidden=false;
    for(let n=3;n>0;n--){cuenta.textContent=n;cuenta.classList.remove('pulso');void cuenta.offsetWidth;cuenta.classList.add('pulso');tono(560+n*120,.13);await new Promise(r=>setTimeout(r,850));}
    cuenta.hidden=true;tono(1150,.22,.07);$('#rrFlash').classList.remove('disparo');void $('#rrFlash').offsetWidth;$('#rrFlash').classList.add('disparo');
    try{const c=$('#rrCanvas'),scale=Math.min(1,900/Math.max(v.videoWidth,v.videoHeight));c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);
      const ctx=c.getContext('2d');ctx.filter='saturate(1.12) contrast(1.04) brightness(1.03)';ctx.drawImage(v,0,0,c.width,c.height);
      const data=c.toDataURL('image/jpeg',.86);localStorage.setItem(KEY+alumno.id,data);finalizar(data);
    }catch(_){$('#rrEstado').textContent='No se pudo preparar la fotografía en este dispositivo.';btn.disabled=false;}
  }
  function finalizar(data){
    stop();$('#rrConsentimiento').hidden=true;$('#rrCamara').hidden=true;$('#rrFinal').hidden=false;
    const pol=$('#rrPolaroid');pol.replaceChildren();
    if(data){const img=document.createElement('img');img.src=data;img.alt='Recuerdo fotográfico';pol.append(img);}
    else pol.textContent='🧒';
  }
  window.RRAutorizacion={
    async iniciar(id,nombre,continuar){
      crear();alumno={id:String(id),nombre,continuar};
      $('#rrTitulo').textContent='Un recuerdo especial para '+nombre;
      $('#rrTexto').textContent='¿Autorizas que tomemos una fotografía de tu hijo(a) para mostrarla en este espacio escolar?';
      $('#rrConsentimiento').hidden=false;$('#rrCamara').hidden=true;$('#rrFinal').hidden=true;$('#rrAceptar').disabled=false;
      $('#rrEstado').textContent='';$('#rrVideo').srcObject=null;
      // Modo de prueba visual: no consulta ni bloquea por el registro familiar.
      // La fotografía solo se toma después de pulsar expresamente "Sí, autorizo".
      dlg.showModal();
    }
  };
})();