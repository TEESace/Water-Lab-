export const TYPES = {river:'แม่น้ำ',canal:'คลอง',pond:'บึง'};
export const area = n => n.width*n.length;
export const head = n => n.bed+n.volume/area(n);
export const total = s => s.nodes.reduce((v,n)=>v+n.volume,0);
export function example(){
 const nodes=[
 {id:'n1',type:'river',name:'แม่น้ำต้นทาง',x:-65,z:-40,width:20,length:36,bed:2,bank:4,depth:2.8,source:true},
 {id:'n2',type:'canal',name:'คลองกลาง',x:-15,z:-22,width:12,length:26,bed:1.4,bank:4,depth:2.4},
 {id:'n3',type:'pond',name:'บึงรับน้ำ',x:38,z:-42,width:34,length:38,bed:0.2,bank:5,depth:2.2},
 {id:'n4',type:'canal',name:'คลองปลายน้ำ',x:18,z:32,width:14,length:24,bed:0,bank:4,depth:1.8},
 {id:'n5',type:'river',name:'แม่น้ำทางออก',x:63,z:58,width:20,length:30,bed:-0.5,bank:4,depth:1.6,sink:true}
 ].map(n=>({...n,volume:n.width*n.length*n.depth,spill:0}));
 const edges=[
 {id:'e1',a:'n1',b:'n2',type:'channel',width:7,opening:2,gate:false},
 {id:'e2',a:'n2',b:'n3',type:'channel',width:5,opening:1.1,gate:true,dam:true,crest:5.15},
 {id:'e3',a:'n2',b:'n4',type:'channel',width:5,opening:1.5,gate:true},
 {id:'e4',a:'n3',b:'n4',type:'pipe',width:1.2,opening:1.2,gate:false},
 {id:'e5',a:'n4',b:'n5',type:'channel',width:6,opening:2,gate:false}
 ].map(e=>({...e,flow:0}));
 const s={nodes,edges,time:0,inputRate:4,outputRate:3,inflow:0,outflow:0,overflow:0,initial:0};s.initial=total(s);return s;
}
export function rebase(s){s.initial=total(s);s.inflow=0;s.outflow=0;s.overflow=0;s.time=0;s.nodes.forEach(n=>n.spill=0);s.edges.forEach(e=>e.flow=0);}
export function step(s,dt){
 if(!Number.isFinite(dt)||dt<=0||dt>0.25)throw Error('Invalid timestep');
 for(const n of s.nodes){
  if(n.source){const v=s.inputRate*dt;n.volume+=v;s.inflow+=v;}
  if(n.sink){const v=Math.min(n.volume,s.outputRate*dt);n.volume-=v;s.outflow+=v;}
 }
 const byId=new Map(s.nodes.map(n=>[n.id,n])); const moves=[];const outgoing=new Map();const degree=new Map();
 for(const e of s.edges){
  e.flow=0;const a=byId.get(e.a),b=byId.get(e.b);if(!a||!b)continue;
  const ha=head(a),hb=head(b),dh=ha-hb;if(Math.abs(dh)<1e-9)continue;
  const donor=dh>0?a:b,receiver=dh>0?b:a;
  const sill=Math.max(a.bed,b.bed),wet=Math.max(0,head(donor)-sill);
  const drop=Math.max(0,head(donor)-Math.max(head(receiver),sill));if(wet<=0||drop<=0)continue;
  const dist=Math.max(1,Math.hypot(a.x-b.x,a.z-b.z));let q=0;
  if(e.type==='pipe'){
   const diameter=e.width;const h=Math.min(diameter,wet,e.gate?Math.max(0,e.opening):diameter);
   const effectiveArea=Math.PI*diameter*diameter/4*h/diameter;
   q=.62*effectiveArea*Math.sqrt(2*9.81*drop/(1+.025*dist/diameter));
  }else if(e.dam){
   const width=e.width,gateArea=Math.max(0,e.opening)*width;
   const gateWidth=Math.min(width,3.3);const gateQ=e.gate?.62*gateWidth*Math.min(wet,e.opening)*Math.sqrt(2*9.81*drop):0;
   const spillHead=Math.max(0,head(donor)-Math.max(head(receiver),e.crest));
   const spillQ=1.7*width*Math.pow(spillHead,1.5);
   q=gateQ+spillQ;
  }else{
   const cross=e.width*wet,radius=cross/(e.width+2*wet);
   const channelQ=(1/.035)*cross*Math.pow(radius,2/3)*Math.sqrt(drop/dist);
   const gateQ=e.gate?.62*e.width*Math.min(wet,Math.max(0,e.opening))*Math.sqrt(2*9.81*drop):Infinity;
   q=Math.min(channelQ,gateQ);
  }
  if(q<=0)continue;
  moves.push({e,donor,receiver,dh,sill,wet,q,sign:dh>0?1:-1});
  degree.set(donor.id,(degree.get(donor.id)||0)+1);degree.set(receiver.id,(degree.get(receiver.id)||0)+1);
 }
 for(const m of moves){
  const equilibrate=Math.abs(m.dh)/(1/area(m.donor)+1/area(m.receiver));
  m.volume=Math.min(m.q*dt,.7*equilibrate/Math.max(degree.get(m.donor.id),degree.get(m.receiver.id)),m.wet*area(m.donor));
  outgoing.set(m.donor.id,(outgoing.get(m.donor.id)||0)+m.volume);
 }
 // Each donor uses one common multiplier, including water available above every outlet sill.
 const donorScales=new Map();
 for(const n of s.nodes){
  const own=moves.filter(m=>m.donor.id===n.id);let scale=Math.min(1,n.volume/(outgoing.get(n.id)||1));
  for(const m of own){const above=own.filter(o=>o.sill>=m.sill).reduce((sum,o)=>sum+o.volume,0);if(above>0)scale=Math.min(scale,area(n)*Math.max(0,head(n)-m.sill)/above);}
  donorScales.set(n.id,scale);
 }
 for(const m of moves)m.actual=m.volume*donorScales.get(m.donor.id);
 for(const m of moves){m.donor.volume-=m.actual;m.receiver.volume+=m.actual;m.e.flow=m.sign*m.actual/dt;}
 for(const n of s.nodes){const cap=area(n)*n.bank;if(n.volume>cap){const v=n.volume-cap;n.spill+=v;s.overflow+=v;n.volume=cap;}if(n.volume<0&&n.volume>-1e-7)n.volume=0;}
 s.time+=dt;
}
export function balance(s){return total(s)+s.outflow+s.overflow-s.initial-s.inflow;}
export function validateNode(n){return Number.isFinite(n.width)&&n.width>=3&&n.width<=50&&Number.isFinite(n.length)&&n.length>=6&&n.length<=60&&Number.isFinite(n.bed)&&n.bed>=-2&&n.bed<=10&&Number.isFinite(n.bank)&&n.bank>=.5&&n.bank<=10;}
