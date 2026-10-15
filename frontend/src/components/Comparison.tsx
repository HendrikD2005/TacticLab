import {memo,useMemo} from 'react';
import {Bar,BarChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {useI18n} from '@/i18n';
import type {Analysis} from '@/lib/types';
export default memo(function Comparison({data}:{data:Analysis['comparison']}){
 const {t,number}=useI18n();
 const translated=useMemo(()=>data.map((row,index)=>({...row,label:t(index===0?'firstPeriod':'secondPeriod')})),[data,t]);
 return <div className="comparison-chart" role="img" aria-label={t('chartLabel',{first:data[0].progressive,second:data[1].progressive})}>
  <ResponsiveContainer width="100%" height={115}><BarChart data={translated} margin={{left:-25,right:10,bottom:0,top:10}}>
   <XAxis dataKey="label" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/>
   <YAxis allowDecimals={false} tickFormatter={number} tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/>
   <Tooltip cursor={{fill:'var(--soft)'}} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',color:'var(--text)',fontSize:12}}/>
   <Bar dataKey="progressive" name={t('progressive')} fill="#2873ff" maxBarSize={34} isAnimationActive={false}/>
  </BarChart></ResponsiveContainer>
 </div>;
});
