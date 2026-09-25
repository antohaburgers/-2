import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier2d-compat@0.17.3/+esm';

export const CAR_CONFIG = {
  mass: 1.15, engineForce: 11.5, reverseForce: 5.0, brakeForce: 8.5,
  maxSpeed: 18, maxReverseSpeed: 5, frontGrip: 7.2, rearGrip: 4.8,
  handbrakeGrip: 0.32, steeringAngle: 0.62, steeringSpeed: 8.5,
  highSpeedSteeringReduction: 0.58, drag: 0.12, rollingResistance: 0.7,
  angularDamping: 2.0, driftAssist: 0.16, gripRecoverySpeed: 2.6,
  wheelBase: 1.65, halfWidth: .72, bodyLength: 2.55, bodyWidth: 1.25
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class CarPhysics {
  constructor(world, config = CAR_CONFIG) {
    this.world = world; this.cfg = config;
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0).setLinearDamping(0).setAngularDamping(0);
    this.body = world.createRigidBody(desc);
    const collider = RAPIER.ColliderDesc.cuboid(config.bodyWidth / 2, config.bodyLength / 2).setDensity(config.mass / (config.bodyWidth * config.bodyLength));
    world.createCollider(collider, this.body);
    this.steer = 0; this.throttle = 0; this.brake = 0; this.handbrake = 0; this._wheelAngle = 0;
    this.slip = 0; this.sideSpeed = 0; this.forwardSpeed = 0; this.drift = false;
  }
  setInput(input) { this.steer = input.steer; this.throttle = input.throttle; this.brake = input.brake; this.handbrake = input.handbrake; }
  localVelocity() {
    const a = this.body.rotation(), v = this.body.linvel();
    const f = { x: Math.sin(a), y: -Math.cos(a) }, r = { x: Math.cos(a), y: Math.sin(a) };
    return { forward: v.x * f.x + v.y * f.y, side: v.x * r.x + v.y * r.y, f, r };
  }
  axlePoint(forward, side = 0) {
    const a = this.body.rotation(), t = this.body.translation();
    return { x: t.x + Math.sin(a) * forward + Math.cos(a) * side, y: t.y - Math.cos(a) * forward + Math.sin(a) * side };
  }
  pointVelocity(point) {
    const t = this.body.translation(), v = this.body.linvel(), w = this.body.angvel();
    const rx = point.x - t.x, ry = point.y - t.y;
    return { x: v.x - w * ry, y: v.y + w * rx };
  }
  tireImpulse(point, right, grip, dt) {
    const pv = this.pointVelocity(point), lateral = pv.x * right.x + pv.y * right.y;
    const amount = clamp(-lateral * grip * dt, -0.42, 0.42);
    this.body.applyImpulseAtPoint({ x: right.x * amount, y: right.y * amount }, point, true);
    return lateral;
  }
  step(dt) {
    const c = this.cfg, b = this.body, lv = this.localVelocity();
    this.forwardSpeed = lv.forward; this.sideSpeed = lv.side;
    const speed = Math.hypot(b.linvel().x, b.linvel().y);
    const speedFactor = clamp(speed / c.maxSpeed, 0, 1);
    const steeringLimit = c.steeringAngle * (1 - c.highSpeedSteeringReduction * speedFactor);
    const desiredSteer = this.steer * steeringLimit;
    const steerDelta = clamp(desiredSteer - this._wheelAngle, -c.steeringSpeed * dt, c.steeringSpeed * dt);
    this._wheelAngle = (this._wheelAngle || 0) + steerDelta;
    const rearGrip = this.handbrake > .1 ? c.handbrakeGrip : lerp(c.rearGrip, c.handbrakeGrip, this.handbrake);
    const throttleSlip = Math.abs(this.throttle) * (Math.abs(lv.forward) / c.maxSpeed) * 1.8;
    const effectiveRear = Math.max(.18, rearGrip - throttleSlip);
    const frontGrip = c.frontGrip * (1 - .10 * speedFactor);
    const frontCenter = this.axlePoint(c.wheelBase / 2), rearCenter = this.axlePoint(-c.wheelBase / 2);
    const frontRight = { x: lv.r.x * Math.cos(this._wheelAngle) - lv.f.x * Math.sin(this._wheelAngle), y: lv.r.y * Math.cos(this._wheelAngle) - lv.f.y * Math.sin(this._wheelAngle) };
    const frontSlip = this.tireImpulse(frontCenter, frontRight, frontGrip, dt);
    const rearSlip = this.tireImpulse(rearCenter, lv.r, effectiveRear, dt);
    const drive = this.throttle >= 0 ? this.throttle * c.engineForce : this.throttle * c.reverseForce;
    const movingForward = lv.forward > .15;
    const braking = this.brake > .05 && movingForward ? c.brakeForce * this.brake : 0;
    const driveForce = drive - braking * Math.sign(lv.forward || 1);
    b.applyImpulseAtPoint({ x: lv.f.x * driveForce * dt, y: lv.f.y * driveForce * dt }, rearCenter, true);
    const resistance = c.rollingResistance * (Math.abs(lv.forward) < .25 ? 1.6 : 1) + c.drag * speed;
    b.applyImpulse({ x: -lv.f.x * lv.forward * resistance * dt, y: -lv.f.y * lv.forward * resistance * dt }, true);
    const max = this.throttle < 0 ? c.maxReverseSpeed : c.maxSpeed;
    if (speed > max) { const k = max / speed; b.setLinvel({ x: b.linvel().x * k, y: b.linvel().y * k }, true); }
    b.setAngvel(clamp(b.angvel(), -7.5, 7.5), true);
    this.slip = Math.abs(rearSlip) / (Math.abs(lv.forward) + 2);
    this.drift = this.slip > .18 && speed > 2.2;
    // Very light arcade recovery only when the car is not actively sliding.
    if (!this.drift) b.setAngvel(b.angvel() * Math.max(0, 1 - c.driftAssist * dt), true);
  }
  getState() { const t = this.body.translation(); return { x:t.x, y:t.y, angle:this.body.rotation(), wheelAngle:this._wheelAngle || 0, speed:this.forwardSpeed, sideSpeed:this.sideSpeed, slip:this.slip, drift:this.drift }; }
}

export { RAPIER };
