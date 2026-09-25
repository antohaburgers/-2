import { CarPhysics, RAPIER } from './physics.js';
import { Input } from './input.js';
import { Particles } from './particles.js';

const canvas=document.querySelector('#game'), ctx=canvas.getContext('2d'), debug=document.querySelector('#debug');
let W=0,H=0,dpr=1,scale=23, world, car, input, particles, last=performance.now(), accumulator=0, fps=60;
const camera={x:0,y:0};
function resize(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize); resize();
function worldToScreen(x,y){return {x:(x-camera.x)*scale+W/2,y:(y-camera.y)*scale+H/2};}
function drawParking(){
  ctx.fillStyle='#252b2e';ctx.fillRect(0,0,W,H);
  const left=camera.x-W/(2*scale)-2, top=camera.y-H/(2*scale)-2;
  ctx.save();ctx.translate(W/2-camera.x*scale,H/2-camera.y*scale);ctx.scale(scale,scale);
  ctx.fillStyle='#343b3e';ctx.fillRect(left,top,W/scale+4,H/scale+4);
  ctx.strokeStyle='rgba(225,225,190,.20)';ctx.lineWidth=.035;
  for(let x=-28;x<28;x+=2.7)for(let y=-22;y<22;y+=4.8){ctx.strokeRect(x,y,2.2,4);}
  ctx.fillStyle='#55605d'; for(const o of [[-9,-6,2,1],[-2,7,2,1],[8,-3,1.4,2],[13,8,2.4,1]])ctx.fillRect(...o);
  ctx.fillStyle='#1f2526'; for(const o of [[-8,-5,1.8,.8],[-1,8,1.8,.8],[8,-2,.9,1.8],[13,8,2,.8]])ctx.fillRect(...o);
  ctx.fillStyle='#d69b39'; for(const o of [[-5,-7],[-4.4,-7.1],[7,5],[7.6,5.1],[12,-8]]){ctx.beginPath();ctx.arc(...o,.14,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function drawCar(s){
  const p=worldToScreen(s.x,s.y),u=scale/12;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(s.angle);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(-8*u,-17*u+4,16*u,34*u);
  ctx.fillStyle='#e9e5d9';ctx.fillRect(-7*u,-17*u,14*u,34*u);ctx.fillStyle='#f7f2e4';ctx.fillRect(-6*u,-18*u,12*u,3*u);ctx.fillRect(-7*u,13*u,14*u,3*u);
  ctx.fillStyle='#1a2226';ctx.fillRect(-5*u,-9*u,10*u,10*u);ctx.fillStyle='#58727a';ctx.fillRect(-4*u,-8*u,8*u,4*u);ctx.fillStyle='#303f43';ctx.fillRect(-5*u,-3*u,10*u,3*u);
  ctx.fillStyle='#d9d6ca';ctx.fillRect(-6*u,-14*u,12*u,4*u);ctx.fillRect(-6*u,2*u,12*u,9*u);ctx.fillStyle='#b9b7ad';ctx.fillRect(-5*u,3*u,10*u,1*u);
  ctx.fillStyle='#242c2d';ctx.fillRect(-7*u,-11*u,2*u,7*u);ctx.fillRect(5*u,-11*u,2*u,7*u);ctx.fillRect(-7*u,7*u,2*u,7*u);ctx.fillRect(5*u,7*u,2*u,7*u);
  ctx.fillStyle='#fbdf78';ctx.fillRect(-5*u,-16*u,3*u,2*u);ctx.fillRect(2*u,-16*u,3*u,2*u);ctx.fillStyle='#c63e37';ctx.fillRect(-5*u,14*u,3*u,2*u);ctx.fillRect(2*u,14*u,3*u,2*u);
  ctx.fillStyle='#151b1e';ctx.fillRect(-7*u,10*u,14*u,2*u);ctx.fillStyle='#cf362d';ctx.fillRect(-7*u,1*u,14*u,2*u);ctx.restore();
}
function draw(){drawParking();particles.draw(ctx,camera,scale);drawCar(car.getState());}
async function start(){await RAPIER.init();world=new RAPIER.World({x:0,y:0});
  // Hidden physical perimeter of the oversized parking lot.
  for(const [x,y,hx,hy] of [[0,-24,30,.35],[0,24,30,.35],[-30,0,.35,24],[30,0,.35,24]]){const rb=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y));world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy),rb);}
  car=new CarPhysics(world);input=new Input();particles=new Particles();
  let lastState=car.getState();
  function frame(now){const real=Math.min(.1,(now-last)/1000);last=now;fps=fps*.92+(1/Math.max(real,.001))*.08;accumulator+=real;input&&car.setInput(input.get());while(accumulator>=1/60){car.step(1/60);world.step();accumulator-=1/60;}const s=car.getState();particles.update(real,s);const look=car.localVelocity();const targetX=s.x+look.f.x*Math.min(2.5,Math.max(0,s.speed)*.08),targetY=s.y+look.f.y*Math.min(2.5,Math.max(0,s.speed)*.08);camera.x+=(targetX-camera.x)*Math.min(1,real*5);camera.y+=(targetY-camera.y)*Math.min(1,real*5);draw();debug.textContent=`V3 • ${s.speed.toFixed(1)} m/s  |  бок: ${s.sideSpeed.toFixed(2)}\nslip: ${s.slip.toFixed(1)}°  ${s.drift?'DRIFT':''}\nFPS: ${fps.toFixed(0)}`;requestAnimationFrame(frame);}requestAnimationFrame(frame);}
start().catch(e=>{debug.textContent='Ошибка запуска Rapier: '+e.message;console.error(e);});
