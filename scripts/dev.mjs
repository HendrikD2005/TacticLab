import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const python=path.join(root,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
if(!existsSync(python)){console.error('Missing .venv. Follow README.md setup instructions.');process.exit(1)}
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();setTimeout(()=>process.exit(code),200)}
function run(command,args){const child=spawn(command,args,{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONUNBUFFERED:'1'}});children.push(child);child.on('error',e=>{console.error(e.message);stop(1)});child.on('exit',code=>{if(!stopping)stop(code??1)});}
run(python,['-m','uvicorn','app.main:app','--app-dir','backend','--host','127.0.0.1','--port','8000']);
run(process.execPath,[path.join(root,'frontend/node_modules/vite/bin/vite.js'),'--config','frontend/vite.config.ts','--host','127.0.0.1','--port','5173','--strictPort','frontend']);
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
