/* Wigner matrix → schematic deep network → empirical eigenvalue histogram.
   Offline canvas renderer; spectra are supplied by render-random-matrix.py. */
(() => {
  "use strict";
  const ctx = document.querySelector("canvas").getContext("2d");
  const C = ["#ffffff", "#edf1f5", "#b8c5d2", "#526276", "#193653", "#f6efdf", "#b69a70", "#745020"];
  function rect(x,y,w,h,c) { ctx.fillStyle=C[c]; ctx.fillRect(Math.round(x),Math.round(y),w,h); }
  function line(x,y,X,Y,c) {
    const n=Math.ceil(Math.max(Math.abs(X-x),Math.abs(Y-y)));
    for(let i=0;i<=n;i++) { const t=n?i/n:0; rect(x+(X-x)*t,y+(Y-y)*t,1,1,c); }
  }
  function label(text,x,y,c=3) {
    ctx.fillStyle=C[c]; ctx.font="9px 'Courier New', monospace"; ctx.fillText(text,x,y);
  }
  window.MATRIX_PALETTE=C;
  window.drawRandomMatrix=(t,data)=>{
    ctx.setTransform(4,0,0,4,0,0);
    rect(0,0,192,132,0);
    // Enlarging corner of the symmetric matrix; N labels the full matrix size.
    const cells=Math.min(12,4+2*data.stage), gap=5, side=cells*gap;
    const left=6+(64-side)/2, top=6+(64-side)/2;
    for(let row=0;row<cells;row++) for(let col=0;col<cells;col++) {
      const v=data.corner[row][col];
      rect(left+col*gap,top+row*gap,4,4,v>.6?4:v<-.6?6:Math.abs(v)<.18?1:2);
    }
    for(const x of [3,74]) {
      line(x,4,x,70,4); line(x,4,x+(x===3?4:-4),4,4); line(x,70,x+(x===3?4:-4),70,4);
    }
    label(`N=${data.n}`,22,81,4);
    line(79,37,89,37,3); line(86,34,89,37,3); line(86,40,89,37,3);

    // Five staggered layers, branching forward signals and a return skip path.
    const layers=[3,5,4,5,2], xs=[96,116,137,158,181];
    const ys=layers.map(n=>Array.from({length:n},(_,i)=>37+(i-(n-1)/2)*12));
    for(let l=0;l<4;l++) for(let i=0;i<layers[l];i++) for(let j=0;j<layers[l+1];j++) {
      line(xs[l],ys[l][i],xs[l+1],ys[l+1][j],1);
    }
    // A residual arc bridges the hidden layers.
    line(116,13,116,5,2); line(116,5,158,5,2); line(158,5,158,13,2);
    const phase=(t*4)%1;
    for(let l=0;l<4;l++) {
      const active=(Math.floor(t*12)+l)%layers[l];
      for(const target of [Math.floor(layers[l+1]/2),(active+1)%layers[l+1]]) {
        const a=ys[l][active], b=ys[l+1][target];
        line(xs[l],a,xs[l+1],b,6);
        const f=(phase-l*.18+1)%1;
        rect(xs[l]+(xs[l+1]-xs[l])*f-1,a+(b-a)*f-1,3,3,7);
      }
    }
    layers.forEach((n,l)=>ys[l].forEach((y,i)=>{
      rect(xs[l]-2,y-2,5,5,4);
      rect(xs[l]-1,y-1,3,3,(i+l+Math.floor(t*12))%3===0?6:0);
    }));
    // A returning gradient pulse uses the residual connection.
    const back=(1-(t*3)%1);
    rect(116+42*back,4,3,3,6);

    // Density-normalized histogram of actual eigenvalues, on a fixed [-2.4,2.4] axis.
    const x0=17,width=158,base=119,scale=91;
    data.density.forEach((density,i)=>{
      const h=Math.min(35,Math.round(density*scale));
      rect(x0+i*4,base-h,3,h,2);
    });
    // Wigner limit rho(lambda)=sqrt(4-lambda²)/(2*pi), supported on [-2,2].
    let prev;
    for(let i=0;i<=width;i++) {
      const lambda=-2.4+4.8*i/width;
      if(Math.abs(lambda)>2) {prev=null;continue;}
      const point=[x0+i,base-scale*Math.sqrt(4-lambda*lambda)/(2*Math.PI)];
      if(prev) line(...prev,...point,7);
      prev=point;
    }
    line(x0,base,x0+width,base,3);
    for(const lambda of [-2,0,2]) {
      const x=x0+(lambda+2.4)/4.8*width;
      line(x,base,x,base+2,3); label(String(lambda),x-3,130);
    }
    label("λ",4,104,4);
  };
})();
