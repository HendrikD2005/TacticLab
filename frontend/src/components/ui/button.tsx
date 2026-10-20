import {forwardRef,type ButtonHTMLAttributes} from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'default' | 'icon';
}

/** Native button semantics, shared Swiss tokens, no component-library runtime. */
export const Button = forwardRef<HTMLButtonElement,ButtonProps>(function Button(
  {className='',variant='default',size='default',type='button',...props}, ref,
){
  return <button
    ref={ref}
    type={type}
    className={`ui-button ui-button-${variant}${size==='icon'?' ui-button-icon':''} ${className}`.trim()}
    {...props}
  />;
});
