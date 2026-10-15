import {Playback} from './playback';
import type {Match,MatchEvent,Scene} from './types';

export interface LiveFrame {index:number;time:number;positions:number[][];ball:number[];events:MatchEvent[]}
export type FeedStatus='connecting'|'receiving'|'reconnecting'|'complete'|'expired'|'failed';
export interface FeedSnapshot {status:FeedStatus;received:number;events:number}
export const OFFLINE_FEED:FeedSnapshot={status:'complete',received:0,events:0};
export const noSubscribe=()=>()=>{};
export const offlineSnapshot=()=>OFFLINE_FEED;

// Fixed-capacity numeric storage: packets never copy the accumulated tracking data.
export class LiveBuffer {
 readonly scene:Scene;
 readonly capacity:number;
 private ids=new Set<string>();
 lastIndex=0;
 constructor(metadata:Match){
  this.capacity=Math.round(metadata.duration*metadata.sample_hz)+1;
  const count=metadata.players.length;
  if(this.capacity<2||this.capacity>100000||metadata.times.length!==1||metadata.events.length!==0)throw new Error('Invalid stream metadata');
  this.scene={match:metadata,positions:new Float32Array(this.capacity*count*2),ball:new Float32Array(this.capacity*2)};
  this.scene.positions.set(metadata.positions[0].flat());this.scene.ball.set(metadata.ball[0]);
 }
 append(frame:LiveFrame){
  if(!Number.isInteger(frame.index)||frame.index<1||frame.index>=this.capacity)throw new Error('Invalid frame index');
  if(frame.index<=this.lastIndex)return false;
  const {match}=this.scene;
  if(frame.index!==this.lastIndex+1)throw new Error('Missing frame');
  const point=(p:number[])=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  if(!Number.isFinite(frame.time)||Math.abs(frame.time-frame.index/match.sample_hz)>.001||!Array.isArray(frame.positions)||frame.positions.length!==match.players.length||!frame.positions.every(point)||!point(frame.ball)||!Array.isArray(frame.events))throw new Error('Invalid frame');
  if(frame.events.some(e=>!e.id||!Number.isFinite(e.time)||e.time>frame.time||e.time<0))throw new Error('Invalid event timestamp');
  for(let i=0;i<frame.positions.length;i++)this.scene.positions.set(frame.positions[i],(frame.index*match.players.length+i)*2);
  this.scene.ball.set(frame.ball,frame.index*2);
  match.times.push(frame.time);
  // Raw frame arrays are only a bootstrap payload; numeric buffers own subsequent tracking.
  for(const event of frame.events)if(!this.ids.has(event.id)){match.events.push(event);this.ids.add(event.id)}
  this.lastIndex=frame.index;
  return true;
 }
 get available(){return this.scene.match.times[this.lastIndex]}
}

export class LiveFeed {
 readonly buffer:LiveBuffer;
 readonly clock:Playback;
 private source:EventSource|null=null;
 private watchdog:ReturnType<typeof setInterval>|undefined;
 private retryTimer:ReturnType<typeof setTimeout>|undefined;
 private publishTimer:ReturnType<typeof setTimeout>|undefined;
 private lastPublish=0;
 private lastPacket=0;private failures=0;private stopped=true;
 private listeners=new Set<()=>void>();
 private snapshot:FeedSnapshot={status:'connecting',received:0,events:0};
 constructor(readonly sessionId:string,metadata:Match){this.buffer=new LiveBuffer(metadata);this.clock=new Playback(metadata.duration,true)}
 get scene(){return this.buffer.scene}
 getSnapshot=()=>this.snapshot;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}};
 private update(status:FeedStatus){
  const elapsed=performance.now()-this.lastPublish;
  if(status===this.snapshot.status&&elapsed<100){
   if(this.publishTimer===undefined)this.publishTimer=setTimeout(()=>{this.publishTimer=undefined;this.update(status)},100-elapsed);
   return;
  }
  clearTimeout(this.publishTimer);this.publishTimer=undefined;this.lastPublish=performance.now();
  this.snapshot={status,received:this.buffer.available,events:this.scene.match.events.length};this.listeners.forEach(fn=>fn());
 }
 private networkChanged=()=>{if(!this.stopped)this.reconnect()};
 start=()=>{
  if(this.source||this.snapshot.status==='complete'||this.snapshot.status==='expired')return;
  this.stopped=false;this.lastPacket=performance.now();
  window.addEventListener('offline',this.networkChanged);window.addEventListener('online',this.networkChanged);
  const source=new EventSource(`/api/live/${this.sessionId}/events?after=${this.buffer.lastIndex}`);
  this.source=source;
  source.addEventListener('frame',(event)=>{
   if(this.source!==source||this.stopped)return;
   try{
    const frame=JSON.parse((event as MessageEvent).data) as LiveFrame;
    this.lastPacket=performance.now();
    if(!this.buffer.append(frame))return;
    this.failures=0;this.clock.receive(this.buffer.available);this.update('receiving');
   }catch{this.failures++;this.reconnect(this.failures>=3)}
  });
  source.addEventListener('complete',()=>{
   if(this.source!==source)return;
   if(this.buffer.lastIndex!==this.buffer.capacity-1){this.reconnect();return}
   this.close();this.clock.receive(this.buffer.available,true);this.update('complete');
  });
  source.addEventListener('expired',()=>{if(this.source!==source)return;this.close();this.clock.receive(this.buffer.available,true);this.clock.seek(this.clock.position());this.update('expired')});
  source.onerror=()=>{if(this.source===source&&!this.stopped)this.update('reconnecting')};
  this.watchdog=setInterval(()=>{if(performance.now()-this.lastPacket>5000)this.reconnect()},1000);
 };
 close=()=>{this.stopped=true;this.source?.close();this.source=null;clearInterval(this.watchdog);clearTimeout(this.retryTimer);clearTimeout(this.publishTimer);this.publishTimer=undefined;window.removeEventListener('offline',this.networkChanged);window.removeEventListener('online',this.networkChanged)};
 reconnect=(failed=false)=>{
  this.close();this.update(failed?'failed':'reconnecting');
  if(!failed)this.retryTimer=setTimeout(()=>this.start(),500);
 };
 retry=()=>{this.failures=0;this.reconnect()};
}
