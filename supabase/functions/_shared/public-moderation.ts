/**
 * Public-chat child-safety moderation foundation (NOT a standalone safety system).
 * Run on the SERVER before saving or delivering any public message.
 * A blocked message must never be delivered; severe matches need human escalation.
 * Do not log raw message text. Rules are deliberately conservative and incomplete.
 */
export type ModerationDecision = {
  allowed: boolean;
  action: 'allow' | 'block' | 'escalate';
  reasons: string[];
  severity: 'none' | 'medium' | 'critical';
};
const rules: {id:string; pattern:RegExp; severity:'medium'|'critical'}[] = [
  {id:'url',pattern:/\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|ie|io|gg|app|me)\b)/i,severity:'medium'},
  {id:'contact_handle',pattern:/(?:^|\s)@[a-z][a-z0-9_.]{2,}/i,severity:'medium'},
  {id:'phone_number',pattern:/(?:\+?\d[\s().-]*){9,}/,severity:'medium'},
  {id:'off_platform',pattern:/\b(?:snapchat|snap|telegram|whatsapp|discord|instagram|insta|kik|signal|onlyfans)\b/i,severity:'medium'},
  {id:'location_request',pattern:/\b(?:what(?:'s| is) your address|where (?:exactly )?do you live|send (?:me )?your (?:address|location|eircode)|what school do you go to)\b/i,severity:'critical'},
  {id:'minor_disclosure',pattern:/\b(?:i(?:'m| am) (?:only )?(?:[1-9]|1[0-7])\b|i(?:'m| am) (?:a )?minor\b|i(?:'m| am) under(?: the age of)? 18\b|i go to (?:primary|secondary|high) school)\b/i,severity:'critical'},
  {id:'minor_seeking',pattern:/\b(?:looking for|want to (?:meet|chat with)|seeking) (?:a |an )?(?:underage|minor|child|(?:1[0-7]|[1-9]) year old)\b/i,severity:'critical'},
  {id:'sexual_coercion',pattern:/\b(?:send (?:me )?(?:nudes|naked pics|sexual photos)|show me your (?:private parts|genitals)|keep (?:this|our chat) secret from (?:your )?(?:parents|mum|mom|dad)|don't tell (?:your )?(?:parents|mum|mom|dad))\b/i,severity:'critical'},
  {id:'threat',pattern:/\b(?:i(?:'ll| will) (?:kill|hurt|rape) you|i know where you live)\b/i,severity:'critical'},
  {id:'personal_data',pattern:/\b(?:my (?:address|eircode|postcode|phone number|mobile number) is|my (?:email|e-mail) is)\b/i,severity:'medium'},
  {id:'email',pattern:/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,severity:'medium'},
];
/**
 * If the immediately preceding message from the OTHER participant asked for age,
 * a bare reply such as "15", "I'm 16", or "17 years old" is a minor disclosure.
 * Only pass a trusted server-fetched previous message, never client-provided context.
 */
export function isUnder18AgeReply(input:unknown, previousOtherMessage:unknown):boolean {
  if(typeof input!=='string'||typeof previousOtherMessage!=='string')return false;
  const question=previousOtherMessage.normalize('NFKC').trim();
  if(!/\\b(?:how old (?:are|r) (?:you|u)|what(?:'s| is) your age|(?:your|ur) age\\??)\\b/i.test(question))return false;
  const reply=input.normalize('NFKC').trim();
  const match=/^(?:(?:i(?:'m| am)|aged?|only|just)\\s+)?(\\d{1,2})(?:\\s*(?:years?\\s*old|yrs?\\s*old|yo))?[.!\\s]*$/i.exec(reply);
  return !!match&&Number(match[1])<18;
}
export function moderatePublicMessage(input:unknown, previousOtherMessage?:unknown):ModerationDecision {
  if(typeof input!=='string')return {allowed:false,action:'block',reasons:['invalid_message'],severity:'medium'};
  const message=input.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
  if(message.length<1||message.length>500)return {allowed:false,action:'block',reasons:['invalid_length'],severity:'medium'};
  const matched=rules.filter(rule=>rule.pattern.test(message));
  if(isUnder18AgeReply(message,previousOtherMessage)&&!matched.some(rule=>rule.id==='minor_disclosure'))matched.push({id:'minor_disclosure',pattern:/$^/,severity:'critical'});
  if(!matched.length)return {allowed:true,action:'allow',reasons:[],severity:'none'};
  const critical=matched.some(rule=>rule.severity==='critical');
  return {allowed:false,action:critical?'escalate':'block',reasons:matched.map(rule=>rule.id),severity:critical?'critical':'medium'};
}
