// Rendering reads this clock directly. React notifications stay at most 10 Hz.
export class Playback {
 private time=0;private started=performance.now();private active=false;private rate=1;private lastNotify=0;
 private available:number;private following:boolean;private ended:boolean;
 private listeners=new Set<()=>void>();
 private snapshot:{time:number;playing:boolean;speed:number;available:number;following:boolean;ended:boolean};
 constructor(readonly duration:number,readonly live=false){
  this.available=live?0:duration;this.following=live;this.ended=!live;this.active=live;
  this.snapshot={time:0,playing:this.active,speed:1,available:this.available,following:live,ended:this.ended};
 }
 position=()=>Math.min(this.available,this.time+(this.active?(performance.now()-this.started)/1000*this.rate:0));
 getSnapshot=()=>this.snapshot;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}};
 private emit(){this.lastNotify=performance.now();this.snapshot={time:this.position(),playing:this.active,speed:this.rate,available:this.available,following:this.following,ended:this.ended};this.listeners.forEach(fn=>fn())}
 // Only received frames advance the playable boundary. No extrapolation into the future.
 receive=(available:number,ended=false)=>{
  const current=this.position();this.available=Math.max(this.available,Math.min(this.duration,available));this.ended=ended;
  if(this.following){this.time=Math.max(current,Math.max(0,this.available-.2));this.started=performance.now();this.active=true}
  if(ended||performance.now()-this.lastNotify>=100)this.emit();
 };
 seek=(time:number)=>{this.following=false;this.active=false;this.time=Math.max(0,Math.min(this.available,time));this.started=performance.now();this.emit()};
 toggle=()=>{this.time=this.position();this.following=false;if(this.time>=this.available&&this.ended)this.time=0;this.active=!this.active;this.started=performance.now();this.emit()};
 setSpeed=(value:number)=>{this.time=this.position();this.following=false;this.rate=value;this.started=performance.now();this.emit()};
 backToLive=()=>{if(!this.live||this.ended)return;this.following=true;this.active=true;this.rate=1;this.time=Math.max(0,this.available-.2);this.started=performance.now();this.emit()};
 tick=(now:number)=>{
  if(this.active&&this.ended&&this.position()>=this.available){this.time=this.available;this.active=false;this.following=false;this.emit()}
  else {
   if(this.active&&!this.following&&this.position()>=this.available){this.time=this.available;this.started=now}
   if(now-this.lastNotify>=100&&this.active)this.emit();
  }
 };
}
