import Link from 'next/link';

export const metadata={title:'Terms of use | Lonely No Longer'};
export default function Terms(){
 return <article className="mx-auto max-w-3xl space-y-6 px-5 py-12 sm:py-16">
  <p className="text-sm font-semibold uppercase tracking-wide text-[#386449]">Draft terms · Subject to legal review</p>
  <h1 className="font-serif text-4xl font-bold text-[#153f30]">Terms of use</h1>
  <p>Lonely No Longer is developing a free, anonymous, adults-only, text-only peer conversation service. The public service is not yet available. These draft terms are not a final contract for an operating chat service.</p>
  <h2 className="text-2xl font-bold">Eligibility and behaviour</h2>
  <p>The intended service is for people aged 18 and over. The prototype asks visitors to declare they are adults; it does not independently verify age. Before joining, visitors must accept the <Link href="/rules" className="font-semibold underline">community rules</Link>. No harassment, sexual or exploitative content, coercion, sharing contact details, links, arranging meetings or attempts to circumvent safeguards.</p>
  <h2 className="text-2xl font-bold">Conversations and safety</h2>
  <p>Visitors are paired one-to-one using anonymous temporary sessions. The service may filter, refuse or remove messages, end sessions, accept reports, and temporarily restrict access when necessary for safety. Automated moderation is imperfect and safety incidents need human oversight. Blocking another visitor only applies to the relevant anonymous sessions, not to a person's identity.</p>
  <h2 className="text-2xl font-bold">No professional advice or emergency service</h2>
  <p>Conversations are between visitors, not trained counsellors or health professionals. The service is not a crisis or emergency service. In Ireland, call 112 or 999 for immediate danger.</p>
  <h2 className="text-2xl font-bold">Your information</h2>
  <p>Do not include private, identifiable or sensitive information in messages. Review our <Link href="/privacy" className="font-semibold underline">development privacy information</Link> before using any future chat.</p>
  <h2 className="text-2xl font-bold">Before these terms take effect</h2>
  <p>The operator must publish their legal identity and contact details, consumer redress and complaint pathways where applicable, final service terms, and all statutory notices required for the actual service. Professional Irish/EU legal review and a documented change-notice procedure are outstanding.</p>
 </article>;
}
