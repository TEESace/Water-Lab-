import * as THREE from 'three';
// All terrain samples, streets, bridges and buildings use the same meter coordinates as water nodes.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function baseElevation(x,z){
 return 5.1-.011*z+14*Math.exp(-((x+106)**2/1500+(z+97)**2/1750))+9*Math.exp(-((x-112)**2/1150+(z+107)**2/1650))+5*Math.exp(-((x+120)**2/1900+(z-97)**2/1500))+.48*Math.sin(x*.033)*Math.cos(z*.029);
}
function rectDistance(x,z,n){const dx=Math.abs(x-n.x)-n.width/2,dz=Math.abs(z-n.z)-n.length/2;return Math.hypot(Math.max(0,dx),Math.max(0,dz))+Math.min(0,Math.max(dx,dz));}
const streets=[{axis:'x',at:-76,start:-100,end:100},{axis:'x',at:10,start:-100,end:100},{axis:'x',at:76,start:-100,end:100},{axis:'z',at:-83,start:-100,end:100},{axis:'z',at:-39,start:-100,end:100},{axis:'z',at:78,start:-100,end:100},{axis:'z',at:5,start:-100,end:-76}];
export function createCity(state){
 const root=new THREE.Group(),urban=new THREE.Group(),nature=new THREE.Group();root.add(urban,nature);const nodeMap=new Map(state.nodes.map(n=>[n.id,n]));
 const links=state.edges.filter(e=>e.type==='channel').map(e=>({e,a:nodeMap.get(e.a),b:nodeMap.get(e.b)})).filter(e=>e.a&&e.b);
 function feature(x,z){let near={distance:Infinity,bed:0,bank:0};
  for(const n of state.nodes){const d=rectDistance(x,z,n);if(d<near.distance)near={distance:d,bed:n.bed,bank:n.bed+n.bank};}
  for(const {e,a,b} of links){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t)-e.width/2;if(d<near.distance)near={distance:d,bed:a.bed+(b.bed-a.bed)*t,bank:a.bed+a.bank+(b.bed+b.bank-a.bed-a.bank)*t};}
  return near;
 }
 function streetDistance(x,z){let d=Infinity;for(const r of streets){const along=r.axis==='x'?x:z,across=r.axis==='x'?z:x;if(along>=r.start&&along<=r.end)d=Math.min(d,Math.abs(across-r.at));}return d;}
 function roadHeight(x,z){const f=feature(x,z);return Math.max(baseElevation(x,z)+.17,f.distance<11?f.bank+1.2*(1-smooth(Math.max(0,f.distance)/11))+.22:-100);}
 function height(x,z){const f=feature(x,z);let y=baseElevation(x,z);
  if(f.distance<0)return f.bed-.22;
  if(f.distance<.9)y=f.bed-.22+(f.bank-f.bed+.22)*smooth(f.distance/.9);
  else if(f.distance<9)y=f.bank+(y-f.bank)*smooth((f.distance-.9)/8.1);
  const rd=streetDistance(x,z);if(f.distance>1&&rd<6.8){const amount=(1-smooth((rd-4.6)/2.2))*smooth((f.distance-1)/2);y=y+(roadHeight(x,z)-.21-y)*amount;}
  return y;
 }
 const materials=[];function material(color,options={}){const m=new THREE.MeshStandardMaterial({color,roughness:.9,...options});materials.push(m);return m;}
 const terrainMat=material(0xffffff,{vertexColors:true});const terrainGeo=new THREE.PlaneGeometry(330,330,220,220);terrainGeo.rotateX(-Math.PI/2);const positions=terrainGeo.attributes.position,colors=[];const color=new THREE.Color();
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),y=height(x,z);positions.setY(i,y);const f=feature(x,z);const noise=Math.sin(x*1.43+z*2.72)*Math.sin(z*1.12-x*.51);if(f.distance<0)color.setHex(0x6d8772);else if(f.distance<1.5)color.setHex(0xa3a08a);else if(f.distance<4)color.setHex(0x869f75);else color.setHex(0x91ab7c);color.multiplyScalar(1+noise*.024+(y-5)*.003);colors.push(color.r,color.g,color.b);}
 terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();const terrain=new THREE.Mesh(terrainGeo,terrainMat);terrain.receiveShadow=true;root.add(terrain);
 const farGround=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),material(0x91ab7c));farGround.rotation.x=-Math.PI/2;farGround.position.y=-4;farGround.receiveShadow=true;root.add(farGround);
 // Instanced scene objects keep the town usable on laptops and touch devices.
 const cube=new THREE.BoxGeometry(1,1,1),leafGeo=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,7);
 const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([
 -.5,0,-.5,.5,0,-.5,0,1,-.5, -.5,0,.5,0,1,.5,.5,0,.5,
 -.5,0,-.5,0,1,-.5,-.5,0,.5, -.5,0,.5,0,1,-.5,0,1,.5,
 0,1,-.5,.5,0,-.5,.5,0,.5, 0,1,-.5,.5,0,.5,0,1,.5
 ],3));roofGeo.computeVertexNormals();
 const palette={stone:material(0xd1cdbd),curb:material(0xd8d8ca),road:material(0x667175),line:material(0xebe6ce),roof:material(0x99644f),roofDark:material(0x6b8184),white:material(0xe4e4d6),warm:material(0xd9c7aa),gray:material(0xb4c4c3),glass:material(0x456b7c,{roughness:.3,metalness:.28}),wood:material(0x687252),leaf:material(0x4e7952,{flatShading:true}),leafLight:material(0x71945b,{flatShading:true}),car:material(0x3e696f),carLight:material(0xe9dfc8),brick:material(0xb98b6d)};
 const batches=new Map(),dummy=new THREE.Object3D();function instance(key,geo,mat,pos,scale,rotation=0,group=urban){if(!batches.has(key))batches.set(key,{geo,mat,group,data:[]});batches.get(key).data.push({pos,scale,rotation});}
 function roadStrip(r,width,offset,yOffset,mat){const verts=[],indices=[];for(let a=r.start;a<=r.end;a+=2){const x=r.axis==='x'?a:r.at,z=r.axis==='x'?r.at:a,y=roadHeight(x,z)+yOffset;for(const side of [-1,1]){const cross=offset+side*width/2;verts.push(x+(r.axis==='z'?cross:0),y,z+(r.axis==='x'?cross:0));}const k=verts.length/3-2;if(k>0)indices.push(k-2,k,k-1,k-1,k,k+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;mesh.castShadow=false;urban.add(mesh);}
 let bridges=0;
 for(const r of streets){roadStrip(r,9.5,0,-.07,palette.curb);roadStrip(r,6.5,0,0,palette.road);roadStrip(r,.12,-2.9,.015,palette.line);roadStrip(r,.12,2.9,.015,palette.line);let wasBridge=false;
  for(let along=r.start+2;along<r.end-2;along+=3){const x=r.axis==='x'?along:r.at,z=r.axis==='x'?r.at:along,y=roadHeight(x,z);const f=feature(x,z);const crossing=streets.some(s=>s.axis!==r.axis&&Math.abs(along-s.at)<6&&r.at>=s.start&&r.at<=s.end);
   if(!crossing)instance('road-dashes',cube,palette.line,[x,y+.035,z],r.axis==='x'?[1.4,.03,.11]:[.11,.03,1.4]);
   const bridge=f.distance<.2;if(bridge&&!wasBridge)bridges++;wasBridge=bridge;
   if(bridge){instance('bridge-slabs',cube,palette.stone,[x,y-.28,z],r.axis==='x'?[3.1,.48,9.5]:[9.5,.48,3.1]);for(const side of [-1,1]){instance('bridge-rails',cube,palette.roofDark,[x+(r.axis==='z'?side*4.4:0),y+.63,z+(r.axis==='x'?side*4.4:0)],r.axis==='x'?[3,.18,.16]:[.16,.18,3]);instance('bridge-posts',cube,palette.roofDark,[x+(r.axis==='z'?side*4.4:0),y+.35,z+(r.axis==='x'?side*4.4:0)],[.16,.8,.16]);}}
  }
 }
 // Crosswalks belong to street intersections, at their surveyed road elevation.
 for(const a of streets.filter(s=>s.axis==='x'))for(const b of streets.filter(s=>s.axis==='z'))if(a.at>=b.start&&a.at<=b.end){for(const side of [-1,1])for(let i=-2;i<=2;i++){const x=b.at+side*6.1,z=a.at+i*.9;if(feature(x,z).distance>1)instance('crosswalks',cube,palette.line,[x,roadHeight(x,z)+.04,z],[2.2,.025,.42]);}}
 let buildings=0,trees=0;
 const lots=[
 [-67,[-62,-47,-31,-12,29,45,61,91]],[-54,[-62,-45,-27,-10,29,46,61,91]],
 [-24,[-92,-62,-48,28,46,62,92]],[-9,[-92,-61,47,62,92]],
 [10,[-92,-61,60,92]],[27,[-92,-62,63,91]],
 [48,[-92,-65,-13,4,29,46,89]],[63,[-92,-65,-13,1,28,89]],
 [91,[-91,-59,-43,-25,-8,28,44,60,90]]
 ];
 for(const [x,zs] of lots)for(const z of zs){const seed=Math.abs(Math.sin(x*12.3+z*7.8));const w=6.8+(seed*2.8),d=7+(Math.abs(Math.cos(x+z))*3.3);if(streetDistance(x,z)<5.1+Math.max(w,d)/2)continue;
  const points=[[x,z],[x-w/2-1,z-d/2-1],[x+w/2+1,z-d/2-1],[x-w/2-1,z+d/2+1],[x+w/2+1,z+d/2+1]];if(points.some(([px,pz])=>feature(px,pz).distance<2))continue;
  const ys=points.map(([px,pz])=>height(px,pz)),bottom=Math.min(...ys),base=Math.max(...ys)+.12;if(base-bottom>2.3)continue;
  const tall=x>40&&z>-18&&z<50,floors=tall?3+Math.floor(seed*4):1+Math.floor(seed*2.2),h=floors*3.15,bodyMaterial=seed<.33?palette.white:seed<.67?palette.warm:palette.gray;
  instance('foundations',cube,palette.stone,[x,(base+bottom)/2,z],[w+.7,Math.max(.2,base-bottom),d+.7]);instance('body-'+(seed<.33?'white':seed<.67?'warm':'gray'),cube,bodyMaterial,[x,base+h/2,z],[w,h,d]);
  if(!tall){instance('pitched-roofs',roofGeo,palette.roof,[x,base+h,z],[w+.6,1.8,d+.6]);}
  else {instance('flat-roofs',cube,palette.roofDark,[x,base+h+.15,z],[w+.4,.3,d+.4]);instance('roof-service',cube,palette.white,[x+1,base+h+.7,z],[2.3,1.2,2.1]);}
  for(let floor=0;floor<floors;floor++)for(const side of [-1,1]){
   const wy=base+1.7+floor*3.15;for(let c=-1;c<=1;c++){instance('windows',cube,palette.glass,[x+c*w*.25,wy,z+side*(d/2+.025)],[1.25,1.4,.06]);instance('windows',cube,palette.glass,[x+side*(w/2+.025),wy,z+c*d*.25],[.06,1.4,1.3]);}
  }
  instance('doors',cube,palette.wood,[x,base+1.05,z+d/2+.035],[1.25,2.1,.08]);buildings++;
 }
 // A riverside promenade follows the detention lake boundary.
 for(const n of state.nodes.filter(n=>n.type==='pond')){for(const side of [-1,1]){const x=n.x+side*(n.width/2+2.3);for(let z=n.z-n.length/2;z<=n.z+n.length/2;z+=2){if(feature(x,z).distance>1&&streetDistance(x,z)>5.5)instance('promenade',cube,palette.stone,[x,height(x,z)+.07,z],[1.5,.14,2.05]);}}}
 let seed=813;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<390;i++){const x=random()*285-142.5,z=random()*285-142.5,size=1.15+random()*1.1;if(feature(x,z).distance<3||streetDistance(x,z)<6.5)continue;
  if(lots.some(([lx,zs])=>Math.abs(lx-x)<7&&zs.some(lz=>Math.abs(lz-z)<7)))continue;
  if(Math.abs(x)<93&&Math.abs(z)<90&&random()<.56)continue;
  const y=height(x,z),h=3.2+size*1.3;instance('tree-trunks',cylinder,palette.wood,[x,y+h*.3,z],[.38,h*.65,.38],0,nature);instance(i%3?'tree-crowns':'tree-crowns-light',leafGeo,i%3?palette.leaf:palette.leafLight,[x,y+h*.85,z],[size,size*1.45,size],random()*Math.PI,nature);trees++;
 }
 for(const r of streets){for(let along=r.start+14;along<r.end-10;along+=29){const x=r.axis==='x'?along:r.at,z=r.axis==='x'?r.at:along;if(feature(x,z).distance<0)continue;const side=along%2===0?1:-1;const cx=x+(r.axis==='z'?side*1.6:0),cz=z+(r.axis==='x'?side*1.6:0),y=roadHeight(cx,cz);instance('cars-'+side,cube,side===1?palette.car:palette.carLight,[cx,y+.6,cz],r.axis==='x'?[3.8,1.15,1.7]:[1.7,1.15,3.8]);instance('car-windows',cube,palette.glass,[cx,y+1.25,cz],r.axis==='x'?[2,.5,1.45]:[1.45,.5,2]);}}
 // Meter-spaced topographic grid drapes onto the actual terrain, hidden initially.
 const gridPoints=[];for(let line=-100;line<=100;line+=10)for(let a=-100;a<100;a+=2){gridPoints.push(line,height(line,a)+.07,a,line,height(line,a+2)+.07,a+2,a,height(a,line)+.07,line,a+2,height(a+2,line)+.07,line);}
 const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3));const gridMaterial=new THREE.LineBasicMaterial({color:0x486653,transparent:true,opacity:.24});materials.push(gridMaterial);const grid=new THREE.LineSegments(gridGeometry,gridMaterial);grid.visible=false;root.add(grid);
 for(const {geo,mat,group,data} of batches.values()){const mesh=new THREE.InstancedMesh(geo,mat,data.length);data.forEach((o,i)=>{dummy.position.fromArray(o.pos);dummy.scale.fromArray(o.scale);dummy.rotation.set(0,o.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 return {root,urban,nature,terrain,grid,height,feature,roadHeight,stats:{buildings,trees,bridges},dispose(){const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
