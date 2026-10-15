import {memo,useMemo,useState} from 'react';
import {ArrowUpRight,Search} from 'lucide-react';
import {Button} from './ui/button';
import {useI18n} from '@/i18n';
import {formatTime,type Match,type MatchEvent} from '@/lib/types';
interface Props{match:Match;at:number;eventCount:number;selected:number;onInspect:(event:MatchEvent)=>void}
export default memo(function EventExplorer({match,at,eventCount,selected,onInspect}:Props){
 const {t,number}=useI18n();
 const [query,setQuery]=useState(''),[team,setTeam]=useState('all'),[filter,setFilter]=useState('all'),[focused,setFocused]=useState(false);
 const players=useMemo(()=>new Map(match.players.map(p=>[p.id,p])),[match]);
 const events=useMemo(()=>match.events.filter(event=>{
  if(event.time>at)return false;
  const player=players.get(event.player_id),target=event.target_id===null?undefined:players.get(event.target_id);
  return (team==='all'||player?.team===team)&&(!focused||event.player_id===selected||event.target_id===selected)
   &&(filter==='all'||filter==='pressure'&&event.under_pressure||filter==='completed'&&event.success||filter==='unsuccessful'&&!event.success)
   &&`${player?.name??''} ${target?.name??''} ${event.id}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 }).reverse(),[match,eventCount,at,players,team,filter,focused,selected,query]);
 return <section className="event-explorer" aria-label={t('eventLog')}>
  <div className="section-heading"><div><h2>{t('eventLog')}</h2><p>{t('eventsThrough',{time:formatTime(at,match.start_minute)})}</p></div><span className="count-badge" data-testid="filtered-events">{events.length}</span></div>
  <div className="event-filters"><label className="search-field"><Search size={16}/><input type="search" aria-label={t('searchEvents')} placeholder={t('searchEvents')} value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <select aria-label={t('teamFilter')} value={team} onChange={e=>setTeam(e.target.value)}><option value="all">{t('allTeams')}</option><option value="home">Northbridge</option><option value="away">Riverside</option></select>
   <select aria-label={t('eventFilter')} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t('allEvents')}</option><option value="completed">{t('completedEvents')}</option><option value="unsuccessful">{t('unsuccessfulEvents')}</option><option value="pressure">{t('underPressure')}</option></select>
   <label className="checkbox-label"><input type="checkbox" checked={focused} onChange={e=>setFocused(e.target.checked)}/>{t('selectedOnly')}</label>
  </div>
  {events.length===0?<div className="empty-state"><Search/><h3>{t('noEvents')}</h3><p>{t('noEventsHint')}</p></div>:<div className="event-list">{events.map(event=><Button className="event-row" key={event.id} onClick={()=>onInspect(event)} data-testid="event-row">
   <time>{formatTime(event.time,match.start_minute)}</time><span className="event-description"><strong>{players.get(event.player_id)?.name}{event.target_id!==null&&<> → {players.get(event.target_id)?.name}</>}</strong><span>{t(`event.${event.type}`)} · {number(Math.hypot(event.end_x-event.x,event.end_y-event.y))} m{event.under_pressure&&` · ${t('underPressure')}`}</span></span><span className={`result-pill ${event.success?'success':'miss'}`}>{t(event.success?'completedEvents':'unsuccessfulEvents')}</span><ArrowUpRight/>
  </Button>)}</div>}
 </section>;
});
