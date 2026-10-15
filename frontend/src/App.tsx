import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowUpRight,Focus,Minus,Plus,Pause,Play,RotateCcw,Moon,Sun,AlertCircle,LoaderCircle,LayoutDashboard,ListFilter,Bookmark,Download,SkipBack,SkipForward} from 'lucide-react';
import {useI18n,LanguagePicker} from '@/i18n';
import {Button} from '@/components/ui/button';
import EventExplorer from '@/components/EventExplorer';
import Personalization from '@/components/Personalization';
import {usePreferences} from '@/lib/preferences';
import Notebook from '@/components/Notebook';
import {MAX_SCENES,useNotebook,type SavedScene} from '@/lib/notebook';
import {buildReport,downloadReport} from '@/lib/report';
import TacticalInsights from '@/components/TacticalInsights';
import Pitch,{type PitchApi} from '@/components/Pitch';
import {Playback} from '@/lib/playback';
import {LiveFeed,noSubscribe,offlineSnapshot} from '@/lib/live';
import {useAnalysis} from '@/hooks/useAnalysis';
import {formatTime,type Match,type Scene,type Mode,type Layer,type Explanation,type EvidenceScene,type TacticalInsight,type Scenario,type MatchEvent} from '@/lib/types';
const Comparison=lazy(()=>import('@/components/Comparison'));

export default function App(){
 const {t}=useI18n();
 const preferences=usePreferences();
 const [scenario,setScenario]=useState<Scenario>('standard');
 const [source,setSource]=useState<'replay'|'live'>('replay');
 const [feed,setFeed]=useState<LiveFeed|null>(null);
 const [scene,setScene]=useState<Scene|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const sessionKey=useMemo(()=>crypto.randomUUID(),[scenario,source,retry]);
 useEffect(()=>{
  const controller=new AbortController();setError('');
  async function load(){
   const response=source==='live'
    ?await fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,session_id:sessionKey}),signal:controller.signal})
    :await fetch(`/api/match?scenario=${scenario}`,{signal:controller.signal});
   if(!response.ok)throw new Error('Match API unavailable');
   const payload=await response.json();if(controller.signal.aborted)return;
   if(source==='live'){const next=new LiveFeed(payload.session_id,payload.match);setFeed(next);setScene(next.scene)}
   else {const match=payload as Match;setFeed(null);setScene({match,positions:new Float32Array(match.positions.flat(2)),ball:new Float32Array(match.ball.flat())})}
  }
  load().catch(()=>{if(!controller.signal.aborted)setError('failed')});
  return()=>controller.abort();
 },[scenario,source,retry,sessionKey]);
 if(!scene)return <main className="startup"><span className="startup-logo">TacticLab</span><LanguagePicker/>{error?<><AlertCircle/><p role="alert">{t('error.match')}</p><Button onClick={()=>setRetry(r=>r+1)}>{t('retry')}</Button></>:<><LoaderCircle className="spin"/><p>{t('loading')}</p></>}</main>;
 return <Workspace preferences={preferences} key={feed?.sessionId??scene.match.id} scene={scene} feed={feed} onRestart={()=>{setScene(null);setRetry(v=>v+1)}} onSource={value=>{if(value!==source){setScene(null);setSource(value)}}} onScenario={value=>{setScene(null);setScenario(value)}}/>;
}
function Workspace({scene,feed,onScenario,onSource,onRestart,preferences}:{preferences:ReturnType<typeof usePreferences>;scene:Scene;feed:LiveFeed|null;onScenario:(scenario:Scenario)=>void;onSource:(source:'replay'|'live')=>void;onRestart:()=>void}){
 const {t,language,number,percent}=useI18n();
 const {match}=scene;const clock=useMemo(()=>feed?.clock??new Playback(match.duration),[match.duration,feed]);const playback=useSyncExternalStore(clock.subscribe,clock.getSnapshot);const second=Math.floor(playback.time);
 const live=useSyncExternalStore(feed?.subscribe??noSubscribe,feed?.getSnapshot??offlineSnapshot);
 useEffect(()=>{feed?.start();return()=>feed?.close()},[feed]);
 const {mode}=preferences.value;const setMode=(mode:Mode)=>preferences.update({mode});
 const favorite=match.players.find(player=>player.name===preferences.value.player);
 const [selected,setSelected]=useState(()=>favorite?.id??7),[layer,setLayer]=useState<Layer>('passes'),[follow,setFollow]=useState(false);
 const [section,setSection]=useState<'overview'|'eventLog'|'notebook'>('overview');
 const notebook=useNotebook(match);
 const [draft,setDraft]=useState<SavedScene|null>(null),[exported,setExported]=useState(false);
 const panelRef=useRef<HTMLDivElement|null>(null),pitchRef=useRef<HTMLDivElement|null>(null);
 const [activeId,setActiveId]=useState<string|null>(null),[insightFocus,setInsightFocus]=useState(false);
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('tl-theme')==='light'?'light':'dark'}catch{return 'dark'}});
 const [questionText,setQuestionText]=useState('');
 const requestAt=useRef<number|null>(null);
 const [explanation,setExplanation]=useState<Explanation|null>(null),[busy,setBusy]=useState(false),[explainError,setExplainError]=useState(''),[aiEnabled,setAiEnabled]=useState(false);
 const pitchApi=useRef<PitchApi|null>(null),request=useRef<AbortController|null>(null),cache=useRef(new Map<string,Explanation>());
 // Finished sessions use the recorded analysis index, still bounded by the received clock.
 const analysisSession=live.status==='complete'||live.status==='expired'?null:feed?.sessionId??null;
 const {data,error}=useAnalysis(playback.time,selected,match.scenario,analysisSession);const p=match.players[selected],stats=data?.player;
 useEffect(()=>{document.documentElement.style.colorScheme=theme;try{localStorage.setItem('tl-theme',theme)}catch{}},[theme]);
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/health',{signal:ctrl.signal}).then(r=>r.json()).then(d=>setAiEnabled(d.ai_enabled)).catch(()=>{});return()=>ctrl.abort()},[]);
 useEffect(()=>{request.current?.abort();setBusy(false);setExplanation(null);setExplainError('')},[selected,language,mode,preferences.value.team]);
 useEffect(()=>{if(requestAt.current!==null&&Math.abs(playback.time-requestAt.current)>.00001){request.current?.abort();requestAt.current=null;setBusy(false);setExplanation(null);setExplainError('')}},[playback.time]);
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>{
  const keydown=(event:KeyboardEvent)=>{
   if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.repeat||!(event.target instanceof HTMLElement)||event.target.closest('input,select,textarea,button,a,summary,[contenteditable=true]'))return;
   if(event.code==='Space'){event.preventDefault();clock.toggle()}
   if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();clock.seek(clock.position()+(event.code==='ArrowLeft'?-5:5))}
  };
  window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
 },[clock]);
 useEffect(()=>setExported(false),[second,language,selected]);
 const inspectEvent=useCallback((event:MatchEvent)=>{setActiveId(null);setSelected(event.player_id);setFollow(false);setLayer('passes');clock.seek(event.time);pitchRef.current?.scrollIntoView({block:'center'})},[clock]);
 function navigate(value:typeof section){setSection(value);requestAnimationFrame(()=>{panelRef.current?.scrollIntoView({block:'nearest'});panelRef.current?.focus({preventScroll:true})})}
 function saveMoment(){
  const at=clock.position();clock.seek(at);
  setDraft({id:crypto.randomUUID(),at:Math.floor(at*10)/10,player:selected,text:'',insightId:activeId});setSection('notebook');
  requestAnimationFrame(()=>panelRef.current?.scrollIntoView({block:'nearest'}));
 }
 function saveScene(){if(draft&&notebook.scenes.length<MAX_SCENES){notebook.add({...draft,text:draft.text.trim()});setDraft(null)}}
 function inspectScene(scene:SavedScene){setSelected(scene.player);setActiveId(scene.insightId);setFollow(false);clock.seek(scene.at);setSection('overview');pitchRef.current?.scrollIntoView({block:'center'})}
 function exportReport(){downloadReport(buildReport(match,clock.position(),playback.available,data,notebook.scenes,language));setExported(true)}
 function inspectEvidence(scene:EvidenceScene){
  if(mode==='fan'&&scene.insight_id&&!insights.some(i=>i.id===scene.insight_id))preferences.update({personal:false});
  setInsightFocus(false);setActiveId(scene.insight_id);setSelected(scene.player_id);setFollow(false);setLayer('passes');setSection('overview');clock.seek(scene.at);pitchRef.current?.scrollIntoView({block:'center'});
 }
 async function explain(question:'player'|'pressing'|'compare'|'switch'|'overload',query=''){
   const at=clock.position();clock.seek(at);requestAt.current=at;
   const playerId=mode==='fan'&&!query&&question!=='player'&&preferences.value.team?match.players.find(p=>p.team===preferences.value.team)!.id:selected;
   const key=`${analysisSession}/${at}/${playerId}/${language}/${mode}/${question}/${query}`;
   request.current?.abort();setExplainError('');setBusy(false);
   const existing=cache.current.get(key);if(existing){setExplanation(existing);return}
   const ctrl=new AbortController();request.current=ctrl;setBusy(true);setExplanation(null);
   try{
    const response=await fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:analysisSession,scenario:match.scenario,at,player_id:playerId,question,query,language,mode}),signal:ctrl.signal});
    if(!response.ok)throw new Error('Explanation unavailable');
    const answer=await response.json() as Explanation;
    if(ctrl.signal.aborted||Math.abs(clock.position()-at)>.00001)return;
    cache.current.set(key,answer);if(cache.current.size>80)cache.current.delete(cache.current.keys().next().value!);setExplanation(answer);
   }catch{if(!ctrl.signal.aborted)setExplainError('failed')}finally{if(!ctrl.signal.aborted)setBusy(false)}
 }
 const insights=useMemo(()=>data?.insights.filter(i=>(!insightFocus||i.player_ids.includes(selected))&&(mode!=='fan'||!preferences.value.personal||(!preferences.value.team&&!favorite)||i.team===preferences.value.team||i.player_ids.includes(favorite?.id??-1)))??[],[data,insightFocus,selected,mode,preferences.value.personal,preferences.value.team,favorite]);
 const active=insights.find(i=>i.id===activeId)??null;
 function inspect(i:TacticalInsight){if(clock.getSnapshot().playing)clock.toggle();setActiveId(i.id);setFollow(false);clock.seek(i.confirmed_at)}
 const possession=data?.possession;
 const possessionLabel=possession?.team==='home'?'Northbridge':possession?.team==='away'?'Riverside':t('unknown');
 const ratio=(n:number,d:number)=>d?percent(n/d*100):'—';
 return <div id="tl"><header><div className="brand"><span className="brandmark" aria-hidden>TL</span>TacticLab</div><span className="tag">{t('matchAnalysis')}</span><span className="topnote"><span className="statusdot"/>{t('syntheticMatch')}</span><LanguagePicker/><Button size="icon" variant="ghost" aria-label={theme==='dark'?t('lightTheme'):t('darkTheme')} onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</Button></header>
 <div className="app-shell"><nav className="workspace-nav" aria-label={t('workspaceNav')}><div className="nav-label">{t('workspace')}</div>{([['overview',LayoutDashboard],['eventLog',ListFilter],['notebook',Bookmark]] as const).map(([value,Icon])=><Button key={value} variant="ghost" aria-controls="analysis-panel" aria-current={section===value?'page':undefined} onClick={()=>navigate(value)}><Icon/><span>{t(value)}</span></Button>)}<div className="nav-foot"><span className="statusdot"/>{t('syntheticMatch')}</div></nav><div className="workspace-content">
 <div className="commandbar"><div className="breadcrumb">TacticLab <span>/</span> <strong>{t(section)}</strong></div><div className="command-actions"><Button onClick={saveMoment} disabled={notebook.scenes.length>=MAX_SCENES}><Bookmark/>{t('saveMoment')}</Button><Button variant="primary" onClick={exportReport} disabled={!data||data.at!==second} title={t('exportHint')}><Download/>{t('exportReport')}</Button></div><span className="export-feedback" role="status">{exported?t('exportDone'):''}</span></div>
 <div className="matchbar"><div><div className="eyebrow" style={{marginBottom:10}}>{t('matchContext')}</div><div className="score"><span className="badge">NTH</span>Northbridge<strong>1–0</strong>Riverside<span className="badge away">RIV</span></div></div><label className="scenario-label">{t('scenario')}<select aria-label={t('matchScenario')} value={match.scenario} onChange={e=>onScenario(e.target.value as Scenario)}><option value="standard">{t('scenario.standard')}</option><option value="variation">{t('scenario.variation')}</option><option value="control">{t('scenario.control')}</option><option value="tactics">{t('scenario.tactics')}</option></select></label><div className="switch" aria-label={t('detailLevel')}><Button aria-pressed={mode==='analyst'} onClick={()=>setMode('analyst')}>{t('analyst')}</Button><Button aria-pressed={mode==='fan'} onClick={()=>setMode('fan')}>{t('fan')}</Button></div></div>
 <Personalization value={preferences.value} temporary={preferences.temporary} players={match.players} onChange={preferences.update} onPlayer={id=>{setSelected(id);setFollow(true);setActiveId(null)}}/>
 <div className="sourcebar"><div className="switch" aria-label={t('source')}><Button aria-pressed={!feed} onClick={()=>onSource('replay')}>{t('recordedReplay')}</Button><Button aria-pressed={!!feed} onClick={()=>onSource('live')}>{t('liveSimulation')}</Button></div><span className="muted">{t(feed?'liveSourceNote':'replaySourceNote')}</span></div>
 <div className="layout"><main className="workspace"><div className="pitchtools"><div className="group" aria-label={t('layers')}>{([['passes','passes'],['pressure','pressure'],['runs','runs']] as const).map(([value,label])=><Button key={value} aria-pressed={layer===value} onClick={()=>setLayer(layer===value?'none':value)}>{t(label)}</Button>)}</div><div className="group"><Button size="icon" aria-label={t('zoomOut')} onClick={()=>pitchApi.current?.zoomOut()}><Minus/></Button><Button size="icon" aria-label={t('zoomIn')} onClick={()=>pitchApi.current?.zoomIn()}><Plus/></Button><Button onClick={()=>pitchApi.current?.reset()}><RotateCcw/>{t('wholePitch')}</Button></div></div>
 <div className="pitchbox" ref={pitchRef}><div className="pitchhead"><span>{t('attackDirection')}</span><span>{follow?t('playerFocus'):active?t(active.kind==='local_overload'?'markedZone':'markedPass'):t('buildUp')}</span></div><Pitch scene={scene} clock={clock} selected={selected} insight={active} layer={layer} follow={follow} onSelect={setSelected} onManual={()=>setFollow(false)} api={pitchApi}/></div>
 <div className="possession-strip" aria-label={t('possession')} data-testid="possession"><span>{t('possession')} <strong>{possessionLabel}</strong></span><span>{possession?.status==='in_flight'?t('inFlight'):possession?.player_id!=null?match.players.find(p=>p.id===possession.player_id)?.name:t('uncontrolled')}</span>{possession?.team&&<span>{t('phase',{phase:possession.phase_id,seconds:Math.round(possession.duration)})}</span>}</div>
 <div className="legend"><span><i className="dot"/>Northbridge</span><span><i className="dot blue"/>Riverside</span><span className="muted">{t('selection',{name:p.name.split(' ').at(-1)??p.name,number:p.number})}</span></div>
 {feed&&<div className="live-status" data-testid="live-status" data-status={live.status}><div className="live-summary"><strong className={live.status==='receiving'?'receiving':''}>{t(`feed.${live.status}`)}</strong><span>{t('receivedAt',{time:formatTime(live.received)})} · <span data-testid="received-events">{t('receivedEvents',{count:live.events})}</span></span></div><div className="live-actions"><span data-testid="view-mode">{t(playback.following?'followingLive':'bufferedReplay',{seconds:Math.max(0,live.received-playback.time)})}</span>{!playback.ended&&<Button disabled={playback.following||live.status==='expired'} onClick={clock.backToLive}>{t('backToLive')}</Button>}{(live.status==='reconnecting'||live.status==='failed')&&<Button onClick={feed.retry}>{t('reconnect')}</Button>}{(live.status==='expired'||live.status==='complete')&&<Button onClick={onRestart}>{t('newSimulation')}</Button>}</div><div className="live-note">{t(live.status==='expired'?'expiredNote':'liveReplayNote')}</div></div>}
 <div className="replay"><div className="transport"><Button variant="primary" size="icon" onClick={clock.toggle} aria-label={playback.playing?t('pause'):t('play')}>{playback.playing?<Pause/>:<Play/>}</Button><Button size="icon" variant="ghost" aria-label={t('backFive')} onClick={()=>clock.seek(clock.position()-5)}><SkipBack/></Button><Button size="icon" variant="ghost" aria-label={t('forwardFive')} onClick={()=>clock.seek(clock.position()+5)}><SkipForward/></Button><span className="clock" data-testid="clock">{formatTime(playback.time)}</span><span className="muted">/ {formatTime(feed?playback.available:match.duration)}</span><label className="speed-label">{t('speed')}<select aria-label={t('playbackSpeed')} disabled={!!feed&&playback.following} value={playback.speed} onChange={e=>clock.setSpeed(Number(e.target.value))}><option value="0.5">{number(0.5)}×</option><option value="1">{t('realTime')}</option><option value="2">2×</option><option value="4">4×</option></select></label></div><input className="range" type="range" min={0} max={playback.available} disabled={playback.available===0} step={.1} value={playback.time} onChange={e=>clock.seek(Number(e.target.value))} aria-label={t('matchTime')}/><div className="ticks">{(feed?[0,playback.available/2,playback.available]:[0,match.duration/4,match.duration/2,match.duration*.75,match.duration]).map((time,index)=><span key={index}>{formatTime(time)}</span>)}</div></div>
 <div className="analysis-panel" id="analysis-panel" tabIndex={-1} ref={panelRef}>
 {section==='overview'&&<TacticalInsights personalized={mode==='fan'&&preferences.value.personal&&!!(preferences.value.team||favorite)} insights={insights} active={active} mode={mode} players={match.players} focused={insightFocus} onFocus={()=>setInsightFocus(v=>!v)} onSelect={inspect} onClear={()=>setActiveId(null)}/>}
 {section==='eventLog'&&<EventExplorer match={match} at={second} eventCount={match.events.length} selected={selected} onInspect={inspectEvent}/>}
 {section==='notebook'&&<Notebook match={match} scenes={notebook.scenes} available={playback.available} temporary={notebook.temporary} draft={draft} onDraft={setDraft} onSave={saveScene} onInspect={inspectScene} onRemove={notebook.remove}/>}
 </div>
 <div className="method-note">{t('method')}</div>
 </main><aside aria-label={t('playerAnalysis')}><div className="sidehead">{t('playerFocus')}<span>{t('upTo',{time:formatTime(data?.at??second)})}</span></div><div className="profile"><div className="playerline" aria-live="polite"><div className="jersey" style={{background:p.team==='away'?'#165de0':'var(--green)'}}>{p.number}</div><div><strong>{p.name}</strong><span className="muted">{t(`role.${p.role}`)} · {p.team==='home'?'NTH':'RIV'}</span></div></div><select aria-label={t('selectPlayer')} value={selected} onChange={e=>setSelected(Number(e.target.value))}>{match.players.map(player=><option key={player.id} value={player.id}>{player.number} · {player.name} · {player.team==='home'?'NTH':'RIV'}</option>)}</select>
 {error?<p role="alert" className="error-message">{t('error.analysis')}</p>:<><div className="stats"><div className="stat"><strong data-testid="progressive">{stats?.progressive??'—'}</strong><span>{mode==='fan'?t('gainingPasses'):t('progressive')}</span></div><div className="stat"><strong>{stats?.accuracy!=null?percent(stats.accuracy):'—'}</strong><span>{mode==='fan'?t('passesArrived'):t('accuracy')}</span></div></div><div className="sample">{t('attempts',{count:stats?.attempts??0})}</div></>}
 <Button className="follow" aria-pressed={follow} onClick={()=>setFollow(!follow)}><Focus/>{follow?t('unfollow'):t('follow')}</Button><hr/><h3>{t('underPressure')}</h3><div className="barrow"><div className="barlabel"><span>{t('successfulPasses')}</span><span>{stats?`${stats.pressure_completed} / ${stats.pressure_attempts}`:'—'}</span></div><div className="track"><i style={{width:stats?.pressure_attempts?`${stats.pressure_completed/stats.pressure_attempts*100}%`:'0%'}}/></div></div><div className="barrow"><div className="barlabel"><span>{t('forwardPasses')}</span><span>{stats?ratio(stats.forward,stats.attempts):'—'}</span></div><div className="track"><i style={{width:stats?.attempts?`${stats.forward/stats.attempts*100}%`:'0%'}}/></div></div>
 {mode==='analyst'&&data&&<><hr/><h3>{p.team==='home'?'Northbridge':'Riverside'} · {t('progressive')}</h3><Suspense fallback={<div className="comparison-chart chart-loading">{t('chartLoading')}</div>}><Comparison data={data.comparison}/></Suspense><p className="sample">{t('comparisonNote')}</p></>}
 </div><div className="insight"><div className="eyebrow">{t('assistant')}</div><h2>{t('understand')}</h2><p className="sample">{t(mode==='fan'&&preferences.value.team?'fanAssistantHint':'assistantHint')}</p><form className="assistant-form" onSubmit={e=>{e.preventDefault();if(questionText.trim())void explain('player',questionText.trim())}}><label htmlFor="analysis-question">{t('questionLabel')}</label><textarea id="analysis-question" maxLength={240} rows={2} value={questionText} onChange={e=>setQuestionText(e.target.value)} placeholder={t('questionPlaceholder')}/><Button type="submit" variant="primary" disabled={busy||!questionText.trim()}>{t('askQuestion')}</Button></form><div className="question-list"><Button disabled={busy} onClick={()=>explain('switch')}>{t('explainSwitch')}<ArrowUpRight/></Button><Button disabled={busy} onClick={()=>explain('overload')}>{t('explainOverload')}<ArrowUpRight/></Button><Button disabled={busy} onClick={()=>explain('pressing')}>{t('explainPressing')}<ArrowUpRight/></Button><Button disabled={busy} onClick={()=>explain('player')}>{t('explainPlayer')}<ArrowUpRight/></Button>{mode==='analyst'&&<Button disabled={busy} onClick={()=>explain('compare')}>{t('comparePhases')}<ArrowUpRight/></Button>}</div><div aria-live="polite">{busy&&<p><LoaderCircle className="spin inline-icon"/>{t('analysing')}</p>}{explainError&&<p role="alert">{t('error.explanation')}</p>}{explanation?.language===language&&explanation.mode===mode&&<><p className="sample" data-testid="answer-context">{explanation.context}</p><p className="explanation">{explanation.text}</p><div className="assistant-evidence" aria-label={t('sceneEvidence')}>{explanation.scenes.map(scene=><Button key={scene.id} className="evidence-scene" onClick={()=>inspectEvidence(scene)}><span>{formatTime(scene.end,match.start_minute)} · {scene.title}</span><small>{scene.reason}</small><span className="sample">{t('openEvidence',{time:formatTime(scene.at,match.start_minute)})} ↗</span></Button>)}</div>{explanation.notice&&<p>{explanation.notice}</p>}</>}</div><div className="muted ai-status">{explanation?.source==='azure'?t('azureResult'):aiEnabled?t('azureEnabled'):t('localResult')}</div></div></aside></div>
 <footer><span>{t('version')}</span><span>{t('shortcuts')}</span></footer></div></div></div>
}


