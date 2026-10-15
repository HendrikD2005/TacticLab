import {useEffect,useState} from 'react';
import type {Analysis} from '@/lib/types';
export function useAnalysis(at:number,player:number){
 const [data,setData]=useState<Analysis|null>(null);const [error,setError]=useState('');
 const second=Math.floor(at);
 useEffect(()=>{const controller=new AbortController();setError('');fetch(`/api/analysis?at=${second}&player_id=${player}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Analyse konnte nicht geladen werden.');return r.json()}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[second,player]);
 // Never display a response belonging to another player or a future replay time.
 return {data:data?.player_id===player&&data.at<=second?data:null,error};
}
