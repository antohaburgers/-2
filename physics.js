import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier2d-compat@0.17.3/+esm';

export const CAR_CONFIG = {
  mass: 1.72, wheelBase: 1.72, track: .88, bodyLength: 2.72, bodyWidth: 1.34,
  engineForce: 10.1, reverseForce: 4.8, brakeForce: 15.5,
  maxSpeed: 15.8, maxReverseSpeed: 4.8, rollingResistance: 1.12, drag: .026,
  steeringAngle: .47, steeringSpeed: 3.35, highSpeedSteeringReduction: .56,
  frontGrip: 10.6, rearGrip: 3.15, handbrakeGrip: .38,
  throttleDrift: 1.2, driftBuild: 3.9, gripRecoverySpeed: .82,
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
    this.forwardSpeed = approach(this.forwardSpeed, local.forward, 8 * dt);
    this.sideSpeed = approach(this.sideSpeed, local.side, 8 * dt);
    const absForward=Math.abs(this.forwardSpeed), speedNorm=clamp(absForward/c.maxSpeed,0,1);
    const maxSteer=c.steeringAngle*(1-c.highSpeedSteeringReduction*speedNorm);
    this.wheelAngle=approach(this.wheelAngle,this.steerInput*maxSteer,c.steeringSpeed*dt);
    // Brake works as a brake while rolling forward. At a stop it becomes reverse gear.
    let acceleration=this.throttle*c.engineForce/c.mass;
    if(this.brake){
      acceleration += this.forwardSpeed>.25
        ? -this.brake*c.brakeForce/c.mass
        : -this.brake*c.reverseForce/c.mass;
    }
    this.forwardSpeed+=acceleration*dt;
    const resistance=(c.rollingResistance+c.drag*absForward)*dt;
    this.forwardSpeed=approach(this.forwardSpeed,0,resistance);
    this.forwardSpeed=clamp(this.forwardSpeed,-c.maxReverseSpeed,c.maxSpeed);
    const steerLoad=Math.abs(this.wheelAngle)*clamp(absForward/4,0,1);
    // Rear-wheel-drive behaviour: a firm throttle input unloads the rear axle in a turn.
    const powerBreak=Math.max(0,this.throttle-.32)*steerLoad*c.throttleDrift;
    const desiredDrift=clamp(Math.max(this.handbrake*.96,powerBreak),0,1);
    const build=desiredDrift>this.driftAmount ? c.driftBuild : c.gripRecoverySpeed;
    this.driftAmount=approach(this.driftAmount,desiredDrift,build*dt);
    const rearGrip=lerp(c.rearGrip,c.handbrakeGrip,this.driftAmount);
    const geometricYaw=(this.forwardSpeed/c.wheelBase)*Math.tan(this.wheelAngle);
    const rearDecay=rearGrip*(1-this.driftAmount*.82), frontDecay=c.frontGrip*.38;
    const steeringPush=this.forwardSpeed*Math.sin(this.wheelAngle)*(this.driftAmount*1.22+.055);
    this.sideSpeed+=steeringPush*dt;
    this.sideSpeed=approach(this.sideSpeed,0,(rearDecay+frontDecay)*dt);
    const counterSteer=this.sideSpeed*.18;
    const driftYaw=geometricYaw+(this.sideSpeed/c.wheelBase)*(.62+this.driftAmount*.42)-counterSteer;
    const yawTarget=lerp(geometricYaw,driftYaw,this.driftAmount);
    this.yawRate=approach(this.yawRate,yawTarget,lerp(c.yawResponse,c.driftYawResponse,this.driftAmount)*dt);
    this.yawRate=clamp(this.yawRate,-c.maxYawRate,c.maxYawRate);
    if(Math.abs(this.steerInput)<.04 && this.driftAmount<.08) this.yawRate=approach(this.yawRate,0,c.angularDamping*dt);
    const a=this.axes(), velocity={x:a.f.x*this.forwardSpeed+a.r.x*this.sideSpeed,y:a.f.y*this.forwardSpeed+a.r.y*this.sideSpeed};
    b.setLinvel(velocity,true); b.setAngvel(this.yawRate,true);
    this.slip=Math.abs(Math.atan2(this.sideSpeed,Math.max(1,Math.abs(this.forwardSpeed))))*180/Math.PI;
    this.drift=this.driftAmount>.12 && absForward>2.7 && this.slip>5;
  }
  getState() { const t=this.body.translation(), rearLeft=this.point(-this.cfg.wheelBase/2,-this.cfg.track/2), rearRight=this.point(-this.cfg.wheelBase/2,this.cfg.track/2); return {x:t.x,y:t.y,angle:this.body.rotation(),wheelAngle:this.wheelAngle,speed:this.forwardSpeed,sideSpeed:this.sideSpeed,slip:this.slip,drift:this.drift,driftAmount:this.driftAmount,rearWheels:[rearLeft,rearRight]}; }
}
export { RAPIER };
