export type Layer='passes'|'pressure'|'runs'|'none';
export type Mode='analyst'|'fan';
export interface Player{id:number;number:number;name:string;team:'home'|'away';role:string}
export interface MatchEvent{id:string;time:number;release_time:number;type:'pass'|'turnover'|'shot';player_id:number;target_id:number|null;x:number;y:number;end_x:number;end_y:number;success:boolean;under_pressure:boolean;sequence_id:string|null}
export type Scenario='standard'|'variation'|'control';
export interface Match{id:string;scenario:Scenario;name:string;duration:number;start_minute:number;sample_hz:number;players:Player[];times:number[];positions:number[][][];ball:number[][];events:MatchEvent[]}
export interface Scene{match:Match;positions:Float32Array;ball:Float32Array}
export interface Metrics{attempts:number;completed:number;accuracy:number|null;progressive:number;pressure_attempts:number;pressure_completed:number;forward:number;distance_m:number;event_ids:string[]}
export interface Possession{at:number;since:number;phase_id:number;phase_start:number;team:'home'|'away'|null;player_id:number|null;status:'unknown'|'controlled'|'in_flight'|'loose';duration:number}
export interface TacticalInsight{id:string;kind:'pressing_escape';start:number;end:number;confirmed_at:number;team:'home'|'away';phase_id:number;player_ids:number[];event_ids:string[];title:string;summary:string;explanation:string;limitation:string;evidence:{gain_m:number;pressure_before_m:number;space_after_m:number;bypassed:number;retained_s:number};overlay:{start:number[];end:number[];opponents:{id:number;start:number[];end:number[]}[]}}
export interface Analysis{scenario:Scenario;possession:Possession;insights:TacticalInsight[];at:number;player_id:number;player:Metrics;team:Metrics;comparison:({label:string}&Metrics)[]}
export interface Explanation{source:'deterministic'|'azure';text:string;event_ids:string[];at:number;player_id:number;notice?:string}
export function formatTime(t:number,start=62){return `${start+Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`}

