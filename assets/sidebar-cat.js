/* A little visitor, drawn locally on a click-through canvas. No libraries/assets.
   The cat trails pointer input, sleeps after five idle seconds, and sometimes
   charges and sends a short pink plasma ribbon from its mouth. Coordinates are viewport-relative. */
(() => {
  "use strict";
  const canvas = document.querySelector("#sidebar-cat"), button = document.querySelector(".cat-rest");
  if (!canvas || !button) return;
  const ctx = canvas.getContext("2d"), motion = matchMedia("(prefers-reduced-motion: reduce)");
  const $ = s => document.querySelector(s);
  const petButton=$(".cat-pet");
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const color = {ink:"#193653", fur:"#91a0af", light:"#d2d8de", white:"#f6f4ed", gold:"#b69a70", pink:"#d88fa6", shadow:"#edf1f5"};
  const cat = {x:0,y:0,face:-1,turn:-1,vx:0,vy:0,stride:0,moving:false,pose:"sleep",emotion:"sleepy"};
  const pointer = {x:0,y:0,dx:1,at:-Infinity,seen:false,type:"mouse",focus:null,speed:0};
  const ball = {x:0,y:0,vx:0,vy:0,angle:0,ground:0,active:false};
  const mouse = {x:0,y:0};
  // The reactor's actual palette; bursts use a smooth fade rather than flicker.
  const plasma = ["#4a1070","#8e2a9e","#d4459a","#ff7ab8","#ffd6ea"];
  const IDLE_SLEEP = 5;
  let layout,time=0,last=0,raf=0,resting=false,initialized=false,dirty=true;
  let beam=null,beamWait=4+Math.random()*9,shootCount=0;
  let trick=null,trickCooldown=0,nearTime=0,petUntil=0,petTimer=0,petAsleep=false;
  let reaction=null,painted=null;

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
    const width=Math.round(innerWidth*dpr),height=Math.round(innerHeight*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;painted=null;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (!initialized) {
      cat.x=layout.home; cat.y=ground;
      ball.x=cat.x-48;ball.y=ground-7;
      initialized=true;
    }
    if (initialized && previous && (!pointer.seen || motion.matches)) {
      if (previous.compact !== compact) { cat.x=layout.home;cat.y=ground;cat.vx=cat.vy=0; }
      else {
        const shift=ground-previous.ground;
        cat.y+=shift;ball.y+=shift;mouse.y+=shift;
      }
    }
    cat.x=clamp(cat.x,34,innerWidth-34);
    if(pointer.seen&&!motion.matches)cat.y=clamp(cat.y,65,innerHeight-12);
    dirty=false;
  }
  function clearReaction() { if(reaction){reaction.classList.remove("cat-curious");reaction=null;} }
  function react(element) { if(reaction!==element){clearReaction();reaction=element;reaction?.classList.add("cat-curious");} }
  function chargeScale() {
    if(!beam)return 1;
    const progress=clamp(beam.age/(beam.stage==="charge"?.9:.65),0,1);
    const eased=progress*progress*(3-2*progress);
    return 1+.45*(beam.stage==="charge"?eased:1-eased);
  }
  function mouthPosition() {
    const power=chargeScale(),face=cat.turn<0?-1:1,scale=(.88+.12*Math.abs(cat.turn))*2*power;
    return {x:cat.x+3*face*scale,y:cat.y-32*power};
  }
  function move(target,dt,speed=190) {
    const dx=target.x-cat.x,dy=target.y-cat.y,d=Math.hypot(dx,dy);
    if(d<2.5&&Math.hypot(cat.vx,cat.vy)<22) {
      cat.x=target.x;cat.y=target.y;cat.vx=cat.vy=0;return true;
    }
    const pace=Math.min(speed,Math.sqrt(2*340*d)),blend=1-Math.exp(-dt*7);
    cat.vx+=(dx/Math.max(d,.01)*pace-cat.vx)*blend;
    cat.vy+=(dy/Math.max(d,.01)*pace-cat.vy)*blend;
    const stepX=cat.vx*dt,stepY=cat.vy*dt;
    cat.x=clamp(cat.x+stepX,34,innerWidth-34);cat.y=clamp(cat.y+stepY,65,innerHeight-12);
    cat.stride+=Math.hypot(stepX,stepY)*Math.PI*2/48;
    if(Math.abs(cat.vx)>14)cat.face=cat.vx>0?1:-1;
    return false;
  }
  function diagnostics(activity) {
    const state={activity,emotion:cat.emotion,x:cat.x.toFixed(2),y:cat.y.toFixed(2),
      beam:String(beam?.stage==="fire"),charging:String(beam?.stage==="charge"),
      shots:String(shootCount),trick:trick?.kind||"none",petting:String(performance.now()<petUntil)};
    for(const [key,value] of Object.entries(state))if(canvas.dataset[key]!==value)canvas.dataset[key]=value;
  }
  function update(dt) {
    time+=dt;trickCooldown=Math.max(0,trickCooldown-dt);
    const now=performance.now(),idle=(now-pointer.at)/1000;
    if(now<petUntil){
      clearReaction();beam=null;trick=null;cat.vx=cat.vy=0;cat.moving=false;
      cat.pose=petAsleep||motion.matches?"sleep":"sit";cat.emotion="content";
      diagnostics("pet");return;
    }
    if(resting||motion.matches||!pointer.seen||idle>=IDLE_SLEEP) {
      clearReaction();beam=null;trick=null;nearTime=0;
      cat.pose="sleep";cat.emotion="sleepy";cat.vx=cat.vy=0;cat.moving=false;
      if(motion.matches){cat.x=layout.home;cat.y=layout.ground;}
      diagnostics("nap");return;
    }
    const side=pointer.x>=cat.x?1:-1;
    const target={x:clamp(pointer.x-side*58,38,innerWidth-38),
      y:pointer.type==="touch"?clamp(layout.ground,65,innerHeight-12):clamp(pointer.y+36,65,innerHeight-12)};
    let settled=true;
    if(!beam&&trick?.kind!=="roll")settled=move(target,dt,idle>2?120:205);
    else cat.vx=cat.vy=0;
    cat.moving=!settled;cat.pose=settled?"sit":"stand";
    cat.turn+=(cat.face-cat.turn)*(1-Math.exp(-dt*11));
    const moods=["curious","playful","mischievous","delighted","focused"];
    cat.emotion=idle>3.5?"sleepy":moods[Math.floor(time/2.8)%moods.length];
    if(settled&&pointer.focus&&!beam&&!trick){
      cat.pose=Math.sin(time*3)>.5?"paw":"sit";
      cat.emotion=pointer.focus.matches(".matrix")?"puzzled":pointer.focus.matches(".book-link")?"content":"curious";
    }
    react(cat.pose==="paw"?pointer.focus:null);
    if(idle>3.5)cat.pose="groom";
    if(trick){trick.age+=dt;if(trick.age>trick.duration)trick=null;}
    const nearby=Math.hypot(pointer.x-cat.x,pointer.y-(cat.y-24))<105;
    nearTime=nearby&&pointer.speed<190&&idle<.7?nearTime+dt:0;
    if(!beam&&!trick&&nearTime>1.6&&trickCooldown===0){
      trick={kind:"roll",age:0,duration:2.25};trickCooldown=8;nearTime=0;
    }
    if(trick){cat.pose=trick.kind;cat.emotion="playful";}
    // A charge-up precedes every mouth beam. Only the timing/length are random.
    if(beam){
      beam.age+=dt;
      if(beam.stage==="charge"&&beam.age>=.9){
        const mouth=mouthPosition();beam.stage="fire";beam.age=0;
        beam.angle=Math.atan2(pointer.y-mouth.y,pointer.x-mouth.x);shootCount++;
      }else if(beam.stage==="fire"&&beam.age>.65)beam=null;
    }else if(idle<2.5&&!trick){
      beamWait-=dt;
      if(beamWait<=0){beam={stage:"charge",age:0,angle:0,length:115+Math.random()*55};beamWait=8+Math.random()*14;}
    }
    if(beam){cat.moving=false;cat.pose=beam.stage==="charge"?"charge":"shoot";cat.emotion=beam.stage==="charge"?"focused":"delighted";}
    if(ball.active){
      ball.vy+=480*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      ball.angle+=ball.vx*dt/9;ball.vx*=Math.pow(.55,dt);
      if(ball.y>ball.ground-7){ball.y=ball.ground-7;ball.vy=-Math.abs(ball.vy)*.57;if(Math.abs(ball.vy)<10)ball.vy=0;}
      if(ball.x<10||ball.x>innerWidth-10){ball.x=clamp(ball.x,10,innerWidth-10);ball.vx*=-.8;}
    }
    mouse.x=clamp(pointer.x+18,24,innerWidth-24);mouse.y=clamp(pointer.y+10,14,innerHeight-14);
    diagnostics(idle>3.5?"idle":"follow");
  }

  function box(x,y,w,h,c){ctx.fillStyle=color[c]||c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  function stroke(points,c,width=1){ctx.strokeStyle=color[c]||c;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  function polygon(points,c){ctx.fillStyle=color[c];ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function drawCat() {
    const pose=cat.pose, sleeping=pose==="sleep", sit=["sit","paw","groom","startled","charge","shoot"].includes(pose);
    const motionAmount=cat.moving?clamp(Math.hypot(cat.vx,cat.vy)/140,0,1):0;
    const mood=cat.emotion;
    const hop=pose==="leap"&&trick?Math.sin(Math.PI*trick.age/trick.duration)*34:pose==="pounce"?Math.abs(Math.sin(time*8))*9:pose==="startled"?7:cat.moving?(1-Math.cos(cat.stride*2))*.55*motionAmount:0;
    function oval(x,y,rx,ry,c){ctx.fillStyle=color[c];ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function soft(points,c,width){ctx.lineCap="round";ctx.lineJoin="round";stroke(points,c,width);}
    ctx.save();ctx.translate(cat.x,cat.y);
    oval(0,1,sleeping?28:25,3,"shadow");
    const turningWidth=.88+.12*Math.abs(cat.turn);
    const power=chargeScale();
    ctx.scale((cat.turn<0?-1:1)*turningWidth*2*power,2*power);ctx.translate(0,-hop/2);
    if(pose==="roll"&&trick){
      const progress=trick.age/trick.duration;
      const smooth=x=>x*x*(3-2*x);
      const angle=progress<.23?Math.PI*smooth(progress/.23):progress<.65?Math.PI+Math.sin(time*9)*.06:Math.PI+Math.PI*smooth((progress-.65)/.35);
      ctx.translate(0,-10);ctx.rotate(angle);ctx.translate(0,10);
    }else if(pose==="leap"&&trick){
      ctx.translate(0,-9);ctx.rotate(-Math.sin(Math.PI*trick.age/trick.duration)*.12);ctx.translate(0,9);
    }
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
    const wag=Math.sin(time*(mood==="focused"?8:3))*(mood==="playful"?3.5:2);
    ctx.lineCap="round";ctx.lineJoin="round";
    const tail=c=>{ctx.beginPath();ctx.moveTo(-9,-6);ctx.bezierCurveTo(-23,-3,-25,-16+wag,-18,-20+wag);ctx.bezierCurveTo(-15,-22+wag,-12,-20+wag,-13,-18+wag);ctx.strokeStyle=color[c];ctx.stroke();};
    ctx.lineWidth=8;tail("ink");ctx.lineWidth=6;tail("fur");
    soft([[-18,-20+wag],[-15,-21+wag],[-13,-20+wag]],"light",4);
    function furryLeg(root,toe,front=true,near=true) {
      // A single tapered, fur-covered silhouette: the ankle bends inside the
      // leg rather than appearing as an exposed elbow on a thin stick.
      const [x,y]=root,[fx,fy]=toe,thigh=front?3.1:4.2;
      ctx.save();if(!near)ctx.globalAlpha=.68;
      ctx.beginPath();ctx.moveTo(x-thigh,y);
      ctx.bezierCurveTo(x-thigh,y+3,fx-2.5,fy-5,fx-2.5,fy-.5);
      ctx.bezierCurveTo(fx-3,fy+1.8,fx+3.8,fy+2.2,fx+4,fy+.2);
      ctx.quadraticCurveTo(fx+4.1,fy-1.5,fx+1.7,fy-1.8);
      ctx.bezierCurveTo(fx+1.8,fy-5,x+thigh,y+3,x+thigh,y);
      ctx.closePath();ctx.fillStyle=color[near?"light":"fur"];ctx.fill();
      ctx.strokeStyle=color.ink;ctx.lineWidth=.75;ctx.stroke();
      oval(fx+.7,fy-.2,2.7,1.25,"white");
      if(near)for(const dx of [1,2.2])soft([[fx+dx,fy-.7],[fx+dx,fy+.35]],"fur",.35);
      ctx.restore();
    }
    function reachingPaw(toe,grooming) {
      const [x,y]=toe,cx=grooming?9:8,cy=grooming?-12:-10.5;
      ctx.beginPath();ctx.moveTo(1,-9);
      ctx.bezierCurveTo(cx-2,cy+3,x-3,y+2,x-1,y-1.5);
      ctx.quadraticCurveTo(x+3,y-3,x+3,y);
      ctx.quadraticCurveTo(x+3,y+2.5,x-.5,y+2.5);
      ctx.bezierCurveTo(cx+1,cy+3,7,-5,1,-9);
      ctx.closePath();ctx.fillStyle=color.light;ctx.fill();
      ctx.lineWidth=.8;ctx.strokeStyle=color.ink;ctx.stroke();
      oval(x+.7,y,2.7,1.9,"white");
      soft([[x+1.7,y-.5],[x+1.7,y+.5]],"fur",.35);
    }
    function walkingLeg(x,phase,front,near) {
      const airborne=pose==="leap";
      const swing=pose==="roll"?Math.sin(time*8+phase)*1.8:airborne?(front?2:-1):Math.sin(phase)*3.6*motionAmount;
      const lift=pose==="roll"?2+Math.sin(time*7+phase):airborne?3:Math.max(0,Math.cos(phase))*3.2*motionAmount;
      furryLeg([x,front?-8:-6],[x+swing,-lift],front,near);
    }
    if(sit){
      oval(-2,-8,11,10,"ink");oval(-2,-8.5,10,9,"fur");
      oval(-6,-3.5,5.5,4.8,"light");oval(1,-7,6.5,8,"light");oval(2,-6,4.5,7,"white");
      oval(-10,-6,3,3,"fur");oval(-8,-2,4,2,"fur");
      oval(-7,0,4,2,"ink");oval(-7,-.5,3.2,1.4,"white");
      furryLeg([4.5,-9],[5.5,0]);
      soft([[-9,-12],[-6,-11]],"ink",1.2);
    }else{
      walkingLeg(-6,cat.stride,false,false);walkingLeg(8,cat.stride+Math.PI,true,false);
      oval(-2,-9,14,8,"ink");oval(-2,-9.5,13,7,"fur");oval(-1,-5.5,9,3.5,"light");
      walkingLeg(-10,cat.stride+Math.PI,false,true);
      oval(-9,-7,6,5.5,"fur");oval(-10,-7.5,4.5,4,"light");
      walkingLeg(7,cat.stride,true,true);
      soft([[-8,-14],[-7,-11]],"ink",1.5);soft([[-3,-15],[-2,-12]],"ink",1.4);
    }
    const hx=sit?3:9,hy=sit?-21:-19;
    const tilt=mood==="puzzled"?.2:mood==="curious"?Math.sin(time*2)*.075:mood==="sleepy"?.09:0;
    ctx.save();ctx.translate(hx,hy);ctx.rotate(tilt);ctx.translate(-hx,-hy);
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
    const blink=pose==="groom"||Math.floor(time*3)%19===0;
    const happy=mood==="content"||mood==="delighted", sleepy=mood==="sleepy";
    for(const dx of [-4,4]) {
      if(blink||happy){
        ctx.beginPath();ctx.moveTo(hx+dx-1.6,hy+.1);ctx.quadraticCurveTo(hx+dx,hy+(happy?-1.5:.8),hx+dx+1.6,hy+.1);
        ctx.strokeStyle=color.ink;ctx.lineWidth=1;ctx.stroke();
      }else if(sleepy){
        soft([[hx+dx-1.7,hy],[hx+dx+1.7,hy+.4]],"ink",1.1);
      }else{
        const wide=mood==="surprised",focus=mood==="focused"||mood==="mischievous";
        oval(hx+dx,hy-.5,wide?2.4:1.8,wide?2.9:2.3,"ink");
        oval(hx+dx-.3,hy-.5,wide?1.5:focus?.45:.8,wide?1.9:1.3,"gold");
        oval(hx+dx-.5,hy-1.4,.65,.65,"white");
        if(focus)soft([[hx+dx-2,hy-3.2],[hx+dx+1.6,hy-2.2]],"fur",1.8);
      }
    }
    if(mood==="puzzled")soft([[hx-6,hy-4],[hx-2,hy-5]],"ink",.9);
    if(mood==="surprised"){
      soft([[hx-6,hy-5],[hx-2,hy-6]],"ink",.8);soft([[hx+2,hy-6],[hx+6,hy-5]],"ink",.8);
    }
    if(mood==="delighted"||mood==="playful"){
      ctx.save();ctx.globalAlpha=.3;oval(hx-7,hy+2,2,1.2,"pink");oval(hx+7,hy+2,2,1.2,"pink");ctx.restore();
    }
    polygon([[hx-1.5,hy+2],[hx+1.5,hy+2],[hx,hy+3.5]],"pink");
    if(pose==="charge"||pose==="shoot"){oval(hx,hy+5,pose==="shoot"?1.8:1.2,1.5,"ink");}
    else if(mood==="surprised")oval(hx,hy+5,1.1,1.4,"ink");
    else{
      soft([[hx,hy+3.5],[hx,hy+4.7],[hx-1.5,hy+5.2]],"ink",.65);
      soft([[hx,hy+4.7],[hx+1.5,hy+5.2]],"ink",.65);
      if(mood==="playful"&&Math.sin(time*2)>.6)oval(hx+.5,hy+5.6,1,1.2,"pink");
    }
    for(const side of [-1,1]){
      soft([[hx+side*6,hy+2.5],[hx+side*12,hy+1.5]],"ink",.6);
      soft([[hx+side*6,hy+4],[hx+side*11,hy+5]],"ink",.6);
    }
    ctx.restore();
    if(["paw","groom","startled"].includes(pose)){
      const toe=pose==="groom"?[hx+1,hy+4]:[13+Math.sin(time*4)*.7,pose==="startled"?-15:-12];
      reachingPaw(toe,pose==="groom");
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
    ctx.save();ctx.translate(Math.round(mouse.x),Math.round(mouse.y-4));ctx.scale(pointer.dx<0?-1:1,1);
    stroke([[-8,0],[-16,-3],[-19,0],[-17,4]],"gold",2);
    polygon([[-10,1],[-7,-6],[2,-6],[9,-1],[7,3],[-7,4]],"fur");
    box(-2,-9,5,5,"light");box(6,-2,2,2,"ink");box(9,0,2,2,"pink");
    stroke([[-6,-3],[2,2]],"white");stroke([[-2,-6],[-2,-12],[1,-12],[1,-9]],"gold");
    ctx.restore();
  }
  function drawPlasma() {
    if(!beam)return;
    const {x,y}=mouthPosition();
    ctx.save();ctx.translate(x,y);ctx.lineCap="round";
    if(beam.stage==="charge"){
      const progress=clamp(beam.age/.9,0,1),radius=3+progress*9;
      const glow=ctx.createRadialGradient(0,0,1,0,0,radius);
      glow.addColorStop(0,plasma[4]);glow.addColorStop(.35,plasma[3]);glow.addColorStop(1,"#d4459a00");
      ctx.fillStyle=glow;ctx.globalAlpha=.35+.65*progress;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=plasma[3];ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(0,0,13,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3+beam.age*5,distance=21*(1-progress)+3;
        ctx.fillStyle=plasma[i%3+2];ctx.beginPath();ctx.arc(Math.cos(angle)*distance,Math.sin(angle)*distance,1.3,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();return;
    }
    const fade=Math.sin(Math.PI*beam.age/.65);
    ctx.rotate(beam.angle);
    const ribbon=width=>{
      ctx.beginPath();ctx.moveTo(0,0);
      for(let i=1;i<=20;i++){
        const progress=i/20;
        ctx.lineTo(progress*beam.length,Math.sin(progress*16-beam.age*17)*3.5*Math.sin(progress*Math.PI));
      }
      ctx.lineWidth=width;ctx.stroke();
    };
    ctx.globalAlpha=fade*.25;ctx.strokeStyle=plasma[1];ribbon(16);
    ctx.globalAlpha=fade*.65;ctx.strokeStyle=plasma[2];ribbon(9);
    ctx.globalAlpha=fade;ctx.strokeStyle=plasma[3];ribbon(4.5);
    ctx.strokeStyle=plasma[4];ribbon(1.7);
    for(let i=0;i<5;i++){
      const progress=(beam.age*1.5+i*.19)%1;
      ctx.fillStyle=plasma[i%3+2];ctx.globalAlpha=fade*(1-progress);
      ctx.beginPath();ctx.arc(progress*beam.length,Math.sin(i*7+beam.age*8)*10*progress,1.5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawAffection(){
    if(performance.now()>=petUntil)return;
    const rise=motion.matches?0:(1-(petUntil-performance.now())/1800)*12;
    ctx.save();ctx.translate(cat.x,cat.y-65-rise);ctx.fillStyle=color.pink;
    ctx.beginPath();ctx.moveTo(0,4);ctx.bezierCurveTo(-13,-3,-6,-12,0,-5);ctx.bezierCurveTo(6,-12,13,-3,0,4);ctx.fill();
    ctx.fillStyle=color.fur;ctx.font="10px Georgia,serif";ctx.fillText("purr",24,30+rise);
    ctx.restore();
  }
  function render(){
    if(!layout)return;
    // Clear only previously painted pieces, not a viewport-sized rectangle.
    if(painted)for(const r of painted)ctx.clearRect(...r);
    const power=chargeScale();
    const pieces=[[cat.x-66*power,cat.y-115*power,132*power,180*power]];
    if(ball.active)pieces.push([ball.x-10,ball.y-10,20,20]);
    if(pointer.type==="mouse")pieces.push([mouse.x-25,mouse.y-20,50,35]);
    if(beam)pieces.push([cat.x-225,cat.y-240,450,450]);
    drawCat();
    if(cat.pose!=="sleep"){
      if(ball.active)drawBall();
      if(pointer.type==="mouse")drawMouse();
      drawPlasma();
    }
    drawAffection();painted=pieces;
    if(petButton){
      const transform=`translate(${clamp(cat.x-42,0,innerWidth-84)}px,${clamp(cat.y-70,0,innerHeight-80)}px)`;
      if(petButton.style.transform!==transform)petButton.style.transform=transform;
    }
  }
  function tick(now){
    raf=0;if(document.hidden)return;
    if(now-last<1000/30){raf=requestAnimationFrame(tick);return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(dirty)measure();
    update(dt);render();
    if(!motion.matches&&(cat.pose!=="sleep"||performance.now()<petUntil))raf=requestAnimationFrame(tick);
  }
  function wake(){if(!raf){last=0;raf=requestAnimationFrame(tick);}}
  function track(e) {
    const now=performance.now(),distance=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);
    pointer.speed=pointer.seen?distance/Math.max((now-pointer.at)/1000,.016):0;
    if(pointer.speed>1100&&!beam&&!trick&&trickCooldown===0&&!resting&&!motion.matches&&now>=petUntil){
      trick={kind:"leap",age:0,duration:.7};trickCooldown=2;
    }
    pointer.dx=e.clientX-pointer.x;pointer.x=e.clientX;pointer.y=e.clientY;
    pointer.at=performance.now();pointer.seen=true;pointer.type=e.pointerType||"mouse";
    pointer.focus=e.target.closest?.(".reactor,.intro .tags,.book-link")||null;
    if(cat.pose==="sleep")beamWait=Math.max(beamWait,2);
    if(!resting&&!motion.matches)wake();
  }
  function rest(){
    resting=!resting;beam=null;trick=null;petUntil=0;clearReaction();
    button.setAttribute("aria-pressed",String(resting));
    button.setAttribute("aria-label",resting?"Wake the cat":"Let the cat nap");
    button.title=resting?"Wake the cat":"Let the cat nap";
    if(!resting){pointer.at=performance.now();pointer.seen=true;}
    wake();
  }
  function pet(){
    petAsleep=cat.pose==="sleep";petUntil=performance.now()+1800;
    pointer.at=performance.now();beam=null;trick=null;beamWait=Math.max(beamWait,3);
    clearTimeout(petTimer);petTimer=setTimeout(wake,1850);wake();
  }
  petButton?.addEventListener("click",pet);
  button.addEventListener("click",rest);
  addEventListener("pointermove",track,{passive:true});
  for(const event of ["resize","scroll"])addEventListener(event,()=>{dirty=true;wake();},{passive:true});
  motion.addEventListener("change",()=>{beam=null;clearReaction();dirty=true;wake();});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;beam=null;clearReaction();}
    else wake();
  });
  document.addEventListener("pointerup",e=>{
    if(e.target.closest("a,button,input,select,textarea"))return;
    const asleep=cat.pose==="sleep";
    if(((e.clientX-cat.x)/(42*chargeScale()))**2+((e.clientY-(cat.y-(asleep?11:29)*chargeScale()))/((asleep?23:35)*chargeScale()))**2<=1){pet();return;}
    track(e);
    if(motion.matches||resting||getSelection()?.isCollapsed===false)return;
    ball.active=true;ball.x=clamp(e.clientX,10,innerWidth-10);ball.y=e.clientY;
    ball.ground=Math.min(innerHeight-10,e.clientY+12);ball.vx=cat.face*100;ball.vy=-130;wake();
  });
  measure();button.hidden=false;if(petButton)petButton.hidden=false;wake();
})();
