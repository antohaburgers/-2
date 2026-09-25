export const MAP={width:180,height:160};
export const SECTIONS=[
  {id:'parking',name:'01 · Парковка',x:-57,y:-34,a:0},
  {id:'eight',name:'02 · Восьмёрка',x:38,y:-45,a:-Math.PI/4},
  {id:'minami',name:'03 · Minami-style',x:-60,y:61,a:Math.PI/2},
  {id:'slalom',name:'04 · Перекладки',x:23,y:16,a:Math.PI/2},
  {id:'skidpad',name:'05 · Круги',x:60,y:42,a:Math.PI/2},
  {id:'hairpin',name:'06 · Шпилька',x:14,y:-5,a:Math.PI/2}
];
function stroke(ctx,points,width,color,closed=false){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(closed)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
function track(ctx,points,width,closed=false){stroke(ctx,points,width+1.1,'#aeb6a5',closed);stroke(ctx,points,width,'#373e40',closed);}
function text(ctx,t,x,y,size=1.5,color='#d7decf'){ctx.fillStyle=color;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.fillText(t,x,y);}
function circle(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function curve(points){const result=[];for(let i=0;i<points.length;i++){const p0=points[(i-1+points.length)%points.length],p1=points[i],p2=points[(i+1)%points.length],p3=points[(i+2)%points.length];for(let j=0;j<12;j++){const t=j/12,t2=t*t,t3=t*t*t;result.push([0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)));}}return result;}
const minami=curve([[-76,61],[-43,61],[-20,58],[-14,46],[-17,29],[-29,15],[-42,13],[-48,22],[-41,31],[-33,35],[-42,43],[-60,41],[-73,44]]);
const eight=Array.from({length:161},(_,i)=>{const t=i*Math.PI*2/160;return [38+28*Math.sin(t),-45+16*Math.sin(2*t)];});
const slalom=Array.from({length:81},(_,i)=>[18+i*.73,16+Math.sin(i/80*Math.PI*4)*7]);
const hairpin=curve([[17,-5],[65,-5],[75,-8],[76,-20],[64,-22],[20,-22]]);
export function drawMap(ctx,detail=true){
  ctx.fillStyle='#253c34';ctx.fillRect(-90,-80,180,160);
  // Connected service roads: every training section is reachable without teleporting.
  track(ctx,[[-60,-26],[-60,-9],[0,-9],[0,61],[-14,61]],9);
  track(ctx,[[0,-9],[0,-45],[12,-45]],8);
  track(ctx,[[0,16],[23,16]],8);track(ctx,[[0,-9],[17,-5]],8);
  track(ctx,[[75,16],[80,30],[74,49]],8);
  track(ctx,[[-14,61],[20,61],[42,61]],8);
  ctx.fillStyle='#525857';ctx.fillRect(-83,-72,59,49);ctx.fillStyle='#393f41';ctx.fillRect(-82,-71,57,47);
  track(ctx,eight,9,true);track(ctx,minami,10,true);track(ctx,slalom,10);track(ctx,hairpin,8,true);
  circle(ctx,57,54,21,'#adb6a2');circle(ctx,57,54,20.5,'#373e40');
  for(const r of [9,15]){ctx.beginPath();ctx.arc(57,54,r,0,Math.PI*2);ctx.strokeStyle='#cfbb79';ctx.lineWidth=.13;ctx.setLineDash([.7,.7]);ctx.stroke();ctx.setLineDash([]);}
  circle(ctx,57,54,3,'#647955');
  if(detail){
    // Marked parking rows leave a broad open central practice apron.
    ctx.strokeStyle='#b8bea6';ctx.lineWidth=.09;
    for(let x=-79;x<-29;x+=3.3){ctx.strokeRect(x,-68,3,5.4);ctx.strokeRect(x,-30,3,4.5);}
    stroke(ctx,[[-79,-58],[-29,-58]],.12,'#cebf7d');
    // Apex paint and guide cones are flat markings; only the perimeter is solid.
    for(const [points,w] of [[minami,11],[hairpin,9]]){ctx.setLineDash([1,1]);stroke(ctx,points,w,'#c86951',true);ctx.setLineDash([]);stroke(ctx,points,w-.7,'#373e40',true);}
    ctx.setLineDash([1.2,1.2]);stroke(ctx,eight,.14,'#c6b774',true);stroke(ctx,slalom,.14,'#c6b774');ctx.setLineDash([]);
    for(let i=0;i<9;i++)circle(ctx,22+i*6,16,.24,'#efa04a');
    for(const x of [-72,-63,-54,-45,-36,-27]){ctx.fillStyle='#dedac4';ctx.fillRect(x,68,7,.5);}
    text(ctx,'WALL LINE',-49,66,1.2,'#e9bd85');
    // Start line along the Minami-inspired straight.
    for(let row=0;row<2;row++)for(let j=0;j<12;j++){ctx.fillStyle=(row+j)%2?'#e0dfd1':'#202828';ctx.fillRect(-62+row*.5,56+j*.8,.5,.8);}
    for(const [t,x,y] of [['01 / PARKING',-54,-74],['02 / FIGURE 8',38,-67],['03 / MINAMI STYLE',-48,74],['04 / TRANSITIONS',49,4],['05 / SKIDPAD',57,79],['06 / HAIRPIN',46,-27]])text(ctx,t,x,y);
    // Low-detail landscaping outside the driving surfaces.
    for(const [x,y] of [[-87,-60],[-87,-30],[-85,5],[-82,25],[84,-66],[83,-42],[6,76],[-10,-71]]){circle(ctx,x+.5,y+.5,2.5,'#162d27');circle(ctx,x,y,2.3,'#3b5943');circle(ctx,x-.4,y-.5,1.4,'#49674b');}
    text(ctx,'← PARKING',-17,-12,1.1);text(ctx,'MINAMI ↓',-6,9,1.1);text(ctx,'FIGURE 8 ↑',0,-25,1.1);
  }
  ctx.strokeStyle='#afb5a7';ctx.lineWidth=.7;ctx.strokeRect(-89.6,-79.6,179.2,159.2);
}
export function nearestSection(x,y){return SECTIONS.reduce((a,b)=>Math.hypot(x-a.x,y-a.y)<Math.hypot(x-b.x,y-b.y)?a:b);}
