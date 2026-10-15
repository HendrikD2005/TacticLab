import {useEffect,useState} from 'react';
import {useI18n} from '@/i18n';
import type {Analysis,Scenario} from '@/lib/types';
export function useAnalysis(at:number,player:number,scenario:Scenario){
 const {language}=useI18n();
 const [data,setData]=useState<Analysis|null>(null);const [error,setError]=useState('');
 const second=Math.floor(at);
 useEffect(()=>{const controller=new AbortController();setError('');fetch(`/api/analysis?at=${second}&player_id=${player}&scenario=${scenario}&language=${language}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Analysis unavailable');return r.json()}).then(setData).catch(e=>{if(e.name!=='AbortError')setError('failed')});return()=>controller.abort()},[second,player,scenario,language]);
 // Never display a response belonging to another player or a future replay time.
 return {data:data?.language===language&&data.scenario===scenario&&data.player_id===player&&data.at<=second?data:null,error};
}
