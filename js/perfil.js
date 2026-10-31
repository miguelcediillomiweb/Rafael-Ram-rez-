/* Perfil familiar: la imagen permanece en este dispositivo; nunca se envía a la API escolar. */
(() => {
  'use strict';
  const KEY = 'rafaelRamirez_perfil_familiar_foto_v1';
  const $ = (s, root=document) => root.querySelector(s);
  let stream = null;
  let fotoPendiente = '';
  const fab = document.createElement('button');
  fab.id = 'perfilFamiliaFab'; fab.type = 'button';
  fab.setAttribute('aria-haspopup','dialog');
  fab.innerHTML = '<span class="pf-mini" id="pfMini" aria-hidden="true">👨‍👩‍👧</span><span>Perfil familiar</span>';
  const dlg = document.createElement('dialog');
  dlg.id = 'perfilFamiliaDlg';
  dlg.setAttribute('aria-labelledby','pfTitulo');
  dlg.innerHTML = '<div class="pf-head"><h2 id="pfTitulo">Foto de perfil familiar</h2><p>Personaliza este dispositivo con una foto.</p></div><div class="pf-body"><div class="pf-preview" id="pfPreview" aria-label="Vista previa de la foto">👨‍👩‍👧</div><video class="pf-camera" id="pfCamera" autoplay playsinline muted aria-label="Vista de cámara"></video><div class="pf-actions"><button class="pf-primary" id="pfAbrirCam" type="button">📷 Tomar foto</button><button class="pf-secondary" id="pfElegir" type="button">🖼️ Elegir imagen</button><button class="pf-primary" id="pfCapturar" type="button" hidden>Usar esta foto</button><button class="pf-secondary" id="pfCancelarCam" type="button" hidden>Cancelar cámara</button><button class="pf-danger" id="pfQuitar" type="button">🗑️ Quitar foto</button><button class="pf-secondary" id="pfGuardar" type="button" hidden>Guardar foto</button></div><input id="pfArchivo" type="file" accept="image/*" hidden><p class="pf-note">Privacidad: la foto se guarda únicamente en el almacenamiento local de este navegador. No se envía a la escuela ni se sube a internet. Usa una foto solo si tienes autorización para hacerlo.</p><p class="pf-status" id="pfEstado" role="status" aria-live="polite"></p><button class="pf-close" id="pfCerrar" type="button">Cerrar</button></div>';
  document.body.append(fab, dlg);
  const preview = $('#pfPreview',dlg), video = $('#pfCamera',dlg), file = $('#pfArchivo',dlg);
  const status = $('#pfEstado',dlg);
  function stopCamera(){ if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;} video.srcObject=null; video.classList.remove('activa'); $('#pfCapturar',dlg).hidden=true; $('#pfCancelarCam',dlg).hidden=true; }
  function showPhoto(data){ const img=document.createElement('img'); img.alt='Foto de perfil seleccionada'; img.src=data; preview.replaceChildren(img); $('#pfMini').replaceChildren(Object.assign(document.createElement('img'),{src:data,alt:''})); }
  function showDefault(){preview.textContent='👨‍👩‍👧';$('#pfMini').textContent='👨‍👩‍👧';}
  function compressImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const max=640,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.78));};img.onerror=()=>reject(new Error('No se pudo abrir esa imagen.'));img.src=src;});}
  function setPending(data){fotoPendiente=data;showPhoto(data);$('#pfGuardar',dlg).hidden=false;status.textContent='Vista previa lista. Pulsa “Guardar foto” para conservarla en este dispositivo.';}
  try{const saved=localStorage.getItem(KEY);if(saved)showPhoto(saved);else showDefault();}catch(_){showDefault();}
  fab.addEventListener('click',()=>{status.textContent='';fotoPendiente='';$('#pfGuardar',dlg).hidden=true;if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');});
  $('#pfAbrirCam',dlg).addEventListener('click',async()=>{status.textContent='Solicitando permiso de cámara…';try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no permite abrir la cámara. Puedes elegir una imagen de tu galería.');stopCamera();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});video.srcObject=stream;video.classList.add('activa');$('#pfCapturar',dlg).hidden=false;$('#pfCancelarCam',dlg).hidden=false;status.textContent='Cuando estés listo, pulsa “Usar esta foto”.';}catch(e){status.textContent=e.name==='NotAllowedError'?'No se concedió permiso de cámara. Puedes elegir una imagen de la galería.':(e.message||'No se pudo abrir la cámara.');}});
  $('#pfCapturar',dlg).addEventListener('click',async()=>{if(!video.videoWidth)return;const c=document.createElement('canvas');const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));c.width=Math.round(video.videoWidth*scale);c.height=Math.round(video.videoHeight*scale);c.getContext('2d').drawImage(video,0,0,c.width,c.height);try{setPending(await compressImage(c.toDataURL('image/jpeg',.86)));stopCamera();}catch(e){status.textContent=e.message;}});
  $('#pfCancelarCam',dlg).addEventListener('click',()=>{stopCamera();status.textContent='Cámara cerrada.';});
  $('#pfElegir',dlg).addEventListener('click',()=>file.click());
  file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){status.textContent='Selecciona un archivo de imagen.';return;}try{setPending(await compressImage(URL.createObjectURL(f)));}catch(e){status.textContent=e.message;}finally{file.value='';}});
  $('#pfGuardar',dlg).addEventListener('click',()=>{if(!fotoPendiente)return;try{localStorage.setItem(KEY,fotoPendiente);showPhoto(fotoPendiente);fotoPendiente='';$('#pfGuardar',dlg).hidden=true;status.textContent='Foto guardada en este dispositivo.';}catch(_){status.textContent='No hay espacio disponible para guardar la foto. Prueba con otra imagen.';}});
  $('#pfQuitar',dlg).addEventListener('click',()=>{try{localStorage.removeItem(KEY);}catch(_){}fotoPendiente='';$('#pfGuardar',dlg).hidden=true;showDefault();status.textContent='Foto eliminada de este navegador.';});
  function close(){stopCamera();if(dlg.open)dlg.close();else dlg.removeAttribute('open');}
  $('#pfCerrar',dlg).addEventListener('click',close);
  dlg.addEventListener('cancel',stopCamera);
  dlg.addEventListener('close',stopCamera);
  dlg.addEventListener('click',e=>{if(e.target===dlg)close();});
})();
