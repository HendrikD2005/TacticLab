import type {ReactNode} from 'react';

export function SectionHeading({index,title,description,actions}:{
  index?:string;title:ReactNode;description?:ReactNode;actions?:ReactNode;
}){
  return <div className="ui-section-heading">
    <div className="ui-section-title">
      {index&&<span className="ui-section-index" aria-hidden="true">{index}</span>}
      <div><h2>{title}</h2>{description&&<p className="sample">{description}</p>}</div>
    </div>
    {actions&&<div className="ui-section-actions">{actions}</div>}
  </div>;
}

export function Stat({value,label,testId}:{value:ReactNode;label:ReactNode;testId?:string}){
  return <div className="stat"><strong data-testid={testId}>{value}</strong><span>{label}</span></div>;
}

export function StatusLabel({children,live=false}:{children:ReactNode;live?:boolean}){
  return <span className={`ui-status${live?' is-live':''}`}><i aria-hidden="true"/>{children}</span>;
}
