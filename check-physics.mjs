import assert from 'node:assert/strict';
import {example,step,total,head,area,balance} from './dist/sim.js';
const node=(id,x,bed,depth,width=10,length=10)=>({id,x,z:0,bed,width,length,bank:100,volume:depth*width*length,spill:0});
const make=(nodes,edges)=>{const s={nodes,edges,time:0,inputRate:0,outputRate:0,inflow:0,outflow:0,overflow:0};s.initial=total(s);return s;};
const edge=(a,b,more={})=>({id:a+b,a,b,type:'channel',width:5,gate:false,opening:2,flow:0,...more});
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
let s=make([node('a',0,0,5),node('b',40,0,1,20)],[edge('a','b')]);const target=total(s)/(area(s.nodes[0])+area(s.nodes[1]));
for(let i=0;i<20000;i++)step(s,.05);close(head(s.nodes[0]),target,1e-5);close(head(s.nodes[1]),target,1e-5);close(balance(s),0);console.log('PASS unequal-area equilibrium and mass');
s=make([node('a',0,0,4),node('b',40,0,1)],[edge('a','b',{gate:true,opening:0})]);const before=total(s);for(let i=0;i<200;i++)step(s,.05);close(s.edges[0].flow,0);close(s.nodes[0].volume,400);close(total(s),before);s.edges[0].opening=1;step(s,.05);assert.ok(s.edges[0].flow>0);s.nodes[0].volume=10;s.nodes[1].volume=300;step(s,.05);assert.ok(s.edges[0].flow<0);console.log('PASS gate closure, opening and reverse flow');
s=make([node('a',0,0,.0001),...Array.from({length:12},(_,i)=>node('b'+i,20+i,0,0))],Array.from({length:12},(_,i)=>edge('a','b'+i,{width:15})));for(let i=0;i<2000;i++){step(s,.1);assert.ok(s.nodes.every(n=>n.volume>=0));}close(balance(s),0);console.log('PASS dry branching donor nonnegativity');
s=example();s.inputRate=30;s.outputRate=20;for(let i=0;i<20000;i++)step(s,.05);assert.ok(s.nodes.every(n=>n.volume>=0&&n.volume<=area(n)*n.bank+1e-9));close(balance(s),0,1e-6);console.log('PASS source/sink/spill ledger with example network');
s=make([node('a',0,0,0),node('b',20,0,0)],[]);s.nodes[0].bank=.1;s.nodes[0].source=true;s.nodes[1].sink=true;s.inputRate=100;s.outputRate=50;for(let i=0;i<100;i++)step(s,.1);close(s.nodes[0].volume,10);close(s.nodes[1].volume,0);close(s.overflow,990);close(s.outflow,0);close(balance(s),0);console.log('PASS overflowing source and dry sink accounting');
// Regression: a fully open gate cannot increase an otherwise identical channel's capacity.
const ungated=make([node('a',0,0,.1),node('b',50,0,0)],[edge('a','b')]);const gated=structuredClone(ungated);gated.edges[0].gate=true;gated.edges[0].opening=4;step(ungated,.05);step(gated,.05);assert.ok(gated.edges[0].flow<=ungated.edges[0].flow+1e-10);
// A nearly dry pipe must use a nearly dry cross-section.
s=make([node('a',0,0,.001),node('b',40,0,0)],[edge('a','b',{type:'pipe',width:1})]);step(s,.05);assert.ok(s.edges[0].flow<.001);
// Closed branches must not change active-flow relaxation.
const solo=make([node('a',0,0,4,3,6),node('b',20,0,1,3,6)],[edge('a','b',{width:15})]);const branch=structuredClone(solo);branch.nodes.push(node('c',30,0,0));branch.edges.push(edge('a','c',{gate:true,opening:0}));branch.initial=total(branch);step(solo,.25);step(branch,.25);close(solo.edges[0].flow,branch.edges[0].flow);console.log('PASS gate resistance, shallow pipe and closed-branch independence');
