export type Layer='passes'|'pressure'|'runs'|'none';
export type Mode='analyst'|'fan';
export interface Player{id:number;number:number;name:string;team:'home'|'away';role:string}
export interface MatchEvent{id:string;time:number;release_time:number;type:'pass'|'turnover'|'shot';player_id:number;target_id:number|null;x:number;y:number;end_x:number;end_y:number;success:boolean;under_pressure:boolean;sequence_id:string}
export interface Sequence{id:string;start:number;end:number;title:string;outcome:'escape'|'turnover'|'shot'}
export interface Match{id:string;name:string;duration:number;start_minute:number;sample_hz:number;players:Player[];times:number[];positions:number[][][];ball:number[][];events:MatchEvent[];sequences:Sequence[]}
export interface Scene{match:Match;positions:Float32Array;ball:Float32Array}
export interface Metrics{attempts:number;completed:number;accuracy:number|null;progressive:number;pressure_attempts:number;pressure_completed:number;forward:number;distance_m:number;event_ids:string[]}
export interface Analysis{at:number;player_id:number;player:Metrics;team:Metrics;sequences:Sequence[];comparison:({label:string}&Metrics)[]}
export interface Explanation{source:'deterministic'|'azure';text:string;event_ids:string[];at:number;player_id:number;notice?:string}
export function formatTime(t:number,start=62){return `${start+Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`}

