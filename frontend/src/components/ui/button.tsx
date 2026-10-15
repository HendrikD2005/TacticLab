import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants=cva('ui-button',{variants:{variant:{default:'',primary:'ui-button-primary',ghost:'ui-button-ghost'},size:{default:'',icon:'ui-button-icon'}},defaultVariants:{variant:'default',size:'default'}});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof buttonVariants>{asChild?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,size,asChild=false,type='button',...props},ref)=>{const Comp=asChild?Slot:'button';return <Comp type={type} ref={ref} className={cn(buttonVariants({variant,size,className}))} {...props}/>});
Button.displayName='Button';
