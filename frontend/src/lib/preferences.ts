import {useState} from 'react';
import type {Mode} from './types';
export interface Preferences {team:'home'|'away'|null;player:string|null;mode:Mode;personal:boolean}
const defaults:Preferences={team:null,player:null,mode:'analyst',personal:true};
export function readPreferences(raw:string|null):Preferences{
 try{const p=JSON.parse(raw??'null');if(!p||typeof p!=='object')return {...defaults};return {team:p.team==='home'||p.team==='away'?p.team:null,player:typeof p.player==='string'&&p.player.length<=100?p.player:null,mode:p.mode==='fan'?'fan':'analyst',personal:p.personal!==false}}catch{return {...defaults}}
}
export function usePreferences(){
 const [state,setState]=useState(()=>{try{return {value:readPreferences(localStorage.getItem('tl-preferences:v1')),temporary:false}}catch{return {value:{...defaults},temporary:true}}});
 function update(patch:Partial<Preferences>){const value={...state.value,...patch};let temporary=false;try{localStorage.setItem('tl-preferences:v1',JSON.stringify(value))}catch{temporary=true}setState({value,temporary})}
 return {...state,update};
}
