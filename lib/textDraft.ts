export type TextDraft = {version:1; savedAt:number; fields:Record<string,string>};
export const DRAFT_TTL = 7*86400000;
export function draftKey(owner:string, scope:string) { return `synaura:draft:v1:${encodeURIComponent(owner)}:${encodeURIComponent(scope)}`; }
export function decodeDraft(raw:string|null, allowed:readonly string[], now=Date.now()):TextDraft|null {
  if (!raw || raw.length>60000) return null;
  try {
    const d=JSON.parse(raw);
    if(d.version!==1 || !Number.isFinite(d.savedAt) || d.savedAt>now+60000 || now-d.savedAt>DRAFT_TTL || !d.fields || typeof d.fields!=='object') return null;
    const fields:Record<string,string>={};
    for(const key of allowed) if(typeof d.fields[key]==='string') fields[key]=d.fields[key].slice(0,12000);
    return Object.keys(fields).length?{version:1,savedAt:d.savedAt,fields}:null;
  } catch {return null;}
}
