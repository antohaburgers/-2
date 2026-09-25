const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class Camera {
  constructor(){this.x=0;this.y=0;this.angle=0;this.mode=0;this.lookAhead=12;}
  target(s){return {x:s.x+Math.sin(s.angle)*this.lookAhead,y:s.y-Math.cos(s.angle)*this.lookAhead};}
  reset(s){this.angle=this.mode?s.angle:0;const p=this.mode?this.target(s):s;this.x=p.x;this.y=p.y;}
  scale(height){return this.mode?Math.min(23,height*.29/this.lookAhead):23;}
  toggle(s){this.mode=1-this.mode;this.reset(s);return this.mode;}
  update(dt,s){
    if(this.mode){
      const target=this.target(s),k=1-Math.exp(-6*dt);
      this.x+=(target.x-this.x)*k;this.y+=(target.y-this.y)*k;
      this.angle+=wrap(s.angle-this.angle)*(1-Math.exp(-7*dt));
      const lag=wrap(s.angle-this.angle);
      if(Math.abs(lag)>.32)this.angle=s.angle-Math.sign(lag)*.32;
      // Keep the car in frame through direction changes without a sharp camera swing.
      const dx=this.x-s.x,dy=this.y-s.y,d=Math.hypot(dx,dy);
      if(d>this.lookAhead){this.x=s.x+dx/d*this.lookAhead;this.y=s.y+dy/d*this.lookAhead;}
    }else{
      this.angle=0;const look=Math.min(2.5,Math.max(0,s.speed)*.08),k=Math.min(1,dt*5);
      this.x+=(s.x+Math.sin(s.angle)*look-this.x)*k;
      this.y+=(s.y-Math.cos(s.angle)*look-this.y)*k;
    }
  }
  project(x,y,scale,w,h){const dx=(x-this.x)*scale,dy=(y-this.y)*scale,c=Math.cos(this.angle),s=Math.sin(this.angle);return {x:w/2+dx*c+dy*s,y:h/2-dx*s+dy*c};}
}
