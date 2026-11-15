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

 <aside aria-label="Reserved advertisement space" className="mx-auto mt-8 max-w-[728px] rounded-xl border border-dashed border-[#d6ded3] bg-[#faf9f4] px-4 py-5 text-center"><p className="text-[10px] font-semibold uppercase tracking-widest text-[#87938a]">Advertisement</p><p className="mt-1 text-xs text-[#87938a]">Ad space reserved</p></aside>
 <p className="mt-8 text-center text-sm text-[#52675a]">Emergency: 112 or 999 · Samaritans Ireland: 116 123. This is not a crisis service.</p>

 </main>;
}