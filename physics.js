import RAPIER from './rapier.js';

export const CAR_CONFIG = {
  mass: 1.72, wheelBase: 1.72, track: 1.0, bodyLength: 2.72, bodyWidth: 1.34,
  engineForce: 10.1, reverseForce: 4.8, brakeForce: 15.5,
  maxSpeed: 18.2, maxReverseSpeed: 4.8, rollingResistance: 1.12, drag: .026,
  steeringAngle: .47, steeringSpeed: 3.35, highSpeedSteeringReduction: .56,
  frontGrip: 10.6, rearGrip: 3.15, handbrakeGrip: .38,
  throttleDrift: 2.8, driftBuild: 4.8, gripRecoverySpeed: .82,
  yawResponse: 4.25, driftYawResponse: 1.7, maxYawRate: 2.08,
  driftAssist: .18, angularDamping: .62
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const approach = (v, target, delta) => v < target ? Math.min(target, v + delta) : Math.max(target, v - delta);
const lerp = (a,b,t) => a + (b-a)*t;

export class CarPhysics {
  constructor(world, config = CAR_CONFIG) {
    this.world = world; this.cfg = config;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0).setLinearDamping(0).setAngularDamping(0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(config.bodyWidth / 2, config.bodyLength / 2).setDensity(config.mass / (config.bodyWidth * config.bodyLength)), this.body);
    this.steerInput = 0; this.throttle = 0; this.brake = 0; this.handbrake = 0;
    this.wheelAngle = 0; this.forwardSpeed = 0; this.sideSpeed = 0; this.yawRate = 0; this.driftAmount = 0;
    this.slip = 0; this.drift = false;
  }
  setInput(input) { this.steerInput = input.steer; this.throttle = input.throttle; this.brake = input.brake; this.handbrake = input.handbrake; }
  axes() { const a = this.body.rotation(); return { f:{x:Math.sin(a),y:-Math.cos(a)}, r:{x:Math.cos(a),y:Math.sin(a)} }; }
  localVelocity() { const v=this.body.linvel(), a=this.axes(); return { forward:v.x*a.f.x+v.y*a.f.y, side:v.x*a.r.x+v.y*a.r.y, ...a }; }
  point(forward, side) { const a=this.axes(), t=this.body.translation(); return {x:t.x+a.f.x*forward+a.r.x*side,y:t.y+a.f.y*forward+a.r.y*side}; }
  step(dt) {
    const c=this.cfg, b=this.body, local=this.localVelocity();
    this.forwardSpeed = local.forward;
    this.sideSpeed = local.side;
    const absForward=Math.abs(this.forwardSpeed), speedNorm=clamp(absForward/c.maxSpeed,0,1);
    const maxSteer=c.steeringAngle*(1-c.highSpeedSteeringReduction*speedNorm);
    this.wheelAngle=approach(this.wheelAngle,this.steerInput*maxSteer,c.steeringSpeed*dt);
    // Brake works as a brake while rolling forward. At a stop it becomes reverse gear.
    let acceleration=this.handbrake ? 0 : this.throttle*c.engineForce/c.mass;
    if(this.brake){
      acceleration += this.forwardSpeed>.25
        ? -this.brake*c.brakeForce/c.mass
        : -this.brake*c.reverseForce/c.mass;
    }
    // Keep world-space momentum. A rotating body must not rotate its velocity with it.
    const direction=local.forward<-.001?-1:1;
    const totalSpeed=Math.hypot(local.forward,local.side);
    let travel=direction*totalSpeed;
    travel+=acceleration*dt;
    const resistance=(c.rollingResistance+c.drag*absForward)*dt;
    travel=approach(travel,0,resistance);
    // Sliding past 90 degrees is not selecting reverse gear: do not erase momentum.
    travel=clamp(travel,-Math.max(c.maxReverseSpeed,totalSpeed),c.maxSpeed);
    const steerLoad=clamp(Math.abs(this.wheelAngle)/.27,0,1)*clamp((absForward-1)/2.8,0,1);
    // Rear-wheel-drive behaviour: a firm throttle input unloads the rear axle in a turn.
    const powerBreak=Math.max(0,this.throttle-.20)*steerLoad*1.5;
    const existingSlip=Math.abs(Math.atan2(local.side,Math.max(1,Math.abs(local.forward))));
    const sustain=this.throttle*clamp(existingSlip/.4,0,1)*.86;
    const desiredDrift=clamp(Math.max(this.handbrake,powerBreak,sustain),0,1);
    const build=desiredDrift>this.driftAmount ? 5.5 : 1.15;
    this.driftAmount=this.handbrake ? 1 : approach(this.driftAmount,desiredDrift,build*dt);
    const handbrakePressed=!!this.handbrake&&!this.rearLocked;
    this.rearLocked=!!this.handbrake;
    if(handbrakePressed){
      this.handbrakeTurn=Math.abs(this.wheelAngle)>.025?Math.sign(this.wheelAngle)*direction:Math.abs(this.yawRate)>.15?Math.sign(this.yawRate):0;
    }
    this.handbrakeTime=this.rearLocked?.35:Math.max(0,(this.handbrakeTime||0)-dt);
    if(this.rearLocked) travel=approach(travel,0,7.4*dt);
    // Exponential grip recovery cannot erase small lateral velocities in one step.
    // More gas opens the slide; lifting restores rear grip and tightens the arc.
    const slideGrip=lerp(2.6,.45,this.throttle);
    const grip=this.rearLocked?.035:lerp(7,slideGrip,this.driftAmount);
    let side=local.side*Math.exp(-grip*dt),forward=local.forward;
    const length=Math.hypot(forward,side);
    if(length>.05&&Math.sign(travel)===direction){forward=forward/length*Math.abs(travel);side=side/length*Math.abs(travel);}
    else {forward=travel;side=0;}
    this.forwardSpeed=forward;this.sideSpeed=side;this.travelSpeed=travel;
    const signedSlip=Math.atan2(side,Math.max(1,Math.abs(forward)));
    const geometricYaw=(forward/c.wheelBase)*Math.tan(this.wheelAngle);
    // Mild alignment only. Player countersteer controls the angle.
    const alignment=direction>0?signedSlip*.55:0;
    const yawTarget=geometricYaw*(1+this.driftAmount*.30)+alignment;
    if(this.rearLocked){
      const pivot=(this.handbrakeTurn||0)*(3.2+Math.min(12,Math.abs(travel))*.12)*clamp(Math.abs(travel)/1.5,0,1);
      this.yawRate=approach(this.yawRate,pivot,11*dt);
    }else this.yawRate=approach(this.yawRate,yawTarget,(this.handbrakeTime>0?1.6:3.1)*dt);
    if(handbrakePressed&&Math.abs(travel)>1.5){
      this.yawRate+=(this.handbrakeTurn||0)*1.65*clamp(Math.abs(travel)/4,0,1);
    }
    // Smooth spin guard only beyond 60 degrees; no snap back to the road.
    if(this.handbrakeTime===0&&Math.abs(signedSlip)>Math.PI/3)this.yawRate+=Math.sign(signedSlip)*(Math.abs(signedSlip)-Math.PI/3)*4*dt;
    const yawLimit=this.handbrakeTime>0?4.8:c.maxYawRate;
    this.yawRate=clamp(this.yawRate,-yawLimit,yawLimit);
    if(Math.abs(travel)<.08)this.yawRate=approach(this.yawRate,0,18*dt);
    if(Math.abs(this.steerInput)<.04 && this.driftAmount<.08) this.yawRate=approach(this.yawRate,0,c.angularDamping*dt);
    const a=this.axes(), velocity={x:a.f.x*this.forwardSpeed+a.r.x*this.sideSpeed,y:a.f.y*this.forwardSpeed+a.r.y*this.sideSpeed};
    b.setLinvel(velocity,true); b.setAngvel(this.yawRate,true);
    this.slip=Math.abs(Math.atan2(this.sideSpeed,Math.max(1,Math.abs(this.forwardSpeed))))*180/Math.PI;
    this.drift=this.driftAmount>.12 && Math.abs(travel)>2 && this.slip>8;
  }
  getState() { const t=this.body.translation(), rearLeft=this.point(-this.cfg.wheelBase/2,-this.cfg.track/2), rearRight=this.point(-this.cfg.wheelBase/2,this.cfg.track/2); return {x:t.x,y:t.y,angle:this.body.rotation(),wheelAngle:this.wheelAngle,speed:this.travelSpeed??this.forwardSpeed,sideSpeed:this.sideSpeed,slip:this.slip,drift:this.drift,driftAmount:this.driftAmount,rearLocked:!!this.rearLocked,throttle:this.throttle,rearWheels:[rearLeft,rearRight]}; }
}
export { RAPIER };
