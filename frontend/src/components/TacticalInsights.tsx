import {useI18n} from '@/i18n';
import {Button} from '@/components/ui/button';
import {formatTime,type TacticalInsight,type Mode,type Player} from '@/lib/types';

interface Props {
 insights:TacticalInsight[]; active:TacticalInsight|null; mode:Mode; players:Player[];
 focused:boolean; onFocus:()=>void; onSelect:(insight:TacticalInsight)=>void; onClear:()=>void;
}
export default function TacticalInsights({insights,active,mode,players,focused,onFocus,onSelect,onClear}:Props){
 const {t,number}=useI18n();
 return <section className="tactical-insights" aria-label={t('automaticAnalysis')}>
  <div className="sectiontitle"><span>{t('escapes')} <span className="muted">{insights.length}</span></span>
   <Button variant="ghost" aria-pressed={focused} onClick={onFocus}>{t('selectedOnly')}</Button>
  </div>
  {insights.length===0?<p className="insight-empty">{focused?t('emptyPlayer'):t('emptyEscapes')}</p>:
   <div className="moments">{insights.map(i=><Button className="moment" key={i.id} aria-pressed={active?.id===i.id} onClick={()=>onSelect(i)}>
    <span>{formatTime(i.end)} · {i.team==='home'?'NTH':'RIV'}</span><b>{mode==='fan'?t('fanEscape'):i.title}</b><span className="moment-gain">+{number(i.evidence.gain_m)} m</span>
   </Button>)}</div>}
  {active&&<article className="tactical-detail" data-testid="tactical-detail">
   <div className="detail-heading"><div><div className="eyebrow">{mode==='analyst'?t('ruleBased'):t('keyAction')}</div><h2>{players.find(p=>p.id===active.player_ids[0])?.name} → {players.find(p=>p.id===active.player_ids[1])?.name}</h2></div><Button variant="ghost" onClick={onClear} aria-label={t('hideOverlay')}>{t('hide')}</Button></div>
   <p>{mode==='fan'?active.summary:active.explanation}</p>
   {mode==='analyst'&&<><dl className="evidence-grid"><div><dt>{t('gain')}</dt><dd>+{number(active.evidence.gain_m)} m</dd></div><div><dt>{t('opponentDistance')}</dt><dd>{number(active.evidence.pressure_before_m)} → {number(active.evidence.space_after_m)} m</dd></div><div><dt>{t('bypassed')}</dt><dd>{t('opponents',{count:active.evidence.bypassed})}</dd></div><div><dt>{t('confirmation')}</dt><dd>+{number(active.evidence.retained_s)} s</dd></div></dl>
    <details><summary>{t('evidenceRule')}</summary><p>{t('evidenceReference',{events:active.event_ids.join(', '),phase:active.phase_id,start:formatTime(active.start),end:formatTime(active.end),confirmed:formatTime(active.confirmed_at)})}</p><p>{t('detectionRule')}</p><p>{active.limitation}</p></details></>}
   <div className="overlay-key"><i/>{t('overlayKey',{start:formatTime(active.start),end:formatTime(active.end)})}</div>
  </article>}
 </section>;
}
