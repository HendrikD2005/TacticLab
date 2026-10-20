import type {ReactNode} from 'react';
import {Button} from './button';

interface Option<T extends string>{value:T;label:ReactNode;disabled?:boolean}
interface Props<T extends string>{
  label:string;
  value:T;
  options:readonly Option<T>[];
  onChange:(value:T)=>void;
  className?:string;
}

/** A labelled set of native toggle buttons. Tab/Space/Enter retain native behavior. */
export function SegmentedControl<T extends string>({label,value,options,onChange,className=''}:Props<T>){
  return <div className={`ui-segments ${className}`.trim()} role="group" aria-label={label}>
    {options.map(option=><Button key={option.value} variant="ghost"
      aria-pressed={value===option.value} disabled={option.disabled}
      onClick={()=>onChange(option.value)}>{option.label}</Button>)}
  </div>;
}
