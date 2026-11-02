/* Autorización familiar y recuerdo fotográfico. La imagen se procesa en el dispositivo. */
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
  async function decidir(valor){
    const b=$('#rrAceptar'); b.disabled=true; $('#rrEstado').textContent='Guardando autorización…';
    try{
      const result=await api({action:'autorizacion',operacion:'guardar',id:alumno.id,decision:valor});
      if(!result.ok) throw Error(result.error||'No se pudo guardar la decisión.');
      if(valor==='no'){finalizar(null);return;}
      $('#rrConsentimiento').hidden=true; $('#rrCamara').hidden=false;
      try{
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
        $('#rrVideo').srcObject=stream;
        $('#rrEstado').textContent='Cuando estés listo, toca el botón para iniciar la cuenta regresiva.';
      }catch(_){$('#rrEstado').textContent='No se pudo abrir la cámara. Puedes continuar sin fotografía.';}
    }catch(e){$('#rrEstado').textContent=e.message||'No se pudo guardar. Inténtalo de nuevo.';b.disabled=false;}
  }
  async function capturar(){
    const v=$('#rrVideo'); if(!stream||!v.videoWidth){$('#rrEstado').textContent='La cámara no está disponible. Puedes continuar sin fotografía.';return;}
    const btn=$('#rrTomar');btn.disabled=true;
    const cuenta=$('#rrCuenta');cuenta.hidden=false;
    for(let n=3;n>0;n--){cuenta.textContent=n;cuenta.classList.remove('pulso');void cuenta.offsetWidth;cuenta.classList.add('pulso');await new Promise(r=>setTimeout(r,850));}
    cuenta.hidden=true;$('#rrFlash').classList.add('disparo');
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
      try{
        const d=await api({action:'autorizacion',operacion:'consultar',id:alumno.id});
        if(!d.ok) throw Error(d.error||'No se pudo verificar la autorización.');
        if(d.decision==='si'){continuar();return;}
        if(d.decision==='no'&&d.vigente){continuar();return;}
        dlg.showModal();
      }catch(e){const msg=$('#msgAcceso');msg.className='msg err';msg.textContent='No se pudo verificar la autorización familiar. '+e.message;}
    }
  };
})();