'use client';
import {useEffect,useRef,useState} from 'react';
type Msg={id:number;seat:number;body:string;created_at:string};
const endpoint=process.env.NEXT_PUBLIC_PRIVATE_CHAT_FUNCTION_URL||'';
const funnyNames=['Disco Turnip','Waffle Badger','Captain Teacup','Mischief Muffin','Cosmic Potato','Biscuit Bandit','Dancing Parsnip','Noodle Wizard','Cheeky Puffin','Soggy Crumpet','Pickle Penguin','Moonlight Muppet'];
function chatName(seat:number){const day=Math.floor(Date.now()/86400000);return funnyNames[(day*7+seat*5)%funnyNames.length];}
export default function PrivateChat(){
 const [code,setCode]=useState(''),[token,setToken]=useState(''),[seat,setSeat]=useState(0),[alias,setAlias]=useState(''),[messages,setMessages]=useState<Msg[]>([]),[body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false);
 const bottom=useRef<HTMLDivElement>(null);
 async function call(action:string,extra:Record<string,unknown>={}){const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,token,...extra}),cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error||'Something went wrong');return data;}
 async function join(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const data=await call('join',{code});setToken(data.token);setSeat(data.seat);setAlias(data.alias);setCode('');}catch(e){setError(e instanceof Error?e.message:'Unable to join');}finally{setBusy(false);}}
 useEffect(()=>{if(!token||blocked)return;let active=true;const poll=async()=>{try{const data=await call('messages');if(active){setMessages(data.messages);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load');}};void poll();const id=setInterval(()=>void poll(),2000);return()=>{active=false;clearInterval(id);};},[token,blocked]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'end'});},[messages.length]);
 async function send(e:React.FormEvent){e.preventDefault();if(!body.trim()||busy)return;setBusy(true);setError('');try{await call('send',{body});setBody('');const data=await call('messages');setMessages(data.messages);}catch(e){setError(e instanceof Error?e.message:'Unable to send');}finally{setBusy(false);}}
 async function report(id:number){const reason=window.prompt('Why are you reporting this message?');if(!reason)return;try{await call('report',{message_id:id,reason});window.alert('Report saved for review.');}catch(e){setError(e instanceof Error?e.message:'Unable to report');}}
 function leave(){setToken('');setMessages([]);setBlocked(false);setError('');}
 if(!endpoint)return <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-3xl font-bold">Private chat is not connected yet</h1><p className="mt-4">The owner must configure the Supabase Edge Function and Cloudflare public endpoint before private testing can begin.</p></main>;
 if(!token)return <main className="mx-auto max-w-lg px-5 py-14"><span className="text-sm font-bold text-[#346a4a]">LONELY NO LONGER · PRIVATE TEST</span><h1 className="mt-4 font-serif text-4xl font-bold">Come on in.</h1><p className="mt-3 text-[#52675a]">A quiet place to chat, just for two invited adults.</p><form onSubmit={join} className="mt-8 space-y-4"><label htmlFor="invite" className="block font-semibold">Your invitation code</label><input id="invite" type="password" autoComplete="off" required value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-lg border border-[#b7c9bb] bg-white p-4" placeholder="Enter your private code"/><button className="btn" disabled={busy}>Enter chat</button></form>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}<p className="mt-8 text-sm text-[#52675a]">Private test only. Not independently age verified. Do not share personal information.</p></main>;
 return <main className="fixed inset-0 z-50 flex flex-col bg-[#fbfaf5] text-[#243b2e]" style={{height:'100dvh'}}>
  <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#d6e1d5] bg-[#eaf1e6] px-5 py-4 sm:px-8">
   <div className="min-w-0"><p className="text-base font-bold text-[#174a34]">☘ Lonely No Longer <span className="ml-2 text-xs font-normal text-[#66816d]">Private chat</span></p><p className="mt-0.5 text-xs text-[#587260]">Your chat name: {chatName(seat)} · Two invited testers · Text only</p></div>
   <div className="flex items-center gap-2"><button type="button" onClick={()=>setBlocked(true)} className="rounded-md border border-[#cbd9ca] px-3 py-2 text-sm hover:bg-[#e8eee6]">Block</button><button type="button" onClick={leave} className="rounded-md bg-[#185435] px-4 py-2 text-sm font-semibold text-white hover:bg-[#103a26]">Leave</button></div>
  </header>
  {blocked?<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"><h2 className="text-2xl font-bold">Conversation hidden</h2><p>Blocking hides this conversation on your device only. It does not prevent the other tester from sending messages.</p><button type="button" className="btn" onClick={()=>setBlocked(false)}>Show conversation</button><button type="button" className="text-sm underline" onClick={leave}>Leave chat</button></div>:<>
   <section aria-label="Conversation" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#fbfaf5] to-[#f6f7ef] px-4 py-6 sm:px-8 sm:py-8">
    {messages.length===0&&<div className="mt-8 max-w-xl text-left"><p className="text-xl font-semibold text-[#345d42]">A little company goes a long way ☕</p><p className="mt-2 text-sm text-[#6a7c6e]">A fresh chat, a funny name, and someone to talk to. Say hello!</p></div>}
    <div className="w-full space-y-0">
    {messages.map((m,i)=>{const mine=m.seat===seat;const previous=messages[i-1];const showName=!previous||previous.seat!==m.seat;return <div key={m.id} className={'flex w-full flex-col '+(mine?'items-end':'items-start')+(showName?' mt-5':' mt-1.5')}>
     {showName&&<div className={'mb-1.5 flex items-center gap-2 px-2 text-xs font-semibold '+(mine?'text-[#3c7152]':'text-[#a45d38]')}><span className={'flex h-6 w-6 items-center justify-center rounded-full text-[11px] '+(mine?'bg-[#d5e9d8]':'bg-[#f5e0cb]')}>{mine?'☘':'☕'}</span><span>{chatName(m.seat)}</span>{mine&&<span className="font-normal text-[#778c7c]">· you</span>}</div>}
     <div className={'group flex max-w-[88%] items-end gap-2 sm:max-w-[72%] '+(mine?'flex-row-reverse':'flex-row')}>
      <div className={'min-w-0 whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed shadow-sm sm:text-base '+(mine?'rounded-[20px] rounded-br-[6px] bg-[#226343] text-white':'rounded-[20px] rounded-bl-[6px] border border-[#e4dfd4] bg-white text-[#293a2d]')}>{m.body}</div>
      {!mine&&<button type="button" onClick={()=>void report(m.id)} className="shrink-0 px-1 text-xs text-[#6a7c6e] underline opacity-70 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Report this message">Report</button>}
     </div>
    </div>;})}
    <div ref={bottom}/>
    </div>
   </section>
   {error&&<p role="alert" className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
   <form onSubmit={send} className="flex shrink-0 items-end gap-3 border-t border-[#d6e1d5] bg-[#eaf1e6] px-4 py-4 sm:px-8">
    <label htmlFor="chat-message" className="sr-only">Type a message</label><textarea id="chat-message" rows={2} maxLength={500} value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} className="max-h-36 min-h-[54px] min-w-0 flex-1 resize-none rounded-md border border-[#b9cdbb] bg-[#fffefb] px-4 py-3 text-base shadow-sm" placeholder="Type a message… (Enter to send)" />
    <button type="submit" className="min-h-[54px] rounded-lg bg-[#185435] px-5 font-semibold text-white disabled:opacity-50 sm:px-8" disabled={busy||!body.trim()}>Send</button>
   </form>
   <p className="shrink-0 bg-[#eaf1e6] px-4 pb-2 text-center text-[11px] text-[#6a7c6e]">Private test · Basic filtering only · No live moderator · Emergency: 112 / 999</p>
  </>}
 </main>;
}
