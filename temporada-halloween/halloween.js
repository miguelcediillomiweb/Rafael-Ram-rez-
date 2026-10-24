/* Halloween temporal — animaciones en una capa fija que no desplaza el documento. */
(function(){
 'use strict';
 var A='./temporada-halloween/assets/',d=document,layer=null,hangY=0,hangDir=1,last=0,footerObserver=null;
 var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function rnd(a,b){return a+Math.random()*(b-a);}
 function img(file,cls){var el=new Image();el.className=cls;el.alt='';el.decoding='async';el.draggable=false;el.src=A+file;el.onerror=function(){el.remove();};return el;}
 function start(){
  if(layer||!d.body||d.getElementById('puerta'))return;
  layer=d.createElement('div');layer.className='hwn-layer';layer.setAttribute('aria-hidden','true');d.body.appendChild(layer);
  /* Las esquinas están fijas al viewport y se ocultan al llegar al copyright. */
  var spiderCorner=img('araña esquina.webp','hwn-corner hwn-spider-corner');d.body.appendChild(spiderCorner);
  var pumpkinDance=img('calabaza bailando.webp','hwn-corner hwn-pumpkin-dance');d.body.appendChild(pumpkinDance);
  var pumpkin=img('calabaza.webp','hwn-corner hwn-pumpkin');d.body.appendChild(pumpkin);
  var footer=d.querySelector('footer');
  if(footer&&'IntersectionObserver'in window){
   footerObserver=new IntersectionObserver(function(entries){d.body.classList.toggle('hwn-footer-visible',entries.some(function(e){return e.isIntersecting;}));},{threshold:0.05});
   footerObserver.observe(footer);
  }
  /* Araña colgante: hilo e imagen fijos, animados dentro de la pantalla visible. */
  var thread=d.createElement('div');thread.className='hwn-hang-thread';d.body.appendChild(thread);
  var hanging=img('araña colgante.webp','hwn-hanging-spider');d.body.appendChild(hanging);
  function hangFrame(t){
   requestAnimationFrame(hangFrame);
   var dt=Math.min(.05,(t-(last||t))/1000);last=t;
   var h=hanging.getBoundingClientRect().height||80;
   var maxY=Math.max(0,Math.min(window.innerHeight-h-6,window.innerHeight*.62));
   hangY+=hangDir*145*dt;
   if(hangY>=maxY){hangY=maxY;hangDir=-1;}if(hangY<=0){hangY=0;hangDir=1;}
   thread.style.height=(hangY+4)+'px';hanging.style.transform='translate(-50%,'+hangY+'px)';
  }
  requestAnimationFrame(hangFrame);
  /* Araña caminando: recorre la pantalla visible; no usa coordenadas del documento. */
  function walker(){
   if(d.hidden){setTimeout(walker,2000);return;}
   var el=img('araña camina.webp','hwn-walker'),vw=window.innerWidth,w=Math.min(96,Math.max(52,vw*.13));
   var y=rnd(100,Math.max(105,window.innerHeight-w-90)),lr=Math.random()<.5,x0=lr?-w:vw,x1=lr?vw:-w;
   el.style.top=y+'px';layer.appendChild(el);
   var anim=el.animate([{transform:'translateX('+x0+'px) scaleX('+(lr?1:-1)+')'},{transform:'translateX('+x1+'px) scaleX('+(lr?1:-1)+')'}],{duration:Math.abs(x1-x0)/rnd(70,115)*1000,easing:'linear'});
   anim.onfinish=function(){el.remove();setTimeout(walker,rnd(5000,9500));};
  }
  /* Fantasma volador: atraviesa el viewport, incluso mientras se hace scroll. */
  function ghost(){
   if(d.hidden){setTimeout(ghost,3000);return;}
   var el=img('fantasma.webp','hwn-ghost'),vw=window.innerWidth,w=Math.min(108,Math.max(58,vw*.15));
   var y=rnd(110,Math.max(115,window.innerHeight-w-75)),lr=Math.random()<.5,x0=lr?-w:vw,x1=lr?vw:-w;
   el.style.top=y+'px';layer.appendChild(el);
   var anim=el.animate([{transform:'translateX('+x0+'px)',opacity:0},{transform:'translateX('+(x0+(x1-x0)*.18)+'px)',opacity:.95,offset:.18},{transform:'translateX('+x1+'px)',opacity:0}],{duration:rnd(6000,9000),easing:'linear'});
   anim.onfinish=function(){el.remove();setTimeout(ghost,rnd(10000,17000));};
  }
  /* Sorpresa ocasional de la araña pequeña. */
  function spiderPop(){
   if(!d.hidden){
    var el=img('spider.webp','hwn-pop-spider'),w=Math.min(104,Math.max(56,window.innerWidth*.14));
    el.style.left=rnd(8,Math.max(9,window.innerWidth-w-8))+'px';
    el.style.top=rnd(100,Math.max(105,window.innerHeight-w-70))+'px';layer.appendChild(el);
    var anim=el.animate([{opacity:0,transform:'scale(.45) rotate(-15deg)'},{opacity:1,transform:'scale(1) rotate(5deg)',offset:.2},{opacity:1,transform:'scale(1) rotate(-5deg)',offset:.75},{opacity:0,transform:'scale(.72) rotate(12deg)'}],{duration:2800,easing:'ease-in-out'});
    anim.onfinish=function(){el.remove();};
   }
   setTimeout(spiderPop,rnd(22000,35000));
  }
  if(!reduceMotion){setTimeout(walker,1200);setTimeout(ghost,2500);setTimeout(spiderPop,9000);}
 }
 /* No activar ni mostrar decoración en la portada de la puerta. */
 function waitForDoor(){
  if(!d.body){setTimeout(waitForDoor,200);return;}
  var door=d.getElementById('puerta');
  if(door){var btn=d.getElementById('btnPuerta');if(btn)btn.addEventListener('click',function(){setTimeout(function(){if(!d.getElementById('puerta'))start();},1800);},{once:true});return;}
  start();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',waitForDoor,{once:true});else waitForDoor();
})();