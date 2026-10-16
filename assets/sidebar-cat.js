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
    function oval(x,y,rx,ry,c){ctx.fillStyle=color[c];ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function soft(points,c,width){ctx.lineCap="round";ctx.lineJoin="round";stroke(points,c,width);}
    ctx.save();ctx.translate(Math.round(cat.x),Math.round(cat.y));
    oval(0,1,sleeping?28:25,3,"shadow");
    ctx.scale(cat.face*2,2);ctx.translate(0,-hop/2);
    if(sleeping){
      // A round ball of fluff, with the tail tucked around a sleepy cheek.
      oval(-1,-6,14,8,"ink");oval(-1,-6.5,13,7,"fur");
      oval(-2,-7,9,5,"light");
      polygon([[5,-11],[5,-17],[10,-12],[14,-14],[14,-8]],"ink");
      oval(8,-9,7,6,"ink");oval(8,-9,6,5,"fur");
      oval(10,-7,4,2.5,"white");soft([[7,-9],[10,-9]],"ink",.8);
      oval(12,-7.5,1,.7,"pink");
      soft([[-11,-8],[-13,-4],[-8,-1],[0,0],[5,-2]],"ink",6);
      soft([[-11,-8],[-12,-4],[-8,-2],[0,-1],[5,-3]],"fur",4);
      soft([[-10,-6],[-10,-4]],"light",1.4);
      ctx.restore();
      if(!motion.matches){ctx.fillStyle=color.fur;ctx.font="11px Georgia,serif";ctx.fillText("z",cat.x+22,cat.y-24-Math.sin(time)*3);}
      return;
    }
    // A thick, softly curling tail with a pale fluffy tip.
    const wag=Math.sin(time*3)*2;
    ctx.lineCap="round";ctx.lineJoin="round";
    const tail=c=>{ctx.beginPath();ctx.moveTo(-9,-6);ctx.bezierCurveTo(-23,-3,-25,-16+wag,-18,-20+wag);ctx.bezierCurveTo(-15,-22+wag,-12,-20+wag,-13,-18+wag);ctx.strokeStyle=color[c];ctx.stroke();};
    ctx.lineWidth=8;tail("ink");ctx.lineWidth=6;tail("fur");
    soft([[-18,-20+wag],[-15,-21+wag],[-13,-20+wag]],"light",4);
    if(sit){
      oval(-2,-8,11,10,"ink");oval(-2,-8.5,10,9,"fur");
      oval(1,-7,6.5,8,"light");oval(2,-6,4.5,7,"white");
      // Small scallops break the silhouette into soft fur rather than hard corners.
      oval(-10,-6,3,3,"fur");oval(-8,-2,4,2,"fur");
      for(const x of [-7,4]){oval(x,0,4,2,"ink");oval(x,-.5,3.2,1.4,"white");}
      soft([[-9,-12],[-6,-11]],"ink",1.2);
    }else{
      oval(-2,-9,14,8,"ink");oval(-2,-9.5,13,7,"fur");
      oval(-1,-5.5,9,3.5,"light");
      for(const [x,offset] of [[-11,0],[-6,Math.PI],[4,Math.PI],[9,0]]){
        const step=cat.moving?Math.sin(time*19+offset)*3:0;
        soft([[x,-5],[x+step,-.5]],"ink",4);
        oval(x+step,.2,3,1.6,"ink");oval(x+step,-.1,2.2,1.1,"white");
      }
      soft([[-8,-14],[-7,-11]],"ink",1.5);soft([[-3,-15],[-2,-12]],"ink",1.4);
    }
    const hx=sit?3:9,hy=sit?-21:-19;
    // Short rounded ears, wide cheeks, a soft chin and a little cream neck ruff.
    polygon([[hx-8,hy-2],[hx-8,hy-10],[hx-6,hy-11],[hx-1,hy-6],[hx+4,hy-7],[hx+8,hy-11],[hx+10,hy-9],[hx+9,hy]],"ink");
    polygon([[hx-6,hy-3],[hx-6,hy-8],[hx-2,hy-5]],"pink");
    polygon([[hx+5,hy-5],[hx+8,hy-8],[hx+8,hy-2]],"pink");
    oval(hx,hy,10,8.5,"ink");oval(hx,hy-.5,9,7.5,"fur");
    oval(hx-8,hy+2,3,3.5,"fur");oval(hx+8,hy+2,3,3.5,"fur");
    oval(hx,hy+6,6,3,"light");
    polygon([[hx-5,hy+5],[hx-4,hy+10],[hx-1,hy+8],[hx+1,hy+11],[hx+4,hy+8],[hx+5,hy+5]],"white");
    oval(hx-3,hy+3,3.8,2.7,"white");oval(hx+3,hy+3,3.8,2.7,"white");
    for(const [dx,dy] of [[-3,-5],[0,-6],[3,-5]])soft([[hx+dx,hy+dy],[hx+dx*.7,hy+dy+2]],"ink",1.2);
    if(pose==="groom"||Math.floor(time*3)%19===0){
      soft([[hx-6,hy],[hx-3,hy+.5]],"ink",1);soft([[hx+3,hy+.5],[hx+6,hy]],"ink",1);
    }else{
      for(const dx of [-4,4]){
        oval(hx+dx,hy-.5,1.8,2.3,"ink");oval(hx+dx-.3,hy-.5,.8,1.3,"gold");
        oval(hx+dx-.5,hy-1.4,.65,.65,"white");
      }
    }
    polygon([[hx-1.5,hy+2],[hx+1.5,hy+2],[hx,hy+3.5]],"pink");
    soft([[hx,hy+3.5],[hx,hy+4.7],[hx-1.5,hy+5.2]],"ink",.65);
    soft([[hx,hy+4.7],[hx+1.5,hy+5.2]],"ink",.65);
    for(const side of [-1,1]){
      soft([[hx+side*6,hy+2.5],[hx+side*12,hy+1.5]],"ink",.6);
      soft([[hx+side*6,hy+4],[hx+side*11,hy+5]],"ink",.6);
    }
    if(["paw","groom","startled"].includes(pose)){
      const reach=pose==="paw"?6:pose==="groom"?0:3;
      soft([[4,-8],[9,-10],[11+reach,-12]],"ink",5);
      soft([[4,-8],[9,-10],[11+reach,-12]],"light",3);
      oval(12+reach,-12,3,2.5,"ink");oval(12+reach,-12.3,2.2,1.7,"white");
    }
    ctx.restore();
    if(pose==="startled"){ctx.fillStyle=color.gold;ctx.font="18px Georgia,serif";ctx.fillText("!",cat.x+cat.face*23,cat.y-62);}
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
