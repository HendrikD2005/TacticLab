import {useState} from 'react';
import type {Match} from './types';

export interface SavedScene {id:string;at:number;player:number;text:string;insightId:string|null}
export const MAX_SCENES=100;
export function readScenes(raw:string|null,match:Match):SavedScene[]{
 try{
  const parsed:unknown=JSON.parse(raw??'[]');
  if(!Array.isArray(parsed))return [];
  const ids=new Set<string>();
  return parsed.filter((item):item is SavedScene=>{
   if(!item||typeof item.id!=='string'||ids.has(item.id)||!Number.isFinite(item.at)||item.at<0||item.at>match.duration||!match.players.some(p=>p.id===item.player)||typeof item.text!=='string'||item.text.length>1000||!(item.insightId===null||typeof item.insightId==='string'))return false;
   ids.add(item.id);return true;
  }).slice(0,MAX_SCENES);
 }catch{return []}
}
export function useNotebook(match:Match){
 const key=`tl-scenes:v1:${match.id}:${match.scenario}`;
 const [state,setState]=useState(()=>{
  try{return {scenes:readScenes(localStorage.getItem(key),match),temporary:false}}
  catch{return {scenes:[] as SavedScene[],temporary:true}}
 });
 function update(scenes:SavedScene[]){
  let temporary=false;
  try{localStorage.setItem(key,JSON.stringify(scenes))}catch{temporary=true}
  setState({scenes,temporary});
 }
 return {...state,add:(scene:SavedScene)=>update([...state.scenes,scene].slice(0,MAX_SCENES)),remove:(id:string)=>update(state.scenes.filter(s=>s.id!==id))};
}
