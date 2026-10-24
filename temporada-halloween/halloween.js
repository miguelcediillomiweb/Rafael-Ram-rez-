/* Halloween temporal — Escuela Primaria Rafael Ramírez.
   Todo está aislado en temporada-halloween/ para retirarlo sin tocar el sitio escolar. */
(function(){
  'use strict';
  var A='./temporada-halloween/assets/',d=document,layer=null,docHeight=0,hangY=0,hangDir=1,last=0,lastMeasure=0;
  var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rnd(a,b){return a+Math.random()*(b-a);}
  function measure(){docHeight=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0);if(layer)layer.style.height=docHeight+'px';}
  function img(file,cls){var el=new Image();el.className=cls;el.alt='';el.decoding='async';el.draggable=false;el.src=A+file;el.onerror=function(){el.remove();};return el;}
  function start(){
    if(layer||!d.body)return;
    layer=d.createElement('div');layer.className='hwn-layer';layer.setAttribute('aria-hidden','true');d.body.appendChild(layer);measure();
    /* Esquina superior izquierda: araña fija. */
    d.body.appendChild(img('araña esquina.webp','hwn-corner hwn-spider-corner'));
    /* Esquina inferior derecha: calabaza bailando. */
    d.body.appendChild(img('calabaza bailando.webp','hwn-corner hwn-pumpkin-dance'));
    /* Esquina inferior izquierda: calabaza animada. */
    d.body.appendChild(img('calabaza.webp','hwn-corner hwn-pumpkin'));

    /* Araña colgante centrada: baja por todo el documento y vuelve a subir. */
    var thread=d.createElement('div');thread.className='hwn-hang-thread';d.body.appendChild(thread);
    var hanging=img('araña colgante.webp','hwn-hanging-spider');d.body.appendChild(hanging);
    function hangFrame(t){
      requestAnimationFrame(hangFrame);
      var dt=Math.min(.05,(t-(last||t))/1000);last=t;
      if(t-lastMeasure>1200){measure();lastMeasure=t;}
      var maxY=Math.max(0,window.innerHeight-(hanging.offsetHeight||100)-8);
      hangY+=hangDir*175*dt;
      if(hangY>=maxY){hangY=maxY;hangDir=-1;}if(hangY<=0){hangY=0;hangDir=1;}
      thread.style.height=hangY+'px';hanging.style.transform='translate(-50%,'+hangY+'px)';
    }
    requestAnimationFrame(hangFrame);

    /* Araña caminando: diferentes alturas, nueva aparición cada 5–11 segundos. */
    function walker(){
      if(d.hidden){setTimeout(walker,2200);return;}measure();
      var el=img('araña camina.webp','hwn-walker'),vw=innerWidth,w=Math.min(108,Math.max(60,vw*.15));
      var y=(pageYOffset||0)+rnd(35,Math.max(40,innerHeight-w-25)),lr=Math.random()<.5,x0=lr?-w:vw,x1=lr?vw:-w;
      el.style.top=Math.max(0,Math.min(docHeight-w,y))+'px';layer.appendChild(el);
      el.animate([{transform:'translateX('+x0+'px) scaleX('+(lr?1:-1)+')'},{transform:'translateX('+x1+'px) scaleX('+(lr?1:-1)+')'}],{duration:Math.abs(x1-x0)/rnd(78,132)*1000,easing:'linear'}).onfinish=function(){el.remove();setTimeout(walker,rnd(5000,11000));};
    }
    setTimeout(walker,rnd(2500,5000));

    /* Fantasma: atraviesa la pantalla a alturas aleatorias. */
    function ghost(){
      if(d.hidden){setTimeout(ghost,4000);return;}measure();
      var el=img('fantasma.webp','hwn-ghost'),vw=innerWidth,w=Math.min(120,Math.max(68,vw*.17));
      var y=(pageYOffset||0)+rnd(30,Math.max(40,innerHeight-w-20)),lr=Math.random()<.5,x0=lr?-w:vw,x1=lr?vw:-w;
      el.style.top=Math.max(0,Math.min(docHeight-w,y))+'px';layer.appendChild(el);
      el.animate([{transform:'translateX('+x0+'px)',opacity:0},{transform:'translateX('+(x0+(x1-x0)*.18)+'px)',opacity:.92,offset:.18},{transform:'translateX('+x1+'px)',opacity:0}],{duration:rnd(6500,10000),easing:'linear'}).onfinish=function(){el.remove();setTimeout(ghost,rnd(12000,22000));};
    }
    setTimeout(ghost,rnd(7000,13000));

    /* spider.webp: sorpresa ocasional en un punto aleatorio. */
    function spiderPop(){
      if(!d.hidden){measure();var el=img('spider.webp','hwn-pop-spider'),w=Math.min(116,Math.max(66,innerWidth*.16));
        el.style.left=rnd(8,Math.max(9,innerWidth-w-8))+'px';
        el.style.top=Math.max(0,Math.min(docHeight-w,(pageYOffset||0)+rnd(25,Math.max(30,innerHeight-w-20))))+'px';layer.appendChild(el);
        el.animate([{opacity:0,transform:'scale(.45) rotate(-15deg)'},{opacity:1,transform:'scale(1) rotate(5deg)',offset:.2},{opacity:1,transform:'scale(1) rotate(-5deg)',offset:.75},{opacity:0,transform:'scale(.72) rotate(12deg)'}],{duration:3000,easing:'ease-in-out'}).onfinish=function(){el.remove();};
      }
      setTimeout(spiderPop,rnd(25000,42000));
    }
    setTimeout(spiderPop,rnd(12000,20000));

    window.addEventListener('resize',measure,{passive:true});
    if(window.ResizeObserver&&d.body)new ResizeObserver(measure).observe(d.body);
    if(reduceMotion){video.pause();video.removeAttribute('autoplay');}
  }
  /* No mostrar decoraciones durante la pantalla inicial de la puerta. */
  function esperarEntrada(){
    if(!d.body){setTimeout(esperarEntrada,250);return;}
    if(d.getElementById('puerta')){setTimeout(esperarEntrada,250);return;}
    start();
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',esperarEntrada,{once:true});
  else esperarEntrada();
})();
