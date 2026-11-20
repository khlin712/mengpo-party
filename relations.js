// Editorial exploration questions derived from existing topic links, never verified teaching claims.
const questions={
 'teacher:teaching':'「上帝視角」這個說法，在現場是怎麼用植物能量帶領的？',
 'questions:teacher':'有疑問時，可以先向老師說明自己的哪些情況？',
 'stories:teacher':'有沒有和我的問題類型相近的參加者經驗？',
 'questions:teaching':'是不是催眠、是不是法事，現場會怎麼說明？',
 'stories:teaching':'看見卡點之後，參加者回到生活有哪些不同？',
 'questions:stories':'想先確認安心，可以看到哪些真實的回饋與照片？'
};
export function relationKey(a,b){return [a,b].sort().join(':');}
export function buildRelations(topics){
 const known=new Map(topics.map(t=>[t.id,t])),seen=new Set(),result=[];
 for(const t of topics)for(const id of t.links){if(!known.has(id)||id===t.id)continue;const key=relationKey(t.id,id);if(seen.has(key))continue;seen.add(key);const [a,b]=key.split(':');
  result.push({id:key,a,b,question:questions[key]||`「${known.get(a).title}」與「${known.get(b).title}」之間，有哪些事情需要一起確認？`});
 }
 return result;
}
export function findRelations(relations,topics,query=''){
 const names=new Map(topics.map(t=>[t.id,t.title]));const q=query.trim().toLocaleLowerCase();
 return relations.filter(r=>`${names.get(r.a)} ${names.get(r.b)} ${r.question}`.toLocaleLowerCase().includes(q));
}
