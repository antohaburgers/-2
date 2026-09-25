export class Input {
  constructor(){
    this.steer=0;this.throttle=0;this.brake=0;this.handbrake=0;this.keys=new Set();this.ids=new Map();this.stickId=null;
    this.stick=document.querySelector('#stick');this.knob=this.stick.querySelector('span');
    const update=e=>{const r=this.stick.getBoundingClientRect(),max=r.width*.34;this.steer=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/max));this.knob.style.transform=`translateX(${this.steer*max}px)`;};
    this.stick.addEventListener('pointerdown',e=>{e.preventDefault();if(this.stickId!==null)return;this.stickId=e.pointerId;this.stick.setPointerCapture(e.pointerId);update(e);});
    this.stick.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId){e.preventDefault();update(e);}});
    const release=e=>{if(e.pointerId!==this.stickId)return;this.stickId=null;this.steer=0;this.knob.style.transform='translateX(0)';};
    for(const name of ['pointerup','pointercancel','lostpointercapture'])this.stick.addEventListener(name,release);
    for(const prop of ['throttle','brake','handbrake']){
      const el=document.querySelector('#'+prop),held=new Set();this.ids.set(prop,held);
      el.addEventListener('pointerdown',e=>{e.preventDefault();held.add(e.pointerId);el.setPointerCapture(e.pointerId);this[prop]=1;el.classList.add('active');});
      const off=e=>{held.delete(e.pointerId);this[prop]=held.size?1:0;el.classList.toggle('active',!!this[prop]);};
      for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,off);
    }
    addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','Space'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}});
    addEventListener('keyup',e=>this.keys.delete(e.code));
    addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>this.reset());
    for(const name of ['gesturestart','gesturechange','gestureend','dblclick','contextmenu'])document.addEventListener(name,e=>e.preventDefault(),{passive:false});
    for(const name of ['touchstart','touchmove','touchend'])document.querySelector('#game-controls').addEventListener(name,e=>e.preventDefault(),{passive:false});
  }
  reset(){this.keys.clear();this.stickId=null;this.steer=this.throttle=this.brake=this.handbrake=0;this.knob.style.transform='translateX(0)';for(const set of this.ids.values())set.clear();document.querySelectorAll('.active').forEach(el=>el.classList.remove('active'));}
  get(){const k=this.keys;return {steer:k.has('ArrowLeft')||k.has('KeyA')?-1:k.has('ArrowRight')||k.has('KeyD')?1:this.steer,throttle:k.has('ArrowUp')||k.has('KeyW')?1:this.throttle,brake:k.has('ArrowDown')||k.has('KeyS')?1:this.brake,handbrake:k.has('Space')?1:this.handbrake};}
}
