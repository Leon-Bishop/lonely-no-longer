import Link from 'next/link';

export const metadata={title:'Community rules | Lonely No Longer'};
export default function Rules(){
 return <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
  <h1 className="font-serif text-4xl font-bold text-[#153f30]">Our community rules</h1>
  <p className="mt-4 text-lg text-[#52675a]">A friendly chat starts with everyone feeling safe.</p>
  <ol className="mt-8 list-decimal space-y-4 pl-6 leading-relaxed">
   <li><strong>Adults only.</strong> You must be 18 or older. The development entry checkbox is a self-declaration, not proof or independent age verification.</li>
   <li><strong>Be kind.</strong> No harassment, bullying, hate, humiliation, unwanted sexual content or threats.</li>
   <li><strong>Protect children.</strong> No grooming, exploitation, attempts to involve minors, or requests for images or secrets involving children. If you are under 18, leave the chat.</li>
   <li><strong>Protect privacy.</strong> Do not share or request full names, phone numbers, email addresses, school or home locations, social usernames, links or meeting arrangements.</li>
   <li><strong>Keep it text-only.</strong> Do not post images, files or other prohibited content. One active anonymous conversation per session.</li>
   <li><strong>Use safety controls.</strong> You may report or block someone. Reports are reviewed as allegations; they are not proof of wrongdoing. Automated moderation can make mistakes.</li>
   <li><strong>Do not rely on chat for emergencies.</strong> The service does not provide therapy, medical advice or urgent safeguarding help.</li>
  </ol>
  <aside className="mt-8 rounded-2xl border border-[#d6e2d6] bg-[#edf4e9] p-5">
   <h2 className="text-lg font-bold">Need help now?</h2>
   <p className="mt-2">Immediate danger in Ireland: <strong>112 or 999</strong>. Samaritans: <strong>116 123</strong>. Pieta: <strong>1800 247 247</strong>.</p>
   <Link href="/safety" className="mt-3 inline-block font-semibold underline">More safety guidance</Link>
  </aside>
 </article>;
}
