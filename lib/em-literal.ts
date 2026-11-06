// Explicit utterances are executable owner input, not an invitation to paraphrase.
export function literalUtterance(instruction:string):string|undefined{
 const text=instruction.trim();
 const chinese=text.match(/^(?:请你|请|你)?\s*(?:(?:现在|立刻|马上|立即)\s*)?(?:说(?:一句|出)?|发出|喊(?:出)?|重复|念(?:出)?)\s*[:：]?\s*(.+?)[。！!]?$/);
 if(chinese)return chinese[1].trim().replace(/^[“"「『]|[”"」』]$/g,'').slice(0,320);
 const english=text.match(/^(?:please\s+)?(?:(?:immediately|now)\s+)?(?:say|repeat|shout)\s*[:：]?\s+(.+?)[.!]?$/i);
 if(english)return english[1].trim().replace(/^[“"]|[”"]$/g,'').slice(0,320);
 const sound=text.match(/^(?:请你|请|你)?\s*(?:立刻|马上|现在|立即)\s*((.)\2(.)\3)[。！!]?$/u);
 return sound?.[1];
}
