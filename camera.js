const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class Camera {
  constructor(){this.x=0;this.y=0;this.angle=0;this.mode=0;}
  reset(s){this.x=s.x;this.y=s.y;this.angle=this.mode?s.angle:0;}
  toggle(s){this.mode=1-this.mode;this.reset(s);return this.mode;}
  update(dt,s){
    if(this.mode){
      this.x=s.x;this.y=s.y;
      this.angle+=wrap(s.angle-this.angle)*(1-Math.exp(-7*dt));
      const lag=wrap(s.angle-this.angle);
      if(Math.abs(lag)>.32)this.angle=s.angle-Math.sign(lag)*.32;
    }else{
      this.angle=0;const look=Math.min(2.5,Math.max(0,s.speed)*.08),k=Math.min(1,dt*5);
      this.x+=(s.x+Math.sin(s.angle)*look-this.x)*k;
      this.y+=(s.y-Math.cos(s.angle)*look-this.y)*k;
    }
  }
  project(x,y,scale,w,h){const dx=(x-this.x)*scale,dy=(y-this.y)*scale,c=Math.cos(this.angle),s=Math.sin(this.angle);return {x:w/2+dx*c+dy*s,y:h/2-dx*s+dy*c};}
}
