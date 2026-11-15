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

for(const reply of ['13','17',"I'm 16",'15 years old']){
 const result=moderatePublicMessage(reply,'How old are you?');
 if(result.action!=='escalate'||!result.reasons.includes('minor_disclosure'))throw new Error('Underage reply missed: '+reply);
}
if(!moderatePublicMessage('25','How old are you?').allowed)throw new Error('Adult reply falsely blocked');
if(!moderatePublicMessage('15','What is your favourite number?').allowed)throw new Error('Number without age context falsely blocked');
