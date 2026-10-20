import type {Analysis,Match,Explanation} from './types';
import type {SavedScene} from './notebook';
export function buildReport(match:Match,at:number,available:number,analysis:Analysis|null,scenes:SavedScene[],language:string,recap:Explanation|null=analysis?.recap??null){
 const cutoff=Math.max(0,Math.min(at,available,match.duration));
 return {
  schema_version:2,application:'TacticLab',data_source:'synthetic',language,generated_at:new Date().toISOString(),
  match:{id:match.id,scenario:match.scenario,name:match.name,start_minute:match.start_minute,players:match.players},
  replay_time:cutoff,
  short_report:recap&&recap.scenario===match.scenario&&recap.language===language&&recap.at<=cutoff?recap:null,
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

export function briefText(match:Match,report:Explanation){
 const de=report.language==='de';
 return [
  'TacticLab · '+(de?'Belegter Kurzbericht':'Evidence-backed short report'),
  report.context, de?'Daten: synthetisches Demo-Spiel':'Data: synthetic demo match',
  ...((report.claims??[]).map(claim=>`\n• ${claim.text}\n  ${de?'Belege':'Evidence'}: ${claim.event_ids.join(', ')||'—'} · t=${claim.at}s`)),
  '\n'+(de?'Szenen (Spielsekunden):':'Scenes (match seconds):'),
  ...report.scenes.map(s=>`${s.at}s · ${s.title} · ${s.event_ids.join(', ')}`),
  '\n'+(de?'Kurzer Ausschnitt; keine Aussage zur gesamten Partie.':'Short sample; no conclusion about the entire match.'),
  (de?'Erstellt mit: ':'Created with: ')+(report.source==='foundry'?'Microsoft Foundry':'TacticLab local analysis'),
  `${match.id} · ${match.scenario}`
 ].join('\n');
}
export function downloadBrief(match:Match,report:Explanation){
 const url=URL.createObjectURL(new Blob([briefText(match,report)],{type:'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=`tacticlab-brief-${match.scenario}-${Math.floor(report.at)}s-${report.language}.txt`;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
