import {Button} from '@/components/ui/button';
import {formatTime,type TacticalInsight,type Mode,type Player} from '@/lib/types';

interface Props {
 insights:TacticalInsight[]; active:TacticalInsight|null; mode:Mode; players:Player[];
 focused:boolean; onFocus:()=>void; onSelect:(insight:TacticalInsight)=>void; onClear:()=>void;
}
export default function TacticalInsights({insights,active,mode,players,focused,onFocus,onSelect,onClear}:Props){
 return <section className="tactical-insights" aria-label="Automatische Spielanalyse">
  <div className="sectiontitle"><span>Erkannte Durchbrüche <span className="muted">{insights.length}</span></span>
   <Button variant="ghost" aria-pressed={focused} onClick={onFocus}>Nur ausgewählter Spieler</Button>
  </div>
  {insights.length===0?<p className="insight-empty">{focused?'Für diesen Spieler bisher kein bestätigter Durchbruch.':'Bisher kein bestätigter Pressingdurchbruch. Die Analyse wartet auf Druck, Raumgewinn und gesicherten Ballbesitz.'}</p>:
   <div className="moments">{insights.map(i=><Button className="moment" key={i.id} aria-pressed={active?.id===i.id} onClick={()=>onSelect(i)}>
    <span>{formatTime(i.end)} · {i.team==='home'?'NTH':'RIV'}</span><b>{mode==='fan'?'Aus dem Druck gespielt':i.title}</b><span className="moment-gain">+{i.evidence.gain_m} m</span>
   </Button>)}</div>}
  {active&&<article className="tactical-detail" data-testid="tactical-detail">
   <div className="detail-heading"><div><div className="eyebrow">{mode==='analyst'?'Regelbasiert erkannt · mit Ereignisbeleg':'Die entscheidende Aktion'}</div><h2>{players.find(p=>p.id===active.player_ids[0])?.name} → {players.find(p=>p.id===active.player_ids[1])?.name}</h2></div><Button variant="ghost" onClick={onClear} aria-label="Szenenmarkierung ausblenden">Ausblenden</Button></div>
   <p>{mode==='fan'?active.summary:active.explanation}</p>
   {mode==='analyst'&&<><dl className="evidence-grid"><div><dt>Raumgewinn</dt><dd>+{active.evidence.gain_m} m</dd></div><div><dt>Gegnerabstand</dt><dd>{active.evidence.pressure_before_m} → {active.evidence.space_after_m} m</dd></div><div><dt>Überspielt</dt><dd>{active.evidence.bypassed} Gegner</dd></div><div><dt>Bestätigung</dt><dd>+{active.evidence.retained_s} s</dd></div></dl>
    <details><summary>Belege und Erkennungsregel</summary><p>Pass: {active.event_ids.join(', ')} · Ballbesitzphase {active.phase_id}. Beobachtet {formatTime(active.start)}–{formatTime(active.end)}, bestätigt {formatTime(active.confirmed_at)}.</p><p>Gegner beim Abspiel höchstens 10 m entfernt; mindestens 10 m vorwärts. Mindestens ein druckausübender Gegner wird um 2 m überspielt. Bei Annahme mindestens 8 m Gegnerabstand und 2 m mehr Abstand als zuvor. Nach 2 s besteht kontrollierter Ballbesitz in derselben Phase.</p><p>{active.limitation}</p></details></>}
   <div className="overlay-key"><i/>Markierung: historische Passspur und überspielte Gegner · {formatTime(active.start)}–{formatTime(active.end)}</div>
  </article>}
 </section>;
}
