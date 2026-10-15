import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import en from './en.json';
import de from './de.json';

export type Language='en'|'de';
export type TranslationKey=keyof typeof en;
type Message=string|{one:string;other:string};
type Params=Record<string,string|number>;
const catalogs:Record<Language,Record<TranslationKey,Message>>={en,de};
const STORAGE_KEY='tl-language';
function initialLanguage():Language {
 try {return localStorage.getItem(STORAGE_KEY)==='de'?'de':'en'} catch {return 'en'}
}
function createFormatters(language:Language){
 const locale=language==='de'?'de-DE':'en-GB';
 const numbers=new Intl.NumberFormat(locale,{maximumFractionDigits:1});
 const percentages=new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:0});
 const plurals=new Intl.PluralRules(locale);
 const number=(value:number)=>numbers.format(value);
 const percent=(value:number)=>percentages.format(value/100);
 const t=(key:TranslationKey,params:Params={})=>{
  const message=catalogs[language][key]??catalogs.en[key];
  const template=typeof message==='string'?message:message[plurals.select(Number(params.count))==='one'?'one':'other'];
  return template.replace(/\{(\w+)\}/g,(placeholder,key:string)=>{
   const value=params[key];return value===undefined?placeholder:typeof value==='number'?number(value):value;
  });
 };
 return {t,number,percent};
}
type I18n=ReturnType<typeof createFormatters>&{language:Language;setLanguage:(language:Language)=>void};
const Context=createContext<I18n|null>(null);
export function I18nProvider({children}:{children:ReactNode}){
 const [language,setLanguage]=useState<Language>(initialLanguage);
 const value=useMemo(()=>({language,setLanguage,...createFormatters(language)}),[language]);
 useEffect(()=>{
  document.documentElement.lang=language;
  document.title=value.t('app.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content',value.t('app.description'));
  try{localStorage.setItem(STORAGE_KEY,language)}catch{/* Storage is optional, e.g. private browsing. */}
 },[language,value]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n(){
 const value=useContext(Context);if(!value)throw new Error('I18nProvider is required');return value;
}
export function LanguagePicker(){
 const {language,setLanguage,t}=useI18n();
 return <select className="language-picker" aria-label={t('language')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en">English</option><option value="de">Deutsch</option></select>;
}
