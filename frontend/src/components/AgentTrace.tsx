import {useI18n} from '@/i18n';
import type {AgentRun} from '@/lib/types';

export default function AgentTrace({run}:{run?:AgentRun}){
 const {t,number}=useI18n();
 if(!run||run.model_calls===0)return null;
 const labels:Record<string,string>={
  get_passing_statistics:t('tool.statistics'),get_tactical_findings:t('tool.patterns'),
  compare_periods:t('tool.comparison'),get_recent_events:t('tool.events'),
 };
 return <details className="agent-trace" data-testid="agent-trace">
  <summary>{t('agentTrace')}</summary>
  <p>{t(run.status==='completed'?'agentVerified':'agentFallback')}</p>
  <ol>{run.tools.map((step,index)=><li key={index}>
   {labels[step.name]??t('tool.unknown')} · {t(step.status==='ok'?'tool.checked':'tool.rejected')}
  </li>)}</ol>
  <p className="sample">{t('agentUsage',{calls:run.model_calls,tokens:run.prompt_tokens+run.completion_tokens,seconds:number(run.latency_ms/1000)})}</p>
 </details>;
}
