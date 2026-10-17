'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const grain=document.createElement('canvas'),gc=grain.getContext('2d');
const trace=document.createElement('canvas'),tc=trace.getContext('2d');
const C={paper:'#eee7d8',ink:'#524b43',teal:'#258b83',blue:'#537ca5',rose:'#b34f74',rust:'#bf6742',gold:'#be9539',plum:'#8a65a0'};
let W=1200,H=800,U=1,dpr=1,seed=7793,t=0,last=0,frame=0,paused=false,pattern;
let forms=[],links=[],births=[],ripples=[],gate=[true,true,true],stored=0,birthCount=0,flash=0,excitement=0,recordings=[],spores=[],bwo=0,returns=0;
let pointer={x:-9999,y:-9999,down:false,held:null,sx:0,sy:0,moved:0},selection=-1;

const motionButton=document.getElementById('motion');
const helpDialog=document.getElementById('help');
function setPaused(value){paused=value;motionButton.textContent=paused?'resume movement':'pause movement';motionButton.setAttribute('aria-pressed',String(paused))}
motionButton.addEventListener('click',()=>setPaused(!paused));
document.getElementById('restart').addEventListener('click',()=>{setup();topology();links.forEach(e=>e.life=1)});
document.getElementById('show-help').addEventListener('click',()=>helpDialog.showModal());
document.getElementById('close-help').addEventListener('click',()=>helpDialog.close());

const tau=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,k)=>a+(b-a)*k;
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function noise(a,b=0){return Math.sin(a*12.9898+b*78.233)*Math.cos(a*4.137+b*17.39)}
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`}
function size(){const ow=W,oh=H;dpr=Math.min(devicePixelRatio||1,2);U=Math.min(innerWidth/1100,innerHeight/850);W=innerWidth/U;H=innerHeight/U;canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(U*dpr,0,0,U*dpr,0,0);trace.width=Math.ceil(W);trace.height=Math.ceil(H);grain.width=256;grain.height=256;const im=gc.createImageData(256,256);for(let i=0;i<im.data.length;i+=4){im.data[i]=85;im.data[i+1]=66;im.data[i+2]=34;im.data[i+3]=rnd()>.96?rnd()*16:rnd()*4}gc.putImageData(im,0,0);pattern=ctx.createPattern(grain,'repeat');for(const f of forms){f.x=f.x/ow*W;f.y=f.y/oh*H;f.hx=f.hx/ow*W;f.hy=f.hy/oh*H}for(const b of births){b.x=b.x/ow*W;b.y=b.y/oh*H}}
function setup(){forms=[];excitement=0;links=[];births=[];recordings=[],spores=[],bwo=0,returns=0;ripples=[];gate=[true,true,true];stored=0;birthCount=0;flash=0;tc.clearRect(0,0,W,H);const positions=[
 ['source',.49,.43,100,C.rose],['link',.19,.30,35,C.teal],['link',.32,.18,28,C.gold],['link',.27,.48,38,C.blue],['link',.16,.65,28,C.rose],['junction',.69,.39,22,C.gold],['gate',.82,.20,38,C.teal],['gate',.87,.43,32,C.plum],['gate',.80,.67,36,C.rust],['celibate',.49,.75,64,C.plum]];
 positions.forEach(([role,x,y,r,color],id)=>forms.push({id,role,x:x*W,y:y*H,hx:x*W,hy:y*H,r,color,phase:rnd()*tau,angle:rnd()*tau,heat:.2,imprint:0,vx:0,vy:0}));selection=-1;returns=0;spores=[];for(let i=0;i<200;i++){const a=rnd()*tau,r=.24+rnd()*.74;spores.push({a,r,phase:rnd()*tau,hue:[C.teal,C.gold,C.plum,C.rose,C.blue][i%5],points:[]})}}
function stroke(pts,color=C.ink,a=.5,width=.8,target=ctx){target.beginPath();pts.forEach((p,i)=>i?target.lineTo(p.x??p[0],p.y??p[1]):target.moveTo(p.x??p[0],p.y??p[1]));target.lineCap='round';target.lineJoin='round';target.strokeStyle=rgba(color,Math.min(1,a*1.3));target.lineWidth=width*1.25;target.stroke()}
function ring(x,y,rx,ry,color,a=.4,rotation=0,phase=0,rough=1){const pts=[];for(let i=0;i<=100;i++){const v=i/100*tau,k=1+Math.sin(v*3+phase)*.03*rough+Math.cos(v*5-phase)*.014*rough;pts.push([x+(Math.cos(v)*rx*Math.cos(rotation)-Math.sin(v)*ry*Math.sin(rotation))*k,y+(Math.cos(v)*rx*Math.sin(rotation)+Math.sin(v)*ry*Math.cos(rotation))*k])}stroke(pts,color,a,.8);return pts}
function wash(x,y,r,color,a=.13){a*=1.65;const g=ctx.createRadialGradient(x,y,r*.08,x,y,r);g.addColorStop(0,rgba(color,a));g.addColorStop(.6,rgba(color,a*.48));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function blob(x,y,r,color,phase,a=.1,stretch=1){a*=1.6;ctx.beginPath();for(let i=0;i<=80;i++){const v=i/80*tau,k=1+Math.sin(v*3+phase)*.10+Math.cos(v*5-phase*.7)*.055,px=x+Math.cos(v)*r*k,py=y+Math.sin(v)*r*k*stretch;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fillStyle=rgba(color,a);ctx.fill();ctx.strokeStyle=rgba(color,a*2.6);ctx.lineWidth=.55;ctx.stroke()}
function point(e,z){const a=e.a,b=e.b,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
 const memory=((e.rx-(a.x+b.x)/2)*nx+(e.ry-(a.y+b.y)/2)*ny)*.65;
 const bend=e.bend+Math.sin(t*.55+e.id)*28+memory+bwo*Math.sin(e.id)*18+(e.visits||0)*Math.sin(e.id)*4,p1={x:a.x+dx*.32+nx*bend,y:a.y+dy*.32+ny*bend},p2={x:a.x+dx*.7+nx*bend,y:a.y+dy*.7+ny*bend},s=1-z;
 return{x:s*s*s*a.x+3*s*s*z*p1.x+3*s*z*z*p2.x+z*z*z*b.x,y:s*s*s*a.y+3*s*s*z*p1.y+3*s*z*z*p2.y+z*z*z*b.y}}
function wire(id,a,b,color,bend=0,rate=1,kind='connect'){let e=links.find(e=>e.id===id);if(!e){e={id,a:forms[a],b:forms[b],color,bend,rate,kind,life:0,phase:rnd(),visits:0,cut:0,breakAt:.5,rx:(forms[a].x+forms[b].x)/2,ry:(forms[a].y+forms[b].y)/2};links.push(e)}e.wanted=true;e.rate=rate;return e}
function topology(){links.forEach(e=>e.wanted=false);const pairs=[[1,2],[2,3],[3,4],[4,1],[1,3]];for(let i=0;i<pairs.length;i++){const[a,b]=pairs[i],d=Math.hypot(forms[a].x-forms[b].x,forms[a].y-forms[b].y);if(d<W*.34)wire(10+i,a,b,i%2?C.blue:C.teal,(i%2?1:-1)*28,1)}
 for(const id of [1,3])if(Math.hypot(forms[id].x-forms[0].x,forms[id].y-forms[0].y)<W*.56)wire(30+id,id,0,forms[id].color,id===1?-25:20,1.1);
 wire(40,0,5,C.gold,-8,1.1,'stem');for(let i=0;i<3;i++)wire(50+i,5,6+i,[C.teal,C.plum,C.rust][i],(i-1)*24,gate[i]?1:0,'branch');
 wire(60,0,9,C.rose,30,.8,'gather');wire(61,3,9,C.blue,-30,.85,'gather');for(let i=0;i<3;i++)wire(62+i,6+i,9,[C.teal,C.plum,C.rust][i],35+i*12,gate[i]?.65:0,'gather');wire(70,9,0,C.plum,-80,.32,'return');}
function tick(dt){t+=dt;bwo=Math.sin(t*.30)*(.6+excitement*.2);excitement*=Math.exp(-dt*.6);flash*=Math.exp(-dt*1.7);for(const f of forms){if(pointer.held===f)continue;const large=f.role==='source'||f.role==='celibate',amp=large?18:42;const dx=f.x-forms[0].x,dy=f.y-forms[0].y,d=Math.hypot(dx,dy)||1,force=large?0:bwo*24*Math.exp(-d*d/350000);const ax=f.hx+Math.sin(t*.32+f.phase)*amp+dx/d*force,ay=f.hy+Math.cos(t*.39+f.phase)*amp*.75+dy/d*force;f.x=clamp(f.x+(ax-f.x)*Math.min(1,dt*1.9),f.r+12,W-f.r-12);f.y=clamp(f.y+(ay-f.y)*Math.min(1,dt*1.9),f.r+12,H-f.r-12);f.angle+=dt*(large?.07:.14);f.heat*=Math.exp(-dt*.5);f.imprint*=Math.exp(-dt*.01)}
 topology();for(const e of links){e.cut=Math.max(0,(e.cut||0)-dt*.15);e.rate*=1-e.cut;e.life=clamp(e.life+dt*(e.wanted?.9:-.6),0,1);e.rx=mix(e.rx,(e.a.x+e.b.x)/2,dt*.02);e.ry=mix(e.ry,(e.a.y+e.b.y)/2,dt*.02);e.phase=(e.phase+dt*(.09+excitement*.06+(e.visits||0)*.002)*e.rate)%1;if(e.phase<dt*.15&&e.rate>0)e.b.heat=Math.min(1,e.b.heat+.15)}links=links.filter(e=>e.wanted||e.life>.001);
 const active=links.filter(e=>e.kind==='connect'&&e.wanted).reduce((n,e)=>n+Math.min(1,e.rate),0),branches=gate.filter(Boolean).length;const rate=(active/7)*(branches/3);stored+=dt*.23*rate*(1+excitement*.3+forms[9].imprint*.15);if(stored>=1){stored-=1;conjoin();}
 for(const b of births){
 b.age+=dt;b.life=Math.min(1,b.age/1.2)*Math.min(1,(52-b.age)/8);
 if(!b.route){b.route=links.find(e=>e.id===70);b.pos=0;b.reverse=false;}
 if(b.route){b.pos+=dt*(.09+excitement*.025)*(1-(b.route.cut||0));if(b.pos>=1){b.pos=0;const arrived=b.reverse?b.route.a:b.route.b;arrived.imprint=clamp(arrived.imprint+.25,0,2);arrived.heat=1;b.route.visits=clamp((b.route.visits||0)+1,0,12);returns++;if(!b.hues.includes(arrived.color)){b.hues.push(arrived.color);if(b.hues.length>5)b.hues.shift()}
 const candidates=links.filter(e=>e!==b.route&&e.rate>0&&e.wanted&&(e.a===arrived||e.b===arrived));if(candidates.length){b.route=candidates[(b.id+Math.floor(b.age))%candidates.length];b.reverse=b.route.b===arrived}else{b.reverse=!b.reverse;}}
 const q=point(b.route,b.reverse?1-b.pos:b.pos);b.x=q.x;b.y=q.y;}
 }births=births.filter(b=>b.age<52);
 for(const sp of spores){sp.a+=dt*(.10+.10*(1-sp.r))*(sp.r>.6?1:-1);const source=forms[0];let x=source.x+Math.cos(sp.a)*W*.40*sp.r,y=H*.47+Math.sin(sp.a)*H*.39*sp.r;const swirl=Math.sin(t*.65+sp.phase)*14+bwo*12;x+=Math.sin(sp.a*3+t*.17)*swirl;y+=Math.cos(sp.a*2-t*.24)*swirl;if(pointer.down){const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy)||1,k=Math.exp(-d*d/24000)*35;x+=-dy/d*k;y+=dx/d*k}sp.points.push({x,y});if(sp.points.length>14)sp.points.shift();}

 for(const r of ripples){r.r+=dt*40;r.life-=dt*.5}ripples=ripples.filter(r=>r.life>0);if(frame%3===0){tc.globalCompositeOperation='destination-out';tc.fillStyle='rgba(0,0,0,.006)';tc.fillRect(0,0,W,H);tc.globalCompositeOperation='source-over';for(const e of links){if(e.life<.3||!e.rate)continue;const q=point(e,e.phase);tc.fillStyle=rgba(e.color,.05);tc.beginPath();tc.arc(q.x,q.y,1.4,0,tau);tc.fill()}}}
function conjoin(){birthCount++;const hues=gate.map((v,i)=>v?[C.teal,C.plum,C.rust][i]:null).filter(Boolean);births.push({id:birthCount,x:forms[9].x,y:forms[9].y,age:0,life:0,angle:Math.PI*.20+(birthCount%5)*Math.PI*.15,hues:[C.rose,C.blue,...hues],phase:rnd()*tau,route:null,pos:0,reverse:false});flash=1;forms[9].heat=1;excitement=Math.min(2,excitement+.15);ripples.push({x:forms[9].x,y:forms[9].y,r:35,life:.7,color:C.plum});}
function membrane(){
 const center=forms[0],cx=W*.49+(center.x-W*.49)*.18,cy=H*.47,rx=W*.39,ry=H*.38;
 wash(cx-rx*.35,cy-ry*.1,ry*.8,C.teal,.045);wash(cx+rx*.4,cy+ry*.1,ry*.85,C.gold,.05);wash(cx,cy+ry*.55,ry*.65,C.plum,.035);
 const base=[];for(let j=0;j<=140;j++){const a=j/140*tau;let bend=Math.sin(a*3+t*.23)*18+Math.sin(a*5-t*.17)*8+bwo*10;for(const f of forms){const d=Math.hypot(cx+Math.cos(a)*rx-f.x,cy+Math.sin(a)*ry-f.y);bend+=(12+f.heat*25+f.imprint*8)*Math.exp(-d*d/23000)*Math.sin(t*.5+f.phase)}if(pointer.down){const d=Math.hypot(cx+Math.cos(a)*rx-pointer.x,cy+Math.sin(a)*ry-pointer.y);bend+=65*Math.exp(-d*d/28000)}base.push({a,bend});}
 for(let k=0;k<19;k++){const scale=.68+k*.017,pts=base.map(({a,bend})=>[cx+Math.cos(a)*(rx*scale+bend)+Math.sin(a*2+t*.12)*12,cy+Math.sin(a)*(ry*scale+bend*.7)]);stroke(pts,k%4===0?C.teal:k%4===1?C.gold:C.plum,k%5===0?.10:.035,k%5===0?.7:.5);}
 for(let i=0;i<7;i++){const pts=[];for(let j=0;j<90;j++){const a=j/89*tau*1.18,r=30+j*2.5;pts.push([cx+Math.cos(a+t*.12+i*.04)*r,cy+Math.sin(a+t*.12+i*.04)*r*.65]);}stroke(pts,C.rose,.025,.6);}
}
function drawSpores(){for(const sp of spores){if(sp.points.length<2)continue;stroke(sp.points,sp.hue,.11+(1-sp.r)*.10,.45+(1-sp.r)*.5);if(Math.sin(sp.phase)>0){const q=sp.points.at(-1);ctx.fillStyle=rgba(sp.hue,.28);ctx.beginPath();ctx.arc(q.x,q.y,.8,0,tau);ctx.fill()}}}
function drawWire(e){
 const closed=e.rate<.01,pts=[];for(let i=0;i<=60;i++)pts.push(point(e,i/60));
 const paint=(pp,a,w)=>{if(e.cut>.08){const half=.085*e.cut,lo=Math.floor((e.breakAt-half)*60),hi=Math.ceil((e.breakAt+half)*60);stroke(pp.slice(0,Math.max(0,lo)),e.color,a,w);stroke(pp.slice(Math.min(60,hi)),e.color,a,w)}else stroke(pp,e.color,a,w)};paint(pts,e.life*(closed?.08:.12),e.kind==='stem'?12:7);
 const strands=e.kind==='stem'?9:e.kind==='return'?6:5;
 for(let k=0;k<strands;k++){const offset=(k-(strands-1)/2)*2.2,pp=pts.map((q,i)=>{const next=pts[Math.min(i+1,60)],dx=next.x-q.x,dy=next.y-q.y,d=Math.hypot(dx,dy)||1,envelope=Math.sin(i/60*Math.PI),wave=Math.sin(i*.20+t*.8+k*.3)*2*envelope;return[q.x-dy/d*(offset*envelope+wave),q.y+dx/d*(offset*envelope+wave)]});paint(pp,e.life*(closed?.07:k%2?.22:.38),.55);}
 if(closed)return;const count=e.kind==='stem'?12:e.kind==='return'?7:8;
 for(let k=0;k<count;k++){const z=(e.phase+k/count)%1,tail=[];if(e.cut>.08&&Math.abs(z-e.breakAt)<.085*e.cut)continue;for(let j=0;j<6;j++)tail.push(point(e,Math.max(0,z-j*.005)));stroke(tail,e.color,e.life*.6,1.15);const q=point(e,z);ctx.fillStyle=rgba(e.color,e.life*.72);ctx.beginPath();ctx.arc(q.x,q.y,e.kind==='branch'?2.4:1.8,0,tau);ctx.fill();}
}
function source(f){
 ctx.save();ctx.translate(f.x,f.y);const expansion=1+Math.sin(t*.8)*.09+f.heat*.06;ctx.scale(expansion,expansion);
 wash(-13,-9,155,C.rose,.12);wash(25,12,125,C.gold,.11);wash(-43,21,95,C.teal,.045);
 for(let k=0;k<8;k++){const a=t*.16+k*tau/8;blob(Math.cos(a)*27,Math.sin(a)*22,55+(k%3)*9,[C.rose,C.rust,C.gold,C.plum][k%4],t*.24+k,.035,.80);}
 for(let k=0;k<32;k++){
 const pts=[],phase=k/32*tau,turn=t*.17+phase;for(let j=0;j<=95;j++){const a=j/95*tau*1.5+turn,r=10+j*.98+Math.sin(a*3+t*.45)*4;pts.push([Math.cos(a)*r,Math.sin(a)*r*.74]);}
 stroke(pts,[C.rose,C.rust,C.gold,C.plum][k%4],k%4===0?.25:.085,k%4===0?.7:.45);
 const z=(t*.13+k*.077)%1,a=z*tau*1.5+turn,r=10+z*95;ctx.fillStyle=rgba(k%2?C.rose:C.gold,.6);ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r*.74,1.15,0,tau);ctx.fill();
 }
 for(let k=0;k<180;k++){const a=k*2.399+t*.12,r=Math.sqrt(k/180)*95;const x=Math.cos(a)*r,y=Math.sin(a)*r*.78;ctx.fillStyle=rgba(k%3===0?C.gold:C.rose,.08+(k%7)*.013);ctx.fillRect(x,y,.6+(k%3)*.35,.6);}
 ctx.restore();
}
function abstract(f){const near=Math.hypot(pointer.x-f.x,pointer.y-f.y)<f.r+18||selection===f.id;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);const breath=1+Math.sin(t*.9+f.phase)*.10+f.heat*.12+f.imprint*.08;ctx.scale(breath,breath);wash(0,0,f.r*2.2,f.color,near?.24:.12);blob(0,0,f.r,f.color,f.phase+t*.3,.09,.85);for(let i=0;i<4;i++)ring(Math.sin(i*2)*3,Math.cos(i)*2,f.r*(.7+i*.1),f.r*(.5+i*.12),f.color,i===1?.65:.24,i*.25,t*.4+f.phase);stroke([[-f.r*.65,0],[0,Math.sin(t*.7+f.phase)*5],[f.r*.65,0]],f.color,.35,.8);if(near)ring(0,0,f.r+9,f.r+9,f.color,.25,0,t*.4);ctx.restore()}
function junction(f){wash(f.x,f.y,45,C.gold,.16);blob(f.x,f.y,11+Math.sin(t)*2,C.gold,t*.3,.20);for(let i=0;i<3;i++){const a=(i-1)*.65,q=forms[6+i];stroke([[f.x-12,f.y],[f.x,f.y],[f.x+Math.cos(a)*20,f.y+Math.sin(a)*20]],[C.teal,C.plum,C.rust][i],gate[i]?.6:.15,1.25)}}
function endpoint(f,i){const live=gate[i];ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle*.45);wash(0,0,f.r*2,f.color,live?.12:.025);if(live){blob(0,0,f.r,f.color,t*.3+f.phase,.085,.75);for(let k=0;k<3;k++)ring(0,0,f.r+k*3,f.r*.7+k*3,f.color,k===1?.6:.18,k*.2,t*.4+f.phase);ring(0,0,5+Math.sin(t)*1.5,5,f.color,.55)}else{blob(0,0,f.r*.66,f.color,f.phase,.23,.9);ring(0,0,f.r,f.r*.75,f.color,.25,0,f.phase)}ctx.restore()}
function celibate(f){ctx.save();ctx.translate(f.x,f.y);const swell=1+stored*.2+flash*.18;ctx.scale(swell*1.3,swell*1.3);wash(0,0,100,C.plum,.16+flash*.1);const distance=20*(1-stored*.65),rot=Math.sin(t*.5)*.25;
 for(let side=-1;side<=1;side+=2){const color=side<0?C.blue:C.rose;blob(side*distance,0,29,color,t*.32+side,.09,.88);for(let k=0;k<5;k++)ring(side*distance,0,27+k*2,20+k*2,color,k===2?.52:.14,rot*side,side+t*.3)}
 for(let k=0;k<3;k++){const col=[C.teal,C.gold,C.rust][k];ring(0,0,43+k*4,30+k*3,col,.25,k*.19+t*.06,t*.35+k)}if(flash>.05)ring(0,0,50+(1-flash)*32,40+(1-flash)*22,C.rose,flash*.6,0,t);ctx.restore()}
function conjunction(b){const r=(12+Math.min(1,b.age/3)*10)*(1+Math.sin(t*.6+b.phase)*.08);ctx.save();ctx.globalAlpha=Math.max(0,b.life);wash(b.x,b.y,r*2.5,C.rose,.11);for(let k=0;k<b.hues.length;k++){const a=k/b.hues.length*tau+t*.22,d=r*.35;blob(b.x+Math.cos(a)*d,b.y+Math.sin(a)*d,r*.68,b.hues[k],b.phase+k,.075,.9);ring(b.x+Math.cos(a)*d,b.y+Math.sin(a)*d,r*.7,r*.6,b.hues[k],.42,a,b.phase+t*.2)}ring(b.x,b.y,r*1.15,r*.9,C.plum,.3,.1,t*.2);ctx.globalAlpha=1;ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle=C.paper;ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.5,Math.max(W,H)*.75);g.addColorStop(0,'rgba(255,252,237,.48)');g.addColorStop(1,'rgba(155,127,74,.045)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle=pattern;ctx.fillRect(0,0,W,H);membrane();drawSpores();ctx.drawImage(trace,0,0);for(const e of links)drawWire(e);for(const b of births)conjunction(b);for(const f of forms){if(f.role==='source')source(f);else if(f.role==='junction')junction(f);else if(f.role==='gate')endpoint(f,f.id-6);else if(f.role==='celibate')celibate(f);else abstract(f)}for(const r of ripples)ring(r.x,r.y,r.r,r.r*.72,r.color,r.life*.25,0,t*.15);if(pointer.down&&!pointer.held){wash(pointer.x,pointer.y,60,C.teal,.08);ring(pointer.x,pointer.y,15,12,C.teal,.3,0,t)}frame++}
function loop(now){const dt=Math.min(.04,(now-last)/1000||.016);last=now;if(!paused&&!helpDialog.open&&!document.hidden)tick(dt);draw();requestAnimationFrame(loop)}
function coords(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)/U,y:(e.clientY-b.top)/U}}
canvas.addEventListener('pointerdown',e=>{const q=coords(e);canvas.focus({preventScroll:true});Object.assign(pointer,q,{down:true,sx:q.x,sy:q.y,moved:0});pointer.held=forms.slice().sort((a,b)=>Math.hypot(q.x-a.x,q.y-a.y)-a.r-(Math.hypot(q.x-b.x,q.y-b.y)-b.r)).find(f=>Math.hypot(q.x-f.x,q.y-f.y)<f.r+20)||null;canvas.setPointerCapture(e.pointerId);excitement=1.4;if(pointer.held)pointer.held.heat=1;selection=-1;ripples.push({...q,r:4,life:1,color:pointer.held?.color||C.teal})});
canvas.addEventListener('pointermove',e=>{const q=coords(e),dx=q.x-pointer.x,dy=q.y-pointer.y;Object.assign(pointer,q);if(!pointer.down)return;pointer.moved=Math.max(pointer.moved,Math.hypot(q.x-pointer.sx,q.y-pointer.sy));excitement=1.4;if(pointer.held){const f=pointer.held;f.x=clamp(q.x,45,W-45);f.y=clamp(q.y,45,H-45);f.hx=f.x;f.hy=f.y;f.heat=1}else{if(Math.hypot(dx,dy)>4)cutAcross(q.x-dx,q.y-dy,q.x,q.y);for(const f of forms){const d=Math.hypot(q.x-f.x,q.y-f.y),pull=Math.exp(-d*d/40000)*.10;f.hx=clamp(f.hx+dx*pull,45,W-45);f.hy=clamp(f.hy+dy*pull,45,H-45)}stroke([[q.x-dx,q.y-dy],[q.x,q.y]],C.teal,.08,2,tc)}});
function cutAcross(ax,ay,bx,by){
 const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy||1;
 for(const e of links){if(e.cut>.5||!e.wanted)continue;for(let i=5;i<36;i++){const z=i/40,q=point(e,z),u=clamp(((q.x-ax)*dx+(q.y-ay)*dy)/len,0,1);if(Math.hypot(q.x-ax-u*dx,q.y-ay-u*dy)<9){e.cut=1;e.breakAt=z;excitement=2;ripples.push({x:q.x,y:q.y,r:3,life:1,color:e.color});break;}}}
}
function release(toggle=true){if(toggle&&pointer.held?.role==='source'&&pointer.moved<10){excitement=3;flash=.5;for(const f of forms)f.heat=1;}if(toggle&&pointer.held?.role==='gate'&&pointer.moved<10){const i=pointer.held.id-6;gate[i]=!gate[i]}pointer.down=false;pointer.held=null}
canvas.addEventListener('pointerup',()=>release());canvas.addEventListener('pointercancel',()=>release(false));canvas.addEventListener('lostpointercapture',()=>release(false));canvas.addEventListener('pointerleave',()=>{if(!pointer.down){pointer.x=-9999;pointer.y=-9999}});
canvas.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','w','a','s','d','r',' ','enter'].includes(k))e.preventDefault();if(k===' ')setPaused(!paused);if(k==='r')setup();if(k==='arrowright')selection=(selection+1)%forms.length;if(k==='arrowleft')selection=(selection-1+forms.length)%forms.length;if(k==='enter'&&forms[selection]?.role==='gate')gate[selection-6]=!gate[selection-6];if(['w','a','s','d'].includes(k)){if(selection<0)selection=0;const f=forms[selection];f.hx=clamp(f.hx+(k==='d'?15:k==='a'?-15:0),45,W-45);f.hy=clamp(f.hy+(k==='s'?15:k==='w'?-15:0),45,H-45);f.x=f.hx;f.y=f.hy;f.heat=1;excitement=1}});
window.addEventListener('resize',size);document.addEventListener('visibilitychange',()=>last=performance.now());size();setup();topology();links.forEach(e=>e.life=1);setPaused(matchMedia('(prefers-reduced-motion: reduce)').matches);requestAnimationFrame(loop);
