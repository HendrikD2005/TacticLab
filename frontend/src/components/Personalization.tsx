import {useI18n} from '@/i18n';
import {Button} from './ui/button';
import type {Player} from '@/lib/types';
import type {Preferences} from '@/lib/preferences';
interface Props{value:Preferences;temporary:boolean;players:Player[];onChange:(patch:Partial<Preferences>)=>void;onPlayer:(id:number)=>void}
export default function Personalization({value,temporary,players,onChange,onPlayer}:Props){
 const {t}=useI18n();const favorite=players.find(p=>p.name===value.player);
 return <section className="personalization" aria-label={t('preferences')}>
 <div className="personalization-fields"><label>{t('favoriteTeam')}<select aria-label={t('favoriteTeam')} value={value.team??''} onChange={e=>onChange({team:(e.target.value||null) as Preferences['team']})}><option value="">{t('noFavorite')}</option><option value="home">Northbridge</option><option value="away">Riverside</option></select></label>
 <label>{t('favoritePlayer')}<select aria-label={t('favoritePlayer')} value={favorite?.name??''} onChange={e=>onChange({player:e.target.value||null})}><option value="">{t('noFavorite')}</option>{players.map(p=><option key={p.id} value={p.name}>{p.name} · {p.team==='home'?'NTH':'RIV'}</option>)}</select></label>
 {favorite&&<Button onClick={()=>onPlayer(favorite.id)}>{t('watchFavorite')}</Button>}
 {value.mode==='fan'&&(value.team||favorite)&&<Button aria-pressed={value.personal} onClick={()=>onChange({personal:!value.personal})}>{t('favoriteMoments')}</Button>}</div>
 <p className="sample">{t(value.mode==='fan'?'fanPreferenceHint':'preferenceHint')}{temporary&&<> {t('preferencesTemporary')}</>}</p>
 </section>;
}
