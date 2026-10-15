import type {Analysis,Match} from './types';
import type {SavedScene} from './notebook';
export function buildReport(match:Match,at:number,available:number,analysis:Analysis|null,scenes:SavedScene[],language:string){
 const cutoff=Math.max(0,Math.min(at,available,match.duration));
 return {
  schema_version:1,application:'TacticLab',data_source:'synthetic',language,generated_at:new Date().toISOString(),
  match:{id:match.id,scenario:match.scenario,name:match.name,start_minute:match.start_minute,players:match.players},
  replay_time:cutoff,
  analysis:analysis&&analysis.scenario===match.scenario&&analysis.at<=cutoff?analysis:null,
  events:match.events.filter(e=>e.time<=cutoff),
  saved_scenes:scenes.filter(s=>s.at<=cutoff),
 };
}
export function downloadReport(report:ReturnType<typeof buildReport>){
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`tacticlab-${report.match.scenario}-${Math.floor(report.replay_time)}s.json`;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
