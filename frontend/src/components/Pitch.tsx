import {useEffect,useMemo,useRef} from 'react';
import {useI18n} from '@/i18n';
import {select} from 'd3-selection';
import {zoom,zoomIdentity,type ZoomBehavior,type ZoomTransform} from 'd3-zoom';
import type {Scene,Layer,TacticalInsight} from '@/lib/types';
import type {Playback} from '@/lib/playback';
export interface PitchApi{zoomIn:()=>void;zoomOut:()=>void;reset:()=>void}
interface Props{scene:Scene;clock:Playback;selected:number;insight:TacticalInsight|null;layer:Layer;follow:boolean;onSelect:(id:number)=>void;onManual:()=>void;api:React.RefObject<PitchApi|null>}
export default function Pitch({scene,clock,selected,insight,layer,follow,onSelect,onManual,api}:Props){
 const {t,language,number}=useI18n();
 const gainLabel=useMemo(()=>insight?number(insight.evidence.gain_m):'',[insight?.evidence.gain_m,number]);
 const canvasRef=useRef<HTMLCanvasElement>(null);const latest=useRef({selected,insight,layer,follow,onSelect,onManual,language,gainLabel});latest.current={selected,insight,layer,follow,onSelect,onManual,language,gainLabel};
 useEffect(()=>{const canvas=canvasRef.current!;const ctx=canvas.getContext('2d',{alpha:false})!;let width=0,height=0,dpr=1,frame=0,dirty=true,lastTime=-1,lastSettings='';let camera:ZoomTransform=zoomIdentity;const count=scene.match.players.length;const xy=new Float32Array(count*2);const ball=new Float32Array(2);const selection=select(canvas);
 function transform(){const scale=Math.min((width-48)/105,(height-40)/68);const o=latest.current;if(o.follow){return{s:scale*2.2,x:width/2-xy[o.selected*2]*scale*2.2,y:height/2-xy[o.selected*2+1]*scale*2.2}}return{s:scale*camera.k,x:camera.x+(width/2-52.5*scale)*camera.k,y:camera.y+(height/2-34*scale)*camera.k}}
 const behavior:ZoomBehavior<HTMLCanvasElement,unknown>=zoom<HTMLCanvasElement,unknown>().scaleExtent([1,3.5]).extent(()=>[[0,0],[width,height]]).on('zoom',event=>{camera=event.transform;if(event.sourceEvent)latest.current.onManual();dirty=true});
 selection.call(behavior).on('dblclick.zoom',null);
 api.current={zoomIn:()=>{latest.current.onManual();selection.call(behavior.scaleBy,1.25)},zoomOut:()=>{latest.current.onManual();selection.call(behavior.scaleBy,.8)},reset:()=>{latest.current.onManual();selection.call(behavior.transform,zoomIdentity)}};
 const resize=()=>{const oldScale=Math.min((width-48)/105,(height-40)/68);
 const centerX=oldScale>0?((width/2-camera.x)/camera.k-(width/2-52.5*oldScale))/oldScale:52.5;
 const centerY=oldScale>0?((height/2-camera.y)/camera.k-(height/2-34*oldScale))/oldScale:34;
 const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const newScale=Math.min((width-48)/105,(height-40)/68);
 selection.call(behavior.transform,zoomIdentity.translate(width/2-(width/2+(centerX-52.5)*newScale)*camera.k,height/2-(height/2+(centerY-34)*newScale)*camera.k).scale(camera.k));dirty=true};const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 const click=(event:MouseEvent)=>{if(event.defaultPrevented)return;const rect=canvas.getBoundingClientRect(),tr=transform();let found=-1,near=18;for(let i=0;i<count;i++){const d=Math.hypot(event.clientX-rect.left-(xy[i*2]*tr.s+tr.x),event.clientY-rect.top-(xy[i*2+1]*tr.s+tr.y));if(d<near){near=d;found=i}}if(found>=0)latest.current.onSelect(found)};canvas.addEventListener('click',click);
 function interpolate(time:number){const last=scene.match.times.length-1;const index=Math.max(0,Math.min(Math.floor(time*scene.match.sample_hz),last));const next=Math.min(index+1,last);const f=Math.max(0,Math.min(1,time*scene.match.sample_hz-index));for(let i=0;i<count*2;i++){const a=scene.positions[index*count*2+i];xy[i]=a+(scene.positions[next*count*2+i]-a)*f}for(let i=0;i<2;i++){const a=scene.ball[index*2+i];ball[i]=a+(scene.ball[next*2+i]-a)*f}}
 function line(a:number,b:number,c:number,d:number){ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()}
 function draw(time:number){interpolate(time);const tr=transform(),o=latest.current;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#103528';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(tr.x,tr.y);ctx.scale(tr.s,tr.s);
 for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#194b35':'#1b4e38';ctx.fillRect(i*10.5,0,10.5,68)}ctx.lineWidth=.23;ctx.strokeStyle='#ffffff50';ctx.strokeRect(0,0,105,68);line(52.5,0,52.5,68);ctx.beginPath();ctx.arc(52.5,34,9.15,0,Math.PI*2);ctx.stroke();ctx.strokeRect(0,13.84,16.5,40.32);ctx.strokeRect(88.5,13.84,16.5,40.32);ctx.strokeRect(0,24.84,5.5,18.32);ctx.strokeRect(99.5,24.84,5.5,18.32);ctx.strokeRect(-2,30.34,2,7.32);ctx.strokeRect(105,30.34,2,7.32);ctx.beginPath();ctx.arc(11,34,9.15,-.925,.925);ctx.stroke();ctx.beginPath();ctx.arc(94,34,9.15,Math.PI-.925,Math.PI+.925);ctx.stroke();for(const x of [11,52.5,94]){ctx.fillStyle='#ffffff90';ctx.beginPath();ctx.arc(x,34,.35,0,Math.PI*2);ctx.fill()}
 if(o.layer==='pressure'){for(let i=11;i<count;i++){ctx.fillStyle='#2873ff20';ctx.strokeStyle='#75a5ff80';ctx.lineWidth=.2;ctx.beginPath();ctx.arc(xy[i*2],xy[i*2+1],12,0,Math.PI*2);ctx.fill();ctx.stroke()}}
 if(o.layer==='passes'){const recent=scene.match.events.filter(e=>e.time<=time&&e.time>=time-6);ctx.strokeStyle='#ffffff';ctx.lineWidth=.5;ctx.setLineDash([1.3,.9]);for(const e of recent){line(e.x,e.y,e.end_x,e.end_y)}ctx.setLineDash([])}
 if(o.layer==='runs'){ctx.strokeStyle='#ffffff80';ctx.lineWidth=.35;const current=Math.floor(time*scene.match.sample_hz);for(let p=0;p<11;p++){ctx.beginPath();for(let k=Math.max(0,current-scene.match.sample_hz*2);k<=current;k++){const x=scene.positions[k*count*2+p*2],y=scene.positions[k*count*2+p*2+1];if(k===Math.max(0,current-scene.match.sample_hz*2))ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}}
 // Historical evidence is distinct from live player markers; no tracking-array allocation.
 if(o.insight&&time>=o.insight.confirmed_at){const evidence=o.insight.overlay;const a=evidence.start,b=evidence.end;
 ctx.strokeStyle='#b8ffdf';ctx.lineWidth=.65;line(a[0],a[1],b[0],b[1]);
 const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);line(b[0],b[1],b[0]-2*Math.cos(angle-.5),b[1]-2*Math.sin(angle-.5));line(b[0],b[1],b[0]-2*Math.cos(angle+.5),b[1]-2*Math.sin(angle+.5));
 for(const point of [a,b]){ctx.beginPath();ctx.arc(point[0],point[1],2.5,0,Math.PI*2);ctx.stroke()}
 ctx.lineWidth=.3;ctx.setLineDash([.6,.6]);
 for(const opponent of evidence.opponents){ctx.strokeStyle='#b9d3ff';line(opponent.start[0],opponent.start[1],opponent.end[0],opponent.end[1]);ctx.beginPath();ctx.arc(opponent.start[0],opponent.start[1],2,0,Math.PI*2);ctx.stroke();}
 ctx.setLineDash([]);ctx.font='500 2px Arial';ctx.textAlign='center';ctx.fillStyle='#d2ffeb';ctx.fillText(`+${o.gainLabel} m`,(a[0]+b[0])/2,(a[1]+b[1])/2-2);
 }
 for(let i=0;i<count;i++){const p=scene.match.players[i],x=xy[i*2],y=xy[i*2+1],r=1.25;if(i===o.selected){ctx.strokeStyle='#ffffff';ctx.lineWidth=.35;ctx.beginPath();ctx.arc(x,y,2.1,0,Math.PI*2);ctx.stroke()}ctx.fillStyle=p.team==='home'?'#ffffff':'#2873ff';ctx.strokeStyle=p.team==='home'?'#ffffff':'#a9c9ff';ctx.lineWidth=.25;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.team==='home'?'#111111':'#ffffff';ctx.font='500 1.35px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.number),x,y+.1);if(i===o.selected){ctx.font=`500 ${Math.max(1.8,11/tr.s)}px Arial`;const name=p.name.split(' ').at(-1)!;const w=ctx.measureText(name).width;ctx.fillStyle='#0b1110';ctx.fillRect(x-w/2-.8,y+3,w+1.6,3.7);ctx.fillStyle='#ffffff';ctx.fillText(name,x,y+4.9)}}ctx.fillStyle='#ffffff';ctx.strokeStyle='#111';ctx.lineWidth=.25;ctx.beginPath();ctx.arc(ball[0],ball[1],.7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
 function loop(now:number){clock.tick(now);const t=clock.position(),o=latest.current;const settings=`${o.selected}:${o.layer}:${o.follow}:${o.insight?.id??""}:${o.language}`;if(!document.hidden&&(dirty||t!==lastTime||settings!==lastSettings)){draw(t);dirty=false;lastTime=t;lastSettings=settings}frame=requestAnimationFrame(loop)}frame=requestAnimationFrame(loop);
 return()=>{cancelAnimationFrame(frame);ro.disconnect();canvas.removeEventListener('click',click);selection.on('.zoom',null);api.current=null};
 },[scene,clock,api]);
 return <canvas data-insight={insight?.id??''} ref={canvasRef} className="pitch" role="img" aria-label={t('pitchLabel')}/>;
}


