export function generateTouge(seed){
  let value=seed>>>0;const rand=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const points=[{x:0,y:10}],sections=[];let y=0,x=0;
  for(let i=0;i<=15;i++)points.push({x:0,y:-i*2});y=-30;
  for(let section=0;section<12;section++){
    const kind=section%4===3?'straight':section%2===0?'arc':'snake';
    const length=kind==='straight'?35+rand()*15:85+rand()*20;
    const sign=section%2===0?1:-1,amplitude=(15+rand()*7)*sign;
    const shift=(rand()-.5)*12,steps=Math.ceil(length/2);sections.push(kind);
    for(let i=1;i<=steps;i++){const t=i/steps,smooth=t*t*t*(10+t*(-15+6*t));
      const bend=kind==='arc'?Math.sin(Math.PI*t)**3:kind==='snake'?Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2:0;
      points.push({x:x+shift*smooth+amplitude*bend,y:y-length*t});}
    y-=length;x+=shift;
  }
  const finishIndex=points.length-1;for(let i=1;i<=15;i++)points.push({x,y:y-i*2});
  const left=[],right=[],halfWidth=5.5;
  for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;points[i].a=Math.atan2(dx,-dy);left.push({x:points[i].x-nx*halfWidth,y:points[i].y-ny*halfWidth});right.push({x:points[i].x+nx*halfWidth,y:points[i].y+ny*halfWidth});}
  const gates=[];for(let i=30;i<finishIndex;i+=20)gates.push(i);gates.push(finishIndex);
  const xs=points.map(p=>p.x);return {seed:seed>>>0,points,left,right,gates,halfWidth,finishIndex,sections,bounds:{minX:Math.min(...xs)-12,maxX:Math.max(...xs)+12,minY:points.at(-1).y-12,maxY:22},start:{x:0,y:0,a:0}};
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
