import {SectionHeading} from '@/components/ui/editorial';
import {Textarea} from '@/components/ui/fields';
import {Bookmark,Trash2} from 'lucide-react';
import {useI18n} from '@/i18n';
import {Button} from './ui/button';
import {formatTime,type Match} from '@/lib/types';
import {MAX_SCENES,type SavedScene} from '@/lib/notebook';
interface Props{match:Match;scenes:SavedScene[];available:number;temporary:boolean;draft:SavedScene|null;onDraft:(scene:SavedScene|null)=>void;onSave:()=>void;onInspect:(scene:SavedScene)=>void;onRemove:(id:string)=>void}
export default function Notebook({match,scenes,available,temporary,draft,onDraft,onSave,onInspect,onRemove}:Props){
 const {t}=useI18n();
 return <section aria-label={t('notebook')}>
  <SectionHeading index="04" title={t('notebook')} description={t(temporary?'temporaryNotes':'localNotes')} actions={<span className="count-badge">{scenes.length} / {MAX_SCENES}</span>}/>
  {draft&&<form className="note-editor" onSubmit={e=>{e.preventDefault();onSave()}}><div className="note-context"><Bookmark size={16}/>{formatTime(draft.at,match.start_minute)} · {match.players.find(p=>p.id===draft.player)?.name}</div><label htmlFor="scene-note">{t('sceneNote')}</label><Textarea id="scene-note" autoFocus rows={3} maxLength={1000} value={draft.text} placeholder={t('notePlaceholder')} onChange={e=>onDraft({...draft,text:e.target.value})}/><div className="note-actions"><span>{draft.text.length} / 1000</span><Button type="button" onClick={()=>onDraft(null)}>{t('cancel')}</Button><Button variant="primary" type="submit" disabled={scenes.length>=MAX_SCENES}>{t('saveScene')}</Button></div></form>}
  {scenes.length===0&&!draft?<div className="empty-state"><Bookmark/><h3>{t('noScenes')}</h3><p>{t('noScenesHint')}</p></div>:<div className="saved-scenes">{[...scenes].reverse().map(scene=>{
   const locked=scene.at>available;
   return <article className="saved-scene" key={scene.id}><Button className="scene-open" disabled={locked} onClick={()=>onInspect(scene)}><span><time>{formatTime(scene.at,match.start_minute)}</time><strong>{locked?t('scenePending'):match.players.find(p=>p.id===scene.player)?.name}</strong></span><p>{locked?t('scenePendingHint'):scene.text||t('untitledScene')}</p></Button><Button size="icon" variant="ghost" aria-label={t('deleteScene',{time:formatTime(scene.at,match.start_minute)})} onClick={()=>onRemove(scene.id)}><Trash2/></Button></article>;
  })}</div>}
  {scenes.length>=MAX_SCENES&&<p role="status">{t('notebookFull')}</p>}
 </section>;
}
