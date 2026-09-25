export class Input {
  constructor(){
    this.steer=0;this.throttle=0;this.brake=0;this.handbrake=0;this.keys=new Set();this.ids=new Map();this.stickId=null;
    this.stick=document.querySelector('#stick');this.knob=this.stick.querySelector('span');
    const surface=document.querySelector('#game');
    const update=e=>{const max=this.stick.getBoundingClientRect().width*.34;this.steer=Math.max(-1,Math.min(1,(e.clientX-this.originX)/max));this.knob.style.transform=`translateX(${this.steer*max}px)`;};
    const begin=e=>{if(this.stickId!==null)return;e.preventDefault();this.stickId=e.pointerId;this.originX=e.clientX;
      const size=this.stick.getBoundingClientRect().width;this.stick.style.left=(e.clientX-size/2)+'px';this.stick.style.top=(e.clientY-size/2)+'px';this.stick.style.bottom='auto';
      this.capture=surface;surface.setPointerCapture(e.pointerId);update(e);};
    surface.addEventListener('pointerdown',begin);this.stick.addEventListener('pointerdown',begin);
    addEventListener('pointermove',e=>{if(e.pointerId===this.stickId){e.preventDefault();update(e);}},{passive:false});
    const release=e=>{if(e.pointerId!==this.stickId)return;this.stickId=null;this.steer=0;this.knob.style.transform='translateX(0)';this.home();};
    for(const name of ['pointerup','pointercancel'])addEventListener(name,release);
    surface.addEventListener('lostpointercapture',release);
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
  home(){this.stick.style.left='';this.stick.style.top='';this.stick.style.bottom='';}
  reset(){this.keys.clear();const id=this.stickId;this.stickId=null;if(id!==null&&this.capture?.hasPointerCapture?.(id))this.capture.releasePointerCapture(id);this.steer=this.throttle=this.brake=this.handbrake=0;this.knob.style.transform='translateX(0)';this.home();for(const set of this.ids.values())set.clear();document.querySelectorAll('.active').forEach(el=>el.classList.remove('active'));}
  get(){const k=this.keys;return {steer:k.has('ArrowLeft')||k.has('KeyA')?-1:k.has('ArrowRight')||k.has('KeyD')?1:this.steer,throttle:k.has('ArrowUp')||k.has('KeyW')?1:this.throttle,brake:k.has('ArrowDown')||k.has('KeyS')?1:this.brake,handbrake:k.has('Space')?1:this.handbrake};}
}
