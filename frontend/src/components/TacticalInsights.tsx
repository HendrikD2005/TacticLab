import {useState} from 'react';
import {useI18n} from '@/i18n';
import {Button} from '@/components/ui/button';
import {formatTime,type TacticalInsight,type InsightKind,type Mode,type Player} from '@/lib/types';
interface Props{insights:TacticalInsight[];active:TacticalInsight|null;mode:Mode;players:Player[];focused:boolean;onFocus:()=>void;onSelect:(insight:TacticalInsight)=>void;onClear:()=>void}
export default function TacticalInsights({insights,active,mode,players,focused,onFocus,onSelect,onClear}:Props){
 const {t,number}=useI18n();const [kind,setKind]=useState<InsightKind|'all'>('all');
 const visible=insights.filter(i=>kind==='all'||i.kind===kind);
 const badge=(i:TacticalInsight)=>i.kind==='pressing_escape'?`+${number(i.evidence.gain_m)} m`:i.kind==='switch_of_play'?`${number(i.evidence.width_m)} m`:`${i.evidence.attackers} v ${i.evidence.defenders}`;
 return <section className="tactical-insights" aria-label={t('automaticAnalysis')}>
  <div className="sectiontitle"><span>{t('escapes')} <span className="muted">{visible.length}</span></span><Button variant="ghost" aria-pressed={focused} onClick={onFocus}>{t('selectedOnly')}</Button></div>
  <label className="pattern-filter">{t('kindFilter')}<select aria-label={t('kindFilter')} value={kind} onChange={e=>{const next=e.target.value as typeof kind;setKind(next);if(active&&next!=='all'&&active.kind!==next)onClear()}}><option value="all">{t('allPatterns')}</option>{(['pressing_escape','switch_of_play','local_overload'] as const).map(k=><option key={k} value={k}>{t(`kind.${k}`)}</option>)}</select></label>
  {visible.length===0?<p className="insight-empty">{focused?t('emptyPlayer'):t('emptyEscapes')}</p>:<div className="moments">{visible.map(i=><Button className="moment" key={i.id} aria-pressed={active?.id===i.id} onClick={()=>onSelect(i)}><span>{formatTime(i.end)} · {i.team==='home'?'NTH':'RIV'}</span><b>{mode==='fan'&&i.kind==='pressing_escape'?t('fanEscape'):i.title}</b><span className="moment-gain">{badge(i)}</span></Button>)}</div>}
  {active&&<article className="tactical-detail" data-testid="tactical-detail" data-kind={active.kind}>
   <div className="detail-heading"><div><div className="eyebrow">{mode==='analyst'?t('ruleBased'):t('keyAction')}</div><h2>{active.kind==='local_overload'?`${active.title} · ${badge(active)}`:<>{players.find(p=>p.id===active.player_ids[0])?.name} → {players.find(p=>p.id===active.player_ids[1])?.name}</>}</h2></div><Button variant="ghost" onClick={onClear} aria-label={t('hideOverlay')}>{t('hide')}</Button></div>
   <p>{mode==='fan'?active.summary:active.explanation}</p>
   {mode==='analyst'&&<><dl className="evidence-grid">
    {active.kind==='pressing_escape'?<><div><dt>{t('gain')}</dt><dd>+{number(active.evidence.gain_m)} m</dd></div><div><dt>{t('opponentDistance')}</dt><dd>{number(active.evidence.pressure_before_m)} → {number(active.evidence.space_after_m)} m</dd></div><div><dt>{t('bypassed')}</dt><dd>{t('opponents',{count:active.evidence.bypassed})}</dd></div></>:active.kind==='switch_of_play'?<><div><dt>{t('widthShift')}</dt><dd>{number(active.evidence.width_m)} m</dd></div><div><dt>{t('passLength')}</dt><dd>{number(active.evidence.distance_m)} m</dd></div><div><dt>{t('receptionSpace')}</dt><dd>{number(active.evidence.space_after_m)} m</dd></div></>:<><div><dt>{t('localNumbers')}</dt><dd>{badge(active)}</dd></div><div><dt>{t('zoneRadius')}</dt><dd>{number(active.evidence.radius_m)} m</dd></div><div><dt>{t('minimumAdvantage')}</dt><dd>+{active.evidence.minimum_advantage}</dd></div></>}
    <div><dt>{t('confirmation')}</dt><dd>+{number(active.evidence.retained_s)} s</dd></div></dl>
    <details><summary>{t('evidenceRule')}</summary><p>{active.kind==='local_overload'?t('overloadReference',{events:active.event_ids.join(', '),phase:active.phase_id,start:formatTime(active.end),confirmed:formatTime(active.confirmed_at)}):t('evidenceReference',{events:active.event_ids.join(', '),phase:active.phase_id,start:formatTime(active.start),end:formatTime(active.end),confirmed:formatTime(active.confirmed_at)})}</p><p>{t(active.kind==='pressing_escape'?'detectionRule':active.kind==='switch_of_play'?'switchRule':'overloadRule')}</p><p>{active.limitation}</p></details></>}
   <div className="overlay-key"><i/>{active.kind==='local_overload'?t('overloadOverlay',{time:formatTime(active.confirmed_at)}):t(active.kind==='switch_of_play'?'switchOverlay':'overlayKey',{start:formatTime(active.start),end:formatTime(active.end)})}</div>
  </article>}
 </section>;
}
