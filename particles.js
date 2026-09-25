export class Particles {
  constructor(){ this.smoke=[]; this.trails=[]; this.lastWheels=null; this.emit=0; }
  update(dt,state){
    const intensity=Math.abs(state.speed)>1 ? Math.min(1,state.rearLocked?1:(state.driftAmount*.75+state.slip/28))*(state.drift||state.rearLocked?1:0) : 0;
    if(intensity>.12 && this.lastWheels) for(let i=0;i<2;i++) if(Math.hypot(this.lastWheels[i].x-state.rearWheels[i].x,this.lastWheels[i].y-state.rearWheels[i].y)<2) this.trails.push({a:this.lastWheels[i],b:{...state.rearWheels[i]},life:7});
    this.emit-=dt;
    if(intensity>.18 && this.emit<=0){ this.emit=.035+(1-intensity)*.05; for(const wheel of state.rearWheels){ const a=state.angle, back={x:-Math.sin(a),y:Math.cos(a)}; this.smoke.push({x:wheel.x+back.x*.10,y:wheel.y+back.y*.10,vx:back.x*(.5+intensity*.9)+(Math.random()-.5)*.45,vy:back.y*(.5+intensity*.9)+(Math.random()-.5)*.45,r:.10+Math.random()*.11,life:.48+Math.random()*.42}); } }
    this.lastWheels=state.rearWheels.map(p=>({...p}));
    for(const p of this.smoke){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*.34;} this.smoke=this.smoke.filter(p=>p.life>0).slice(-210);
    for(const t of this.trails)t.life-=dt; this.trails=this.trails.filter(t=>t.life>0).slice(-500);
  }
  draw(ctx,camera,scale){ ctx.save();ctx.lineCap='round'; for(const t of this.trails){ctx.globalAlpha=Math.min(.45,t.life/7*.40);ctx.strokeStyle='#111719';ctx.lineWidth=Math.max(2,scale*.075);ctx.beginPath();ctx.moveTo((t.a.x-camera.x)*scale,(t.a.y-camera.y)*scale);ctx.lineTo((t.b.x-camera.x)*scale,(t.b.y-camera.y)*scale);ctx.stroke();} for(const p of this.smoke){ctx.globalAlpha=Math.max(0,p.life)*.42;ctx.fillStyle='#d8ded9';ctx.beginPath();ctx.arc((p.x-camera.x)*scale,(p.y-camera.y)*scale,p.r*scale,0,Math.PI*2);ctx.fill();}ctx.restore(); }
}
