// All sounds are generated locally. No samples, network requests or audio assets.
export class CarAudio {
  constructor(){this.gear=1;this.shift=0;this.enabled=true;this.rpm=950;}
  async unlock(){
    if(!this.ctx){
      const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      const c=this.ctx=new A();this.master=c.createGain();this.master.gain.value=.24;this.master.connect(c.destination);
      this.engine=c.createGain();this.engine.gain.value=0;this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=950;this.engine.connect(this.filter);this.filter.connect(this.master);
      this.osc=[1,2,4].map((h,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=i===0?'sawtooth':'triangle';g.gain.value=[.36,.2,.07][i];o.connect(g);g.connect(this.engine);o.start();return {o,h};});
      const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      this.noise=c.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;this.squealFilter=c.createBiquadFilter();this.squealFilter.type='bandpass';this.squealFilter.Q.value=3;this.squealFilter.frequency.value=1700;
      this.tyres=c.createGain();this.tyres.gain.value=0;this.noise.connect(this.squealFilter);this.squealFilter.connect(this.tyres);this.tyres.connect(this.master);this.noise.start();
      this.tone=c.createOscillator();this.tone.type='sine';this.tone.frequency.value=1100;const tg=c.createGain();tg.gain.value=.13;this.tone.connect(tg);tg.connect(this.tyres);this.tone.start();
    }
    await this.ctx.resume();
  }
  update(dt,s){
    if(!this.ctx)return;const c=this.ctx,t=c.currentTime,speed=Math.abs(s.speed),limits=[0,5,9,13,16];
    if(this.shift<=0){if(this.gear<4&&speed>limits[this.gear]){this.gear++;this.shift=.18;}else if(this.gear>1&&speed<limits[this.gear-1]-1.2){this.gear--;this.shift=.13;}}
    this.shift=Math.max(0,this.shift-dt);
    const low=limits[this.gear-1],high=limits[this.gear];const rev=1100+Math.max(0,Math.min(1,(speed-low)/(high-low)))*4600+s.throttle*(450+s.driftAmount*1000);
    this.rpm+=(rev-this.rpm)*Math.min(1,dt*10);for(const {o,h} of this.osc)o.frequency.setTargetAtTime(this.rpm/30*h,t,.045);
    this.engine.gain.setTargetAtTime(document.hidden?0:(this.shift>0?.08:.22+s.throttle*.32),t,.04);
    this.filter.frequency.setTargetAtTime(500+this.rpm*.22,t,.08);
    const speedFade=Math.max(0,Math.min(1,(speed-7)/3));
    const skid=speedFade*Math.min(1,s.rearLocked?1:Math.max(0,(s.slip-7)/24));
    this.tyres.gain.setTargetAtTime(document.hidden?0:skid*.15,t,.09);this.squealFilter.frequency.setTargetAtTime(1300+skid*900,t,.1);this.tone.frequency.setTargetAtTime(900+skid*420,t,.07);
  }
  pause(){if(this.ctx){this.engine.gain.setTargetAtTime(0,this.ctx.currentTime,.025);this.tyres.gain.setTargetAtTime(0,this.ctx.currentTime,.025);}}
}
