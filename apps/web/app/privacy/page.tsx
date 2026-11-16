import Link from 'next/link';

export const metadata={title:'Privacy | Lonely No Longer'};
export default function Privacy(){
 return <article className="mx-auto max-w-3xl space-y-6 px-5 py-12 sm:py-16">
  <p className="text-sm font-semibold uppercase tracking-wide text-[#386449]">Development information · Not a final legal notice</p>
  <h1 className="font-serif text-4xl font-bold text-[#153f30]">Your privacy matters.</h1>
  <p className="text-lg text-[#475e51]">Lonely No Longer is an anonymous one-to-one text-chat project for adults. The public chat is not yet launched. This page explains the proposed data handling and what still needs review before launch.</p>
  <section aria-labelledby="data-heading"><h2 id="data-heading" className="text-2xl font-bold">What a future chat would process</h2>
   <ul className="mt-3 list-disc space-y-2 pl-6"><li>Random anonymous session tokens (only token hashes stored server-side), consent timestamps and conversation membership.</li><li>Messages needed to deliver conversations and check for rule violations.</li><li>Reports, moderation actions and limited incident records when safety issues arise.</li><li>A keyed, pseudonymous hash derived from network IP information for abuse prevention and temporary bans; it is still potentially personal data.</li><li>Technical request and error information processed by our hosting and security providers.</li></ul>
  </section>
  <section aria-labelledby="controls-heading"><h2 id="controls-heading" className="text-2xl font-bold">How the design limits data use</h2>
   <p className="mt-3">The proposed chat does not request visitor accounts, public profiles, names, email addresses or identity documents. Participants are instructed not to share personal details. A statement that you are over 18 is self-declaration, not independent verification. Messages are moderated by automated rules that may miss or mistakenly flag content.</p>
   <p className="mt-3">Chat content is not end-to-end encrypted: the service must be able to inspect messages for safety. Other participants may copy what they see. Do not send sensitive details.</p>
  </section>
  <section aria-labelledby="storage-heading"><h2 id="storage-heading" className="text-2xl font-bold">Storage and retention</h2>
   <p className="mt-3">The proposed retention design separates ordinary conversation content from reports and safeguarding evidence. A draft database cleanup routine is prepared, but is not scheduled or active. Final retention periods, lawful bases, international transfers and provider details must be confirmed before launch. We cannot promise that an unlaunched retention schedule is operating.</p>
  </section>
  <section aria-labelledby="rights-heading"><h2 id="rights-heading" className="text-2xl font-bold">Your data protection rights</h2>
   <p className="mt-3">Depending on the circumstances and lawful basis, you may have rights of access, correction, erasure, restriction, objection and portability, and a right to complain to the Irish Data Protection Commission. Anonymous use may limit our ability to locate a record without a session identifier.</p>
   <p className="mt-3">The operator's verified identity, privacy contact method, lawful-basis assessment and data subject request procedure must be added before this page can serve as the service's final GDPR privacy notice. This page does not yet contain all information required for a live service.</p>
  </section>
  <p className="rounded-xl border border-[#d7e2d7] bg-[#edf4e9] p-4 text-sm">For more about safe chatting, please read the <Link href="/rules" className="font-semibold underline">community rules</Link> and <Link href="/safety" className="font-semibold underline">safety guidance</Link>.</p>
 </article>;
}
