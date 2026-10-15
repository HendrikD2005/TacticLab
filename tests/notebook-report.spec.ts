import {test,expect} from '@playwright/test';
import {readScenes} from '../frontend/src/lib/notebook';
import {buildReport} from '../frontend/src/lib/report';
import type {Match,Analysis} from '../frontend/src/lib/types';
const match={id:'test',scenario:'standard',name:'Test',start_minute:62,duration:60,players:[{id:7}],events:[{id:'past',time:2},{id:'future',time:12}]} as Match;
const scene={id:'one',at:9,player:7,text:'Note',insightId:null};
test('invalid, duplicate and incompatible stored scenes cannot enter the notebook',()=>{
 expect(readScenes('{broken',match)).toEqual([]);
 expect(readScenes(JSON.stringify([scene,scene,{...scene,id:'bad-player',player:99},{...scene,id:'future',at:61},{...scene,id:'bad-note',text:12}]),match)).toEqual([scene]);
});
test('report clamps to received data and excludes future analysis and saved notes',()=>{
 const report=buildReport(match,30,5,{at:9,scenario:'standard'} as Analysis,[scene],'en');
 expect(report.replay_time).toBe(5);
 expect(report.events.map(e=>e.id)).toEqual(['past']);
 expect(report.saved_scenes).toEqual([]);expect(report.analysis).toBeNull();
});
