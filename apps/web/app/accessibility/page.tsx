import Link from 'next/link';

export const metadata={title:'Accessibility | Lonely No Longer'};
export default function Accessibility(){
 return <article className="mx-auto max-w-3xl space-y-6 px-5 py-12 sm:py-16">
  <h1 className="font-serif text-4xl font-bold text-[#153f30]">Accessibility</h1>
  <p>We are building Lonely No Longer to support phones, tablets, keyboards and assistive technologies. This page describes our development goals, not a formal accessibility compliance certification.</p>
  <h2 className="text-2xl font-bold">Using the preview</h2>
  <ul className="list-disc space-y-2 pl-6"><li>Navigate between links, checkboxes, buttons and the message field using Tab and Shift+Tab.</li><li>Visible focus outlines should show which element is selected.</li><li>Chat status messages and errors are designed to be announced by assistive technology.</li><li>Text reflows at narrower screen widths and supports browser zoom.</li><li>Animation is limited and reduced-motion preferences are respected.</li></ul>
  <h2 className="text-2xl font-bold">Known limitations</h2>
  <p>We have not yet completed independent screen-reader, contrast, keyboard-only or mobile accessibility testing. When the chat is deployed for testing, focus order, live message announcements and report interactions will need verification.</p>
  <p>There is no public accessibility-contact address yet. An accessible contact method and complaint/feedback procedure must be provided before launch. See the <Link href="/safety" className="font-semibold underline">safety guidance</Link>.</p>
 </article>;
}
