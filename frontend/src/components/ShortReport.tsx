import {Download,ArrowUpRight,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import AgentTrace from './AgentTrace';
import {useI18n} from '@/i18n';
import {downloadBrief} from '@/lib/report';
import {formatTime,type Match,type Explanation,type EvidenceScene} from '@/lib/types';

export default function ShortReport({report,match,onInspect,onCurate,enabled,busy}:{
 report:Explanation|null;match:Match;onInspect:(scene:EvidenceScene)=>void;
 onCurate:()=>void;enabled:boolean;busy:boolean;
}){
 const {t}=useI18n();
 return <section className="short-report" data-testid="short-report" aria-label={t('shortReport')}>
  <div className="report-heading"><div><span className="eyebrow">{t('shortReport')}</span>
   <p className="sample">{report?.context??t('reportLoading')}</p></div>
   <div className="group">
    {enabled&&<Button onClick={onCurate} disabled={busy||!report}>{busy?<LoaderCircle className="spin"/>:null}{t('curateReport')}</Button>}
    <Button size="icon" aria-label={t('downloadBrief')} disabled={!report} onClick={()=>report&&downloadBrief(match,report)}><Download/></Button>
   </div>
  </div>
  {report&&<>
   <ul className="report-claims">{report.claims?.map(claim=><li key={claim.id}>{claim.text}</li>)}</ul>
   <div className="report-evidence">{report.scenes.filter(s=>s.insight_id).map(scene=>
    <Button key={scene.id} onClick={()=>onInspect(scene)}><ArrowUpRight/>{formatTime(scene.at,match.start_minute)} · {scene.title}</Button>
   )}</div>
   <p className="sample">{t(report.source==='foundry'?'reportFoundry':'reportLocal')} · {t('reportCaution')}</p>
   {report.notice&&<p role="status">{report.notice}</p>}
   <AgentTrace run={report.agent}/>
  </>}
 </section>;
}
