export type Decision = {allowed:boolean; reason?:string; crisis:boolean};
// Conservative development rules; NOT a substitute for trained moderation + human review.
const checks: Array<[string, RegExp]> = [
 ['LINK',/(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|ie|net|org|gg|io|co|app|me)\b)/i],
 ['PHONE',/(?:\+?353[\s().-]*\d[\d\s().-]{6,}|\b0[1-9]\d[\s().-]{7,}\d\b)/i],
 ['EMAIL',/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i],
 ['SOCIAL',/(?:@\w{2,}|(?:snapchat|instagram|tiktok|discord|telegram|whatsapp|signal)\s*(?:[:@]|is\b|me\b|handle\b))/i],
 ['ADDRESS',/\b(?:my address is|i live at|eircode|postcode|meet me at)\b|\b[A-Z]\d{2}\s?[A-Z0-9]{4}\b/i],
 ['SEXUAL',/\b(?:porn|nudes?|sext(?:ing)?|explicit pics?|send (?:me )?(?:pics?|nudes?)|hook\s?up)\b/i],
 ['GROOMING',/\b(?:how old are you (?:really|sweetie)|keep (?:this|it) (?:a )?secret from (?:your )?(?:parents|mum|dad)|are you under ?18|send me private pics)\b/i],
 ['MINORS',/\b(?:child sexual|csam|underage sex|sex with (?:a )?minor)\b/i],
 ['ABUSE',/\b(?:kill yourself|kys|faggot|nigger|retard)\b/i],
];
const crisisPattern = /\b(?:suicid(?:e|al)|kill myself|end my life|self[ -]?harm|hurt myself|don't want to live|do not want to live|want to die|overdose)\b/i;
export const crisisMessage = 'You deserve support. If you may be in immediate danger, call 112 or 999. In Ireland, Samaritans are on 116 123 and Pieta on 1800 247 247.';
export function evaluate(text:string):Decision {
  const normalized = text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'');
  const crisis = crisisPattern.test(normalized);
  if(crisis) return {allowed:false,reason:'CRISIS',crisis:true};
  for(const [reason,pattern] of checks) if(pattern.test(normalized)) return {allowed:false,reason,crisis:false};
  return {allowed:true,crisis:false};
}