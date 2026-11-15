'use client';
import {useState} from 'react';
export default function Home(){
 const [adult,setAdult]=useState(false),[kind,setKind]=useState(false);
 return <main className="mx-auto max-w-4xl px-5 py-12 sm:py-20">
 <span className="rounded-full bg-[#e5efdf] px-4 py-2 text-sm font-bold text-[#205338]">☘ A little company goes a long way</span>
 <h1 className="mt-6 font-serif text-4xl font-bold text-[#153f30] sm:text-6xl">A good chat can change your day.</h1>
 <p className="mt-5 max-w-2xl text-lg text-[#52675a]">No profiles. No awkward introductions. Just two people, a little kindness, and maybe a laugh over a cup of tea.</p>
 <section className="mt-10 rounded-3xl border border-[#cddcc9] bg-white p-6 shadow-sm sm:p-9">
 <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold text-[#153f30]">Before you say hello ☕</h2><span className="rounded-full bg-[#fae9d9] px-3 py-1 text-xs font-bold">Preview only</span></div>
 <p className="mt-3 text-[#52675a]">Please read and agree to our ground rules.</p>
 <label className="mt-6 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)} className="mt-1 h-5 w-5 accent-[#185435]"/><span><strong>I confirm that I am 18 or older.</strong><span className="block text-sm text-[#52675a]">This is self-declaration, not independent age verification.</span></span></label>
 <label className="mt-5 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={kind} onChange={e=>setKind(e.target.checked)} className="mt-1 h-5 w-5 accent-[#185435]"/><span><strong>I'll treat people with respect.</strong><span className="block text-sm text-[#52675a]">No harassment, sexual content, threats, links or sharing personal contact details.</span></span></label>
 <div className="mt-7 rounded-xl border border-[#e9d7b6] bg-[#fff7e8] p-4"><p className="font-semibold text-[#6d5127]">Public matching isn't open yet.</p><p className="mt-1 text-sm text-[#6d5127]">We're building server-side safety, moderation and privacy protections before welcoming visitors.</p></div>
 <button disabled className="mt-6 w-full rounded-xl bg-[#185435] px-5 py-4 text-lg font-bold text-white opacity-50">Start an anonymous chat — coming soon</button>
 <p className="mt-3 text-center text-sm text-[#52675a]">{adult&&kind?'Thanks for reading the rules. Public chat is still closed.':'Read both rules to prepare for a future chat.'}</p>
 </section>

 <aside aria-label="Sample advertisement" className="mx-auto mt-8 max-w-[728px] overflow-hidden rounded-2xl border border-[#d9dfd3] bg-[#f0f3e9] p-4 sm:p-5">
  <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#708073]">Advertisement · Demo only</p>
  <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-5 text-center sm:flex-row sm:text-left">
   <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#e5efdc] text-4xl">☕</div>
   <div className="flex-1"><p className="text-lg font-bold text-[#153f30]">A little break, a lovely brew.</p><p className="mt-1 text-sm text-[#52675a]">Make time for a cuppa and a friendly conversation.</p><p className="mt-2 text-xs font-semibold text-[#718276]">Sample creative · Not a real advertiser</p></div>
   <span className="rounded-full border border-[#bfd0bd] px-5 py-2 text-sm font-semibold text-[#205338]">Example ad</span>
  </div>
 </aside>
 <p className="mt-8 text-center text-sm text-[#52675a]">Emergency: 112 or 999 · Samaritans Ireland: 116 123. This is not a crisis service.</p>

 </main>;
}