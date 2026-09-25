import { CarPhysics, RAPIER } from './physics.js';
import { Input } from './input.js';
import { Particles } from './particles.js';
import { CarAudio } from './audio.js';
import { MAP, SECTIONS, drawMap, nearestSection } from './map.js';
const audio=new CarAudio();
addEventListener('pointerdown',()=>audio.unlock().catch(console.warn));
addEventListener('keydown',()=>audio.unlock().catch(console.warn));

const canvas=document.querySelector('#game'), ctx=canvas.getContext('2d'), debug=document.querySelector('#debug');
let W=0,H=0,dpr=1,scale=23, world, car, input, particles, last=performance.now(), accumulator=0, fps=60;
const camera={x:0,y:0};
let mapOpen=false, muted=false, paused=false;
const mini=document.querySelector('#minimap'),miniCtx=mini.getContext('2d');
const mapImage=document.createElement('canvas');mapImage.width=540;mapImage.height=480;
const mapCtx=mapImage.getContext('2d');mapCtx.scale(3,3);mapCtx.translate(90,80);drawMap(mapCtx,false);
function resize(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize); resize();
function worldToScreen(x,y){return {x:(x-camera.x)*scale+W/2,y:(y-camera.y)*scale+H/2};}
function drawParking(){
  ctx.fillStyle='#172a24';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(W/2-camera.x*scale,H/2-camera.y*scale);ctx.scale(scale,scale);
  drawMap(ctx);
  ctx.restore();
}
function drawCar(s){
  const p=worldToScreen(s.x,s.y),u=scale/12;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(s.angle);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(-8*u,-17*u+4,16*u,34*u);
  // Same 14 x 36 envelope as v4; panda-white AE86 hatch proportions.
  const poly=(points,fill)=>{ctx.fillStyle=fill;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*u,y*u):ctx.moveTo(x*u,y*u));ctx.closePath();ctx.fill();};
  poly([[-6,-18],[6,-18],[7,-15],[7,15],[6,17],[-6,17],[-7,15],[-7,-15]],'#20262a');
  poly([[-5.8,-17.5],[5.8,-17.5],[6.7,-14],[6.6,14.8],[5.7,16],[-5.7,16],[-6.6,14.8],[-6.7,-14]],'#f5f6f2');
  ctx.fillStyle='#c0c8c7';ctx.fillRect(-6.3*u,-14*u,.55*u,27*u);ctx.fillRect(5.8*u,-14*u,.55*u,27*u);
  poly([[-5.7,-6.8],[5.7,-6.8],[4.7,-1.4],[-4.7,-1.4]],'#17272e');
  poly([[-5.1,-6.2],[5.1,-6.2],[4.4,-2],[-4.4,-2]],'#526a72');
  poly([[-5.6,-.9],[-4.8,-.6],[-4.6,6.7],[-5.8,8.2]],'#273b42');
  poly([[5.6,-.9],[4.8,-.6],[4.6,6.7],[5.8,8.2]],'#273b42');
  poly([[-4.5,-.5],[4.5,-.5],[4.4,6.8],[-4.4,6.8]],'#ffffff');
  poly([[-4.5,7.5],[4.5,7.5],[5.5,13.6],[-5.5,13.6]],'#192c34');
  poly([[-3.9,8],[3.9,8],[4.8,12.8],[-4.8,12.8]],'#4a626b');
  ctx.fillStyle='#d3dbd8';ctx.fillRect(-4.7*u,-14.8*u,.3*u,7*u);ctx.fillRect(4.4*u,-14.8*u,.3*u,7*u);
  ctx.strokeStyle='#aeb7b6';ctx.lineWidth=.3*u;ctx.strokeRect(-5.4*u,-16.5*u,3.1*u,1.6*u);ctx.strokeRect(2.3*u,-16.5*u,3.1*u,1.6*u);
  ctx.fillStyle='#151c20';ctx.fillRect(-6*u,14*u,12*u,1*u);ctx.fillRect(-5.8*u,15.6*u,11.6*u,1*u);ctx.fillRect(-7*u,-4.8*u,1.2*u,1.4*u);ctx.fillRect(5.8*u,-4.8*u,1.2*u,1.4*u);
  ctx.fillStyle='#b94235';ctx.fillRect(-5.6*u,15*u,3.5*u,.55*u);ctx.fillRect(2.1*u,15*u,3.5*u,.55*u);ctx.restore();
}
function draw(){drawParking();ctx.save();ctx.translate(W/2,H/2);particles.draw(ctx,camera,scale);ctx.restore();const s=car.getState();drawCar(s);miniCtx.clearRect(0,0,180,160);miniCtx.drawImage(mapImage,0,0,180,160);miniCtx.save();miniCtx.translate(s.x+90,s.y+80);miniCtx.rotate(s.angle);miniCtx.fillStyle='#ffcf6c';miniCtx.beginPath();miniCtx.moveTo(0,-4);miniCtx.lineTo(3,3);miniCtx.lineTo(-3,3);miniCtx.closePath();miniCtx.fill();miniCtx.restore();}
async function start(){await RAPIER.init();world=new RAPIER.World({x:0,y:0});
  for(const [x,y,hx,hy] of [[0,-MAP.height/2,MAP.width/2,.35],[0,MAP.height/2,MAP.width/2,.35],[-MAP.width/2,0,.35,MAP.height/2],[MAP.width/2,0,.35,MAP.height/2]]){const rb=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y));world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy),rb);}
  car=new CarPhysics(world);input=new Input();particles=new Particles();
  function respawn(section){input.reset();car.body.setTranslation({x:section.x,y:section.y},true);car.body.setRotation(section.a,true);car.body.setLinvel({x:0,y:0},true);car.body.setAngvel(0,true);for(const key of ['travelSpeed','forwardSpeed','sideSpeed','yawRate','wheelAngle','driftAmount','slip'])car[key]=0;car.drift=false;car.rearLocked=false;car.setInput(input.get());particles=new Particles();camera.x=section.x;camera.y=section.y;accumulator=0;audio.gear=1;audio.rpm=950;}
  const panel=document.querySelector('#map-panel');
  function openMap(open){mapOpen=open;panel.hidden=!open;input.reset();audio.pause();}
  document.querySelector('#map-button').onclick=()=>openMap(true);document.querySelector('#close-map').onclick=()=>openMap(false);
  for(const section of SECTIONS){const b=document.createElement('button');b.textContent=section.name;b.onclick=()=>{respawn(section);openMap(false);};document.querySelector('#section-buttons').appendChild(b);}
  document.querySelector('#reset-button').onclick=()=>{const s=car.getState();respawn(nearestSection(s.x,s.y));};
  document.querySelector('#mute-button').onclick=event=>{muted=!muted;event.currentTarget.textContent=muted?'Без звука':'Звук';event.currentTarget.setAttribute('aria-label',muted?'Включить звук':'Выключить звук');if(muted)audio.pause();};
  addEventListener('gamepause',()=>{paused=true;input.reset();audio.pause();});
  document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;input.reset();if(document.hidden)audio.pause();});
  respawn(SECTIONS[0]);last=performance.now();
  function frame(now){
    const real=Math.min(.1,(now-last)/1000);last=now;fps=fps*.92+(1/Math.max(real,.001))*.08;
    if(document.hidden||mapOpen||paused||H>W){accumulator=0;input.reset();audio.pause();draw();requestAnimationFrame(frame);return;}
    accumulator+=real;car.setInput(input.get());
    while(accumulator>=1/60){car.step(1/60);world.step();particles.update(1/60,car.getState());accumulator-=1/60;}
    const s=car.getState();if(!muted)audio.update(real,s);const look=car.localVelocity();const targetX=s.x+look.f.x*Math.min(2.5,Math.max(0,s.speed)*.08),targetY=s.y+look.f.y*Math.min(2.5,Math.max(0,s.speed)*.08);camera.x+=(targetX-camera.x)*Math.min(1,real*5);camera.y+=(targetY-camera.y)*Math.min(1,real*5);
    draw();debug.textContent=`V7 · ${Math.abs(s.speed*3.6).toFixed(0)} км/ч${s.speed<-.2?' · R':''}\n${nearestSection(s.x,s.y).name}\n${s.rearLocked?'РУЧНИК · БЛОК':s.drift?'DRIFT':''}`;
    requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
}
start().catch(e=>{debug.textContent='Ошибка запуска Rapier: '+e.message;console.error(e);});
