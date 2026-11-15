import Link from 'next/link';

export const metadata={title:'Chat safely | Lonely No Longer'};
export default function Safety(){
 return <article className="mx-auto max-w-3xl space-y-7 px-5 py-12 sm:py-16">
  <header><p className="text-sm font-bold uppercase tracking-wide text-[#37634a]">Guidance for visitors</p>
   <h1 className="mt-3 font-serif text-4xl font-bold text-[#153f30]">Look after yourself and each other.</h1>
   <p className="mt-4 text-lg text-[#53675b]">A good conversation should feel comfortable. You can leave at any time, and you never owe another visitor a reply.</p></header>
  <section aria-labelledby="protect"><h2 id="protect" className="text-2xl font-bold">Keep your personal information private</h2>
   <p className="mt-2">Do not share your name, social usernames, phone number, address, school, work location, photographs or plans to meet. Do not follow requests to move the conversation to another service. The person you are speaking with may not be who they say they are.</p></section>
  <section aria-labelledby="uncomfortable"><h2 id="uncomfortable" className="text-2xl font-bold">If a chat becomes uncomfortable</h2>
   <ol className="mt-3 list-decimal space-y-2 pl-6"><li>Stop replying; you can press <strong>End chat</strong> immediately.</li><li>Use <strong>Block &amp; leave</strong> if you do not want to be matched with that anonymous session again.</li><li>Use <strong>Report message</strong> or <strong>Report chat</strong> for threats, grooming, harassment or other safety concerns.</li><li>Do not confront someone or investigate suspicious behaviour yourself.</li></ol>
   <p className="mt-3 text-sm text-[#52675a]">In this development version, blocking applies to the anonymous sessions, not to a verified identity. Reports require staff review; automated checks cannot guarantee safety.</p></section>
  <section aria-labelledby="underage"><h2 id="underage" className="text-2xl font-bold">If someone says they are under 18</h2>
   <p className="mt-2">End the conversation and make a report. This is an adults-only project. The prototype's age checkbox is self-declaration only; it does not independently check a person's age.</p></section>
  <section aria-labelledby="urgent"><h2 id="urgent" className="text-2xl font-bold">Need urgent help in Ireland?</h2>
   <div className="mt-3 rounded-2xl border border-[#cddcc9] bg-[#edf4e9] p-5"><p>In immediate danger: <strong>112 or 999</strong>.</p>
   <p className="mt-2">For someone to talk to: <strong>Samaritans 116 123</strong>.</p>
   <p className="mt-2">Suicide and self-harm support: <strong>Pieta 1800 247 247</strong>.</p>
   <p className="mt-3 text-sm">Lonely No Longer is not emergency assistance, counselling or therapy.</p></div>
  </section>
  <nav aria-label="Related information" className="flex flex-wrap gap-5 text-[#175535]"><Link href="/rules" className="font-semibold underline">Community rules</Link><Link href="/privacy" className="font-semibold underline">Privacy</Link><Link href="/chat" className="font-semibold underline">Chat preview</Link></nav>
 </article>;
}
