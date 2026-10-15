// The renderer reads the clock directly; React subscribers update at most 10 Hz.
export class Playback {
  private time=28;private started=0;private active=false;private rate=1;private lastNotify=0;
  private listeners=new Set<()=>void>();
  private snapshot={time:28,playing:false,speed:1};
  constructor(readonly duration:number){}
  position=()=>Math.min(this.duration,this.time+(this.active?(performance.now()-this.started)/1000*this.rate:0));
  getSnapshot=()=>this.snapshot;
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}};
  private emit(){this.snapshot={time:this.position(),playing:this.active,speed:this.rate};this.listeners.forEach(fn=>fn())}
  seek=(time:number)=>{this.time=Math.max(0,Math.min(this.duration,time));this.started=performance.now();this.emit()};
  toggle=()=>{this.time=this.position();if(this.time>=this.duration)this.time=0;this.active=!this.active;this.started=performance.now();this.emit()};
  setSpeed=(value:number)=>{this.time=this.position();this.rate=value;this.started=performance.now();this.emit()};
  tick=(now:number)=>{if(this.active&&this.position()>=this.duration){this.time=this.duration;this.active=false;this.emit()}else if(this.active&&now-this.lastNotify>=100){this.lastNotify=now;this.emit()}};
}
