import {test,expect} from '@playwright/test';
import {LiveBuffer} from '../frontend/src/lib/live';
import {Playback} from '../frontend/src/lib/playback';
import type {Match,MatchEvent} from '../frontend/src/lib/types';

function metadata():Match{return {id:'test',scenario:'standard',name:'Test',duration:2,start_minute:0,sample_hz:10,players:[{id:0,number:1,name:'A',team:'home',role:'forward'}],times:[0],positions:[[[0,0]]],ball:[[0,0]],events:[]}}
const event:MatchEvent={id:'e1',time:.1,release_time:0,type:'pass',player_id:0,target_id:0,x:0,y:0,end_x:1,end_y:1,success:true,under_pressure:false,sequence_id:null};
const frame=(index:number,events:MatchEvent[]=[])=>({index,time:index/10,positions:[[index,index]],ball:[index,index],events});

test('buffer applies ordered frames, ignores duplicates and rejects gaps without partial writes',()=>{
 const buffer=new LiveBuffer(metadata());const storage=buffer.scene.positions;
 expect(buffer.append(frame(1,[event]))).toBeTruthy();
 expect(buffer.append(frame(1,[event]))).toBeFalsy();
 buffer.append(frame(2,[event]));
 expect(buffer.scene.match.events).toHaveLength(1);
 expect(()=>buffer.append(frame(4))).toThrow('Missing frame');
 expect(buffer.lastIndex).toBe(2);
 expect(buffer.available).toBe(.2);
 expect(()=>buffer.append(frame(3,[{...event,time:1}]))).toThrow('timestamp');
 expect(buffer.lastIndex).toBe(2);
 buffer.append(frame(3));
 expect(buffer.scene.positions).toBe(storage);
 expect([...buffer.scene.positions.slice(6,8)]).toEqual([3,3]);
 expect(buffer.scene.match.times).toEqual([0,.1,.2,.3]);
});

test('live clock cannot seek into future and receipt does not move a paused replay',()=>{
 const clock=new Playback(60,true);
 clock.receive(10);clock.seek(3);
 clock.receive(20);
 expect(clock.position()).toBe(3);
 expect(clock.getSnapshot().following).toBeFalsy();
 clock.seek(999);expect(clock.position()).toBe(20);
 clock.backToLive();expect(clock.getSnapshot().following).toBeTruthy();
 expect(clock.position()).toBeGreaterThanOrEqual(19.8);
 expect(clock.position()).toBeLessThanOrEqual(20);
 clock.receive(60,true);clock.seek(5);clock.receive(60,true);
 expect(clock.position()).toBe(5);
 expect(clock.getSnapshot().ended).toBeTruthy();
});
