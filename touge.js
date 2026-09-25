export function generateTouge(seed){
  let value=seed>>>0;const rand=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const points=[{x:0,y:10},{x:0,y:0}],sections=[];let y=0,x=0,heading=0;
  // Alternating climb/descent legs connected by true 180-degree hairpins.
  // Each leg gets its own corridor: neighbouring roads stay separate without
  // restricting the route to forward-only travel as in V10.
  for(let leg=0;leg<10;leg++){
    const up=leg%2===0,endY=up?-(36+rand()*18):6+rand()*12;
    const length=Math.abs(endY-y),steps=Math.ceil(length/1.6),amp=Math.min(4+rand()*2,length*length/450)*(rand()<.5?-1:1);
    const snake=leg%3!==0;sections.push(snake?'S-link':'C-link');
    for(let i=1;i<=steps;i++){const t=i/steps,bump=snake?Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2:Math.sin(Math.PI*t)**3;
      points.push({x:x+amp*bump,y:y+(endY-y)*t});}
    y=endY;heading=up?0:Math.PI;
    if(leg<9){const radius=12+rand()*4.5,steps=Math.ceil(Math.PI*radius/1.4);sections.push('hairpin');
      for(let i=1;i<=steps;i++){const t=Math.PI*i/steps;points.push({x:x+radius*(1-Math.cos(t)),y:y+(up?-1:1)*radius*Math.sin(t)});}
      x+=2*radius;heading=up?Math.PI:0;
    }
  }
  const finishIndex=points.length-1;for(let i=1;i<=15;i++)points.push({x:x+Math.sin(heading)*i*2,y:y-Math.cos(heading)*i*2});
  const left=[],right=[],halfWidth=5.5;
  for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;points[i].a=Math.atan2(dx,-dy);left.push({x:points[i].x-nx*halfWidth,y:points[i].y-ny*halfWidth});right.push({x:points[i].x+nx*halfWidth,y:points[i].y+ny*halfWidth});}
  const gates=[];for(let i=30;i<finishIndex;i+=20)gates.push(i);gates.push(finishIndex);
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {seed:seed>>>0,points,left,right,gates,halfWidth,finishIndex,sections,bounds:{minX:Math.min(...xs)-12,maxX:Math.max(...xs)+12,minY:Math.min(...ys)-12,maxY:Math.max(...ys)+12},start:{x:0,y:0,a:0}};
}
export function addBarriers(world,R,track){
  const body=world.createRigidBody(R.RigidBodyDesc.fixed());
  const wall=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y;world.createCollider(R.ColliderDesc.cuboid(Math.hypot(dx,dy)/2+.08,.28).setTranslation((a.x+b.x)/2,(a.y+b.y)/2).setRotation(Math.atan2(dy,dx)).setFriction(.15).setRestitution(.05),body);};
  for(const edge of [track.left,track.right])for(let i=1;i<edge.length;i++)wall(edge[i-1],edge[i]);
  wall(track.left[0],track.right[0]);wall(track.left.at(-1),track.right.at(-1));return body;
}
export function drawTouge(ctx,t){
  const path=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));};
  ctx.lineJoin='round';ctx.lineCap='round';path(t.points);ctx.lineWidth=12;ctx.strokeStyle='#a5aca2';ctx.stroke();ctx.lineWidth=11;ctx.strokeStyle='#373e40';ctx.stroke();
  ctx.setLineDash([2.2,2.6]);ctx.lineWidth=.12;ctx.strokeStyle='#c9b776';ctx.stroke();ctx.setLineDash([]);
  for(const edge of [t.left,t.right]){path(edge);ctx.lineWidth=.55;ctx.strokeStyle='#bbc4b7';ctx.stroke();}
  for(const i of [5,t.finishIndex]){const p=t.points[i];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);for(let r=0;r<2;r++)for(let c=0;c<14;c++){ctx.fillStyle=(r+c)%2?'#ececdd':'#182522';ctx.fillRect(-5.5+c*11/14,r*.5,11/14,.5);}ctx.restore();}
}
export class TougeRun{
  constructor(track){this.track=track;this.time=0;this.countdown=3;this.nextGate=0;this.finished=false;this.previous={...track.start};}
  step(dt,s){if(this.finished)return;if(this.countdown>0){this.countdown=Math.max(0,this.countdown-dt);this.previous={...s};return;}this.time+=dt;
    const p=this.track.points[this.track.gates[this.nextGate]],fx=Math.sin(p.a),fy=-Math.cos(p.a);
    const along=(q)=>(q.x-p.x)*fx+(q.y-p.y)*fy;
    const before=along(this.previous),after=along(s);
    if(before<=0&&after>=0){const u=-before/(after-before||1),x=this.previous.x+(s.x-this.previous.x)*u,y=this.previous.y+(s.y-this.previous.y)*u;
      if(Math.abs((x-p.x)*(-fy)+(y-p.y)*fx)<this.track.halfWidth+.2){this.nextGate++;if(this.nextGate===this.track.gates.length)this.finished=true;}}
    this.previous={...s};
  }
}
