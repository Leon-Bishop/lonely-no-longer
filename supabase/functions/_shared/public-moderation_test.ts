import {moderatePublicMessage} from './public-moderation.ts';
const cases:[string,boolean,string][]=[
 ['Hello, how was your day?',true,'ordinary conversation'],
 ['Let us chat on Snapchat',false,'off-platform move'],
 ['Email me at test@example.com',false,'email'],
 ['My phone is 087 123 4567',false,'phone'],
 ['I am 15 years old',false,'underage disclosure'],
 ["Don't tell your parents",false,'secrecy / grooming signal'],
 ['What school do you go to?',false,'school question'],
 ['https://example.com',false,'link'],
 [' ',false,'empty message'],
 ['a'.repeat(501),false,'oversized message'],
];
for(const [message,expected,label] of cases){
 const actual=moderatePublicMessage(message);
 if(actual.allowed!==expected)throw new Error(label+': unexpected moderation result');
}
const critical=moderatePublicMessage('I am 15 years old');
if(critical.action!=='escalate')throw new Error('Minor disclosure must escalate');
console.log('Moderation foundation tests passed');
