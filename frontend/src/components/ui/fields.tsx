import {forwardRef,type InputHTMLAttributes,type SelectHTMLAttributes,type TextareaHTMLAttributes} from 'react';
import {ChevronDown} from 'lucide-react';

export const Select = forwardRef<HTMLSelectElement,SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  {className='',children,...props},ref,
){
  return <span className={`ui-select ${className}`.trim()} data-disabled={props.disabled||undefined}>
    <select ref={ref} {...props}>{children}</select>
    <ChevronDown aria-hidden="true" focusable="false"/>
  </span>;
});

export const Input = forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function Input(
  {className='',...props},ref,
){
  return <input ref={ref} className={`ui-input ${className}`.trim()} {...props}/>;
});

export const Textarea = forwardRef<HTMLTextAreaElement,TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  {className='',...props},ref,
){
  return <textarea ref={ref} className={`ui-textarea ${className}`.trim()} {...props}/>;
});

export const Slider = forwardRef<HTMLInputElement,Omit<InputHTMLAttributes<HTMLInputElement>,'type'>>(function Slider(
  {className='',...props},ref,
){
  return <input ref={ref} type="range" className={`range ${className}`.trim()} {...props}/>;
});
