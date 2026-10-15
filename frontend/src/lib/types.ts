export type Layer='passes'|'pressure'|'runs'|'none';
export type Mode='analyst'|'fan';
export interface Player{id:number;number:number;name:string;team:'home'|'away';role:'goalkeeper'|'defender'|'midfielder'|'forward'}
export interface MatchEvent{id:string;time:number;release_time:number;type:'pass'|'turnover'|'shot';player_id:number;target_id:number|null;x:number;y:number;end_x:number;end_y:number;success:boolean;under_pressure:boolean;sequence_id:string|null}
export type Scenario='standard'|'variation'|'control'|'tactics';
export interface Match{id:string;scenario:Scenario;name:string;duration:number;start_minute:number;sample_hz:number;players:Player[];times:number[];positions:number[][][];ball:number[][];events:MatchEvent[]}
export interface Scene{match:Match;positions:Float32Array;ball:Float32Array}
export interface Metrics{attempts:number;completed:number;accuracy:number|null;progressive:number;pressure_attempts:number;pressure_completed:number;forward:number;distance_m:number;event_ids:string[]}
export interface Possession{at:number;since:number;phase_id:number;phase_start:number;team:'home'|'away'|null;player_id:number|null;status:'unknown'|'controlled'|'in_flight'|'loose';duration:number}
export type InsightKind='pressing_escape'|'switch_of_play'|'local_overload';
interface InsightBase{id:string;start:number;end:number;confirmed_at:number;team:'home'|'away';phase_id:number;player_ids:number[];event_ids:string[];title:string;summary:string;explanation:string;limitation:string}
interface PassOverlay{start:number[];end:number[];opponents:{id:number;start:number[];end:number[]}[]}
export type TacticalInsight=InsightBase & (
 {kind:'pressing_escape';evidence:{gain_m:number;pressure_before_m:number;space_after_m:number;bypassed:number;retained_s:number};overlay:PassOverlay} |
 {kind:'switch_of_play';evidence:{width_m:number;distance_m:number;space_after_m:number;retained_s:number};overlay:PassOverlay} |
 {kind:'local_overload';evidence:{attackers:number;defenders:number;minimum_advantage:number;radius_m:number;retained_s:number};overlay:{center:number[];radius:number;at:number;members:{id:number;team:'home'|'away';point:number[]}[]}}
);
export interface Analysis{session_id:string|null;language:'en'|'de';scenario:Scenario;possession:Possession;insights:TacticalInsight[];at:number;player_id:number;player:Metrics;team:Metrics;comparison:({label:string}&Metrics)[]}
export interface EvidenceScene{id:string;insight_id:string|null;at:number;start:number;end:number;title:string;reason:string;player_id:number;event_ids:string[]}
export interface Explanation{mode:Mode;scenes:EvidenceScene[];context:string;scope:string;topic:string;unsupported:boolean;scenario:Scenario;session_id:string|null;language:'en'|'de';source:'deterministic'|'azure';text:string;event_ids:string[];at:number;player_id:number;notice?:string}
export function formatTime(t:number,start=62){return `${start+Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`}

