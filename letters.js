// The paper-plane letters: which student letter a plane opens. Each open picks one the visitor has not read yet (remembered
// only in this browser), so coming back brings new letters; once all have been read, any of them can come again.
export const READ_KEY='mengpo-island-letters-read';
export function pickLetter(count,read=new Set(),rnd=Math.random,avoid=-1){
 if(count<=0)return -1;
 const all=[...Array(count).keys()],fresh=all.filter(i=>!read.has(i)&&i!==avoid),pool=fresh.length?fresh:all.filter(i=>i!==avoid);
 const from=pool.length?pool:all;return from[Math.floor(rnd()*from.length)%from.length];
}
// Read marks live in localStorage; a private window or blocked storage simply means nothing is remembered.
export function loadRead(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(READ_KEY)||'[]');return new Set(Array.isArray(v)?v.filter(Number.isInteger):[]);}catch{return new Set();}}
export function saveRead(read,storage=globalThis.localStorage){try{storage?.setItem(READ_KEY,JSON.stringify([...read]));}catch{}}
