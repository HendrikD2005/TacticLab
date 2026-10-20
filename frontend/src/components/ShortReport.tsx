import {Download,ArrowUpRight,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {SectionHeading} from '@/components/ui/editorial';
import AgentTrace from './AgentTrace';
import {useI18n} from '@/i18n';
import {downloadBrief} from '@/lib/report';
import {formatTime,type Match,type Explanation,type EvidenceScene} from '@/lib/types';

interface Props{
  report:Explanation|null;match:Match;onInspect:(scene:EvidenceScene)=>void;
  onCurate:()=>void;enabled:boolean;busy:boolean;
}

export default function ShortReport({report,match,onInspect,onCurate,enabled,busy}:Props){
  const {t}=useI18n();
  return <section className="short-report" data-testid="short-report" aria-label={t('shortReport')}>
    <SectionHeading index="02" title={t('shortReport')}
      description={report?.context??t('reportLoading')}
      actions={<Button size="icon" variant="ghost" aria-label={t('downloadBrief')}
        disabled={!report} onClick={()=>report&&downloadBrief(match,report)}><Download/></Button>}/>
    {report&&<>
      <ol className="report-claims">{report.claims?.map((claim,index)=>
        <li key={claim.id}><span className="claim-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
          <p>{claim.text}</p></li>
      )}</ol>
      <div className="report-evidence">{report.scenes.filter(scene=>scene.insight_id).map(scene=>
        <Button variant="ghost" key={scene.id} onClick={()=>onInspect(scene)}>
          <span>{formatTime(scene.at,match.start_minute)} · {scene.title}</span><ArrowUpRight/>
        </Button>
      )}</div>
      {enabled&&<Button className="curate-report" onClick={onCurate} disabled={busy}>
        {busy?<LoaderCircle className="spin"/>:<ArrowUpRight/>}{t('curateReport')}
      </Button>}
      <p className="report-provenance">{t(report.source==='foundry'?'reportFoundry':'reportLocal')}</p>
      <p className="sample report-caution">{t('reportCaution')}</p>
      {report.notice&&<p role="status" className="sample">{report.notice}</p>}
      <AgentTrace run={report.agent}/>
    </>}
  </section>;
}
