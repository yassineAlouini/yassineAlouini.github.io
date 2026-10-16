/* A little visitor, drawn locally on a click-through canvas. No libraries/assets.
   Layout anchors are read from the page; all coordinates are viewport-relative. */
(() => {
  "use strict";
  const canvas = document.querySelector("#sidebar-cat"), button = document.querySelector(".cat-rest");
  if (!canvas || !button) return;
  const ctx = canvas.getContext("2d"), motion = matchMedia("(prefers-reduced-motion: reduce)");
  const $ = s => document.querySelector(s);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const color = {ink:"#193653", fur:"#91a0af", light:"#d2d8de", white:"#f6f4ed", gold:"#b69a70", pink:"#d88fa6", shadow:"#edf1f5"};
  const scenes = [["ball",8],["reactor",10],["mouse",10],["sections",10],["matrix",8],["book",10],["groom",5],["nap",8]];
  const cat = {x:0,y:0,face:-1,moving:false,pose:"sit"};
  const ball = {x:0,y:0,vx:0,vy:0,angle:0};
  let layout, path=[], scene=0, elapsed=0, arrived=0, time=0, last=0, raf=0, resting=false, initialized=false;
  let mouse={x:0,y:0}, batted=false, dirty=true;

  function bounds(selector) { return $(selector)?.getBoundingClientRect(); }
  function measure() {
    const main=bounds("main"), links=bounds(".resource-links"), intro=bounds(".intro");
    const reactor=bounds(".reactor:not(.matrix)"), matrix=bounds(".matrix");
    const tags=[...document.querySelectorAll(".intro .tag")];
    const tag=tags[tags.length-1]?.getBoundingClientRect(), book=bounds(".book-link");
    if (!main || !links || !intro) return;
    const previous=layout;
    const compact=innerWidth-main.right<86;
    const ground=compact?links.bottom+65:intro.bottom+29;
    layout={compact, ground, home:clamp(main.right+57,42,innerWidth-38),
      min:compact?44:main.right+34, max:innerWidth-36,
      reactor:{x:reactor.left+reactor.width*.62,y:reactor.bottom+10},
      matrix:{x:matrix.right-20,y:matrix.bottom+10},
      sections:{x:Math.min(tag.right+43,intro.right-40),y:tag.bottom+5},
      book:{x:Math.min(book.right+46,main.right-35),y:book.bottom+4}};
    if (compact) { layout.home=innerWidth-55; layout.min=42; }
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(innerWidth*dpr); canvas.height=Math.round(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (!initialized) {
      cat.x=layout.home; cat.y=ground;
      ball.x=cat.x-48;ball.y=ground-7;
      initialized=true;
    }
    if (initialized && previous) {
      if (previous.compact !== compact) { cat.x=layout.home;cat.y=ground; }
      else {
        const shift=ground-previous.ground;
        cat.y+=shift;ball.y+=shift;mouse.y+=shift;
      }
    }
    cat.x=clamp(cat.x,34,innerWidth-34);
    dirty=false;
  }
  function clearReaction() { document.querySelectorAll(".cat-curious").forEach(e=>e.classList.remove("cat-curious")); }
  function plan() {
    clearReaction(); arrived=0;batted=false;
    const kind=scenes[scene][0];
    let goal=layout[kind]||{x:layout.home,y:layout.ground};
    if(layout.compact) goal={x:layout.home,y:layout.ground};
    // Cross the page at the destination's height, using the outside margin first.
    path=[{x:layout.home,y:cat.y},{x:layout.home,y:goal.y},goal];
    if(kind==="ball") {ball.x=layout.home-44;ball.y=layout.ground-7;ball.vx=0;ball.vy=0;}
    canvas.dataset.activity=layout.compact&&["reactor","sections","matrix","book"].includes(kind)?"ball":kind;
  }
  function move(target,dt,speed=180) {
    const dx=target.x-cat.x,dy=target.y-cat.y,d=Math.hypot(dx,dy);
    if(Math.abs(dx)>1)cat.face=dx>0?1:-1;
    if(d<speed*dt+1){cat.x=target.x;cat.y=target.y;return true;}
    cat.x+=dx/d*speed*dt;cat.y+=dy/d*speed*dt;return false;
  }
  function update(dt) {
    time+=dt;
    if(resting||motion.matches) {canvas.dataset.activity="nap";cat.pose="sleep";cat.moving=false;cat.x=layout.home;cat.y=layout.ground;return;}
    elapsed+=dt;
    if(elapsed>scenes[scene][1]) {scene=(scene+1)%scenes.length;elapsed=0;plan();}
    let kind=scenes[scene][0];
    if(layout.compact&&["reactor","sections","matrix","book"].includes(kind))kind="ball";
    cat.moving=false;cat.pose="stand";
    if(path.length) {
      cat.moving=true;
      if(move(path[0],dt,225))path.shift();
    } else {
      arrived+=dt;
      if(kind==="ball") {
        cat.face=ball.x>cat.x?1:-1;
        cat.pose=arrived%2.6<.6?"crouch":"paw";
        if(arrived>.7&&!batted){ball.vx=cat.face*135;ball.vy=-165;batted=true;}
        if(arrived>1.2)cat.moving=!move({x:clamp(ball.x-cat.face*46,layout.min,layout.max),y:layout.ground},dt,95);
      } else if(kind==="mouse") {
        const center=layout.compact?innerWidth*.55:(layout.min+layout.max)/2;
        const radius=layout.compact?Math.min(95,innerWidth*.27):Math.max(12,(layout.max-layout.min)/2-8);
        mouse.x=center+Math.sin(arrived*2.1)*radius;
        mouse.y=layout.ground+(layout.compact?0:55+Math.sin(arrived*1.1)*33);
        cat.moving=!move({x:clamp(mouse.x-18,32,innerWidth-32),y:mouse.y},dt,140);
        cat.pose=arrived%2<.4?"pounce":"crouch";
      } else if(kind==="nap")cat.pose="sleep";
      else if(kind==="groom")cat.pose="groom";
      else {
        cat.pose=arrived%1.5<.65?"paw":"sit";
        cat.face=kind==="sections"||kind==="book"?-1:1;
        const selector={reactor:".reactor:not(.matrix)",matrix:".matrix",sections:".intro .tags",book:".book-link"}[kind];
        if(selector)$(selector).classList.toggle("cat-curious",cat.pose==="paw");
        if(kind==="reactor"&&arrived>2&&arrived<2.8)cat.pose="startled";
      }
    }
    // A small bouncing ball with friction, bounded to the side play lane.
    if(kind==="ball") {
      ball.vy+=480*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      ball.angle+=ball.vx*dt/9;ball.vx*=Math.pow(.55,dt);
      if(ball.y>layout.ground-7){ball.y=layout.ground-7;ball.vy=-Math.abs(ball.vy)*.57;if(Math.abs(ball.vy)<10)ball.vy=0;}
      if(ball.x<layout.min-12||ball.x>layout.max+10){ball.x=clamp(ball.x,layout.min-12,layout.max+10);ball.vx*=-.8;}
    }
  }

  function box(x,y,w,h,c){ctx.fillStyle=color[c]||c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  function stroke(points,c,width=1){ctx.strokeStyle=color[c]||c;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  function polygon(points,c){ctx.fillStyle=color[c];ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function drawCat() {
    const pose=cat.pose, sleeping=pose==="sleep", sit=["sit","paw","groom","startled"].includes(pose);
    const gait=cat.moving?Math.sin(time*19):0;
    const hop=pose==="pounce"?Math.abs(Math.sin(time*8))*9:pose==="startled"?7:cat.moving?Math.abs(gait)*1.5:0;
    ctx.save();ctx.translate(Math.round(cat.x),Math.round(cat.y));
    ctx.fillStyle=color.shadow;ctx.beginPath();ctx.ellipse(0,1,sleeping?26:23,3,0,0,Math.PI*2);ctx.fill();
    ctx.scale(cat.face*2,2);ctx.translate(0,-hop/2);
    if(sleeping){
      // A curled loaf: tail wrapped across the paws, one tiny sleeping ear.
      box(-12,-8,22,7,"ink");box(-10,-10,16,10,"ink");box(-10,-8,17,7,"fur");
      box(4,-10,8,8,"ink");polygon([[4,-10],[4,-14],[8,-10]],"ink");
      box(5,-9,6,5,"light");stroke([[6,-7],[9,-7]],"ink");
      stroke([[-9,-4],[-3,-1],[5,-2],[8,-4]],"light",2);
      ctx.restore();
      if(!motion.matches){ctx.fillStyle=color.fur;ctx.font="11px Georgia,serif";ctx.fillText("z",cat.x+18,cat.y-22-Math.sin(time)*3);}
      return;
    }
    // Tail curls independently from the stride.
    const wag=Math.round(Math.sin(time*3)*3);
    stroke([[-9,-6],[-15,-7],[-17,-12],[-16,-17+wag],[-12,-18+wag]],"ink",4);
    stroke([[-10,-6],[-15,-8],[-16,-12],[-15,-16+wag],[-12,-17+wag]],"fur",2);
    if(sit){
      polygon([[-7,-14],[3,-15],[8,-7],[7,0],[-10,0],[-11,-5]],"ink");
      polygon([[-6,-13],[2,-13],[6,-6],[5,-1],[-8,-1],[-9,-5]],"fur");
      box(2,-11,3,10,"light");box(-9,-1,7,2,"ink");box(1,-1,7,2,"ink");
    }else{
      box(-12,-12,22,9,"ink");box(-11,-13,17,10,"fur");box(-8,-4,15,2,"light");
      for(const [x,offset] of [[-10,0],[-6,Math.PI],[4,Math.PI],[8,0]]){
        const step=cat.moving?Math.round(Math.sin(time*19+offset)*3):0;
        box(x+step,-4,3,5,"ink");box(x+step,0,4,1,"white");
      }
      box(-7,-13,2,4,"ink");box(-2,-13,2,3,"ink");
    }
    // Large pointed ears, tabby stripes, white cheeks and a pink nose.
    const hx=sit?3:9,hy=sit?-19:-17;
    polygon([[hx-7,hy+4],[hx-7,hy-8],[hx-2,hy-5],[hx+3,hy-5],[hx+7,hy-9],[hx+8,hy+4],[hx+4,hy+8],[hx-3,hy+8]],"ink");
    polygon([[hx-5,hy+3],[hx-5,hy-4],[hx-1,hy-2],[hx+4,hy-3],[hx+5,hy-5],[hx+6,hy+3],[hx+3,hy+6],[hx-2,hy+6]],"fur");
    polygon([[hx-5,hy-5],[hx-5,hy-1],[hx-2,hy-2]],"pink");polygon([[hx+4,hy-3],[hx+6,hy-6],[hx+6,hy-1]],"pink");
    box(hx-1,hy-3,1,3,"ink");box(hx+2,hy-3,1,2,"ink");box(hx-4,hy+3,9,3,"white");
    if(pose==="groom"||Math.floor(time*3)%19===0){box(hx-4,hy,2,1,"ink");box(hx+3,hy,2,1,"ink");}
    else{box(hx-4,hy-1,2,3,"ink");box(hx+3,hy-1,2,3,"ink");box(hx-4,hy-1,1,1,"gold");box(hx+3,hy-1,1,1,"gold");}
    box(hx,hy+3,2,1,"pink");box(hx+1,hy+4,1,2,"ink");
    stroke([[hx-7,hy+2],[hx-3,hy+3]],"ink");stroke([[hx+5,hy+3],[hx+9,hy+2]],"ink");
    if(["paw","groom","startled"].includes(pose)){
      const reach=pose==="paw"?6:pose==="groom"?0:3;
      stroke([[4,-8],[9,-11],[11+reach,-13]],"ink",4);
      stroke([[4,-8],[9,-11],[11+reach,-13]],"light",2);
      box(11+reach,-14,3,2,"white");
    }
    ctx.restore();
    if(pose==="startled"){ctx.fillStyle=color.gold;ctx.font="18px Georgia,serif";ctx.fillText("!",cat.x+cat.face*20,cat.y-57);}
  }
  function drawBall(){
    ctx.save();ctx.translate(Math.round(ball.x),Math.round(ball.y));ctx.rotate(ball.angle*.15);
    ctx.fillStyle=color.gold;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();
    stroke([[-6,-2],[6,2]],"ink",2);stroke([[-2,-6],[2,6]],"white",2);ctx.restore();
  }
  function drawMouse(){
    ctx.save();ctx.translate(Math.round(mouse.x),Math.round(mouse.y-4));ctx.scale(Math.cos(arrived*2.1)<0?-1:1,1);
    stroke([[-8,0],[-16,-3],[-19,0],[-17,4]],"gold",2);
    polygon([[-10,1],[-7,-6],[2,-6],[9,-1],[7,3],[-7,4]],"fur");
    box(-2,-9,5,5,"light");box(6,-2,2,2,"ink");box(9,0,2,2,"pink");
    stroke([[-6,-3],[2,2]],"white");stroke([[-2,-6],[-2,-12],[1,-12],[1,-9]],"gold");
    ctx.restore();
  }
  function render(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    if(!layout)return;
    const kind=canvas.dataset.activity;
    drawCat();
    if(!resting&&!motion.matches&&kind==="ball")drawBall();
    if(!resting&&!motion.matches&&kind==="mouse"&&path.length===0)drawMouse();
  }
  function tick(now){
    raf=0;if(document.hidden)return;
    if(now-last<1000/30){raf=requestAnimationFrame(tick);return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(dirty){measure();plan();}
    update(dt);render();
    const offscreen=layout.compact&&(layout.ground < -60 || layout.ground > innerHeight+60);
    if(!resting&&!motion.matches&&!offscreen)raf=requestAnimationFrame(tick);
  }
  function wake(){if(!raf){last=0;raf=requestAnimationFrame(tick);}}
  function rest(){
    resting=!resting;clearReaction();
    button.setAttribute("aria-pressed",String(resting));
    button.setAttribute("aria-label",resting?"Wake the cat":"Let the cat nap");
    button.title=resting?"Wake the cat":"Let the cat nap";
    if(resting)canvas.dataset.activity="nap";
    else {elapsed=0;scene=0;plan();}
    wake();
  }
  button.addEventListener("click",rest);
  for(const event of ["resize","scroll"])addEventListener(event,()=>{dirty=true;wake();},{passive:true});
  motion.addEventListener("change",()=>{clearReaction();dirty=true;wake();});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;clearReaction();}
    else wake();
  });
  // Click an empty side margin to roll the ball; links keep their normal behavior.
  document.addEventListener("pointerup",e=>{
    if(motion.matches||resting||layout.compact||e.target.closest("a,button,input,select,textarea"))return;
    if(e.clientX<layout.min-20)return;
    scene=0;elapsed=0;plan();path=[];
    ball.x=clamp(e.clientX,layout.min,layout.max);ball.y=Math.min(e.clientY,layout.ground-7);
    ball.vx=(cat.x-ball.x)*1.4;ball.vy=-100;batted=false;wake();
  });
  measure();plan();button.hidden=false;wake();
})();
