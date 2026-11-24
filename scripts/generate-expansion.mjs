import fs from 'node:fs';
import { PUZZLES } from '../puzzles.js';
const original = PUZZLES; // Published entries are read-only; this tool only writes a review draft.
import { lexicon } from './word-bank.mjs';
const words = [...lexicon.keys()];
const firsts = [], transitions = new Map(), lasts = new Map();
for(const start of words) {
  for(let i=0;i<start.length;i++) {
    const remainder=start.slice(0,i)+start.slice(i+1), outgoing=start[i];
    if(lexicon.has(remainder) && start.length>=4 && start.length<=5) firsts.push({start,answer:remainder,outgoing});
    if(start.length!==4) continue;
    for(let c=65;c<=90;c++) {
      const incoming=String.fromCharCode(c);
      if(incoming===outgoing) continue;
      for(let g=0;g<=remainder.length;g++) {
        const answer=remainder.slice(0,g)+incoming+remainder.slice(g);
        if(!lexicon.has(answer)) continue;
        const t={start,answer,outgoing};
        if(!transitions.has(incoming)) transitions.set(incoming,[]);
        if(!transitions.get(incoming).some(x=>x.start===start&&x.answer===answer&&x.outgoing===outgoing)) transitions.get(incoming).push(t);
      }
    }
  }
  if(start.length!==3) continue;
  for(let c=65;c<=90;c++) {
    const incoming=String.fromCharCode(c);
    for(let g=0;g<=start.length;g++) {
      const answer=start.slice(0,g)+incoming+start.slice(g);
      if(!lexicon.has(answer)) continue;
      if(!lasts.has(incoming)) lasts.set(incoming,[]);
      if(!lasts.get(incoming).some(x=>x.start===start&&x.answer===answer)) lasts.get(incoming).push({start,answer});
    }
  }
}
const usedBoards = new Set(original.map(p=>p.starts.join('|'))), usedAnswers = new Set(original.map(p=>p.answers.join('|')));
const counts = new Map();
original.forEach(p=>p.answers.forEach(w=>counts.set(w,(counts.get(w)||0)+1)));
const selected=[];
function choose(theme, gentle=false) {
  let best, score=Infinity;
  const recentCounts = new Map();
  selected.slice(-10).forEach(p=>p.answers.forEach(w=>recentCounts.set(w,(recentCounts.get(w)||0)+1)));
  const allowed = a=>!theme||lexicon.get(a).tags.includes(theme);
  for(const a of firsts) {
    if(!allowed(a.answer) || (gentle ? a.start.length!==4 : a.start.length!==5)) continue;
    for(const b of transitions.get(a.outgoing)||[]) {
      if(!allowed(b.answer)) continue;
      for(const c of transitions.get(b.outgoing)||[]) {
        if(!allowed(c.answer)) continue;
        for(const d of lasts.get(c.outgoing)||[]) {
          if(!allowed(d.answer)) continue;
          const rows=[a,b,c,d], starts=rows.map(x=>x.start), answers=rows.map(x=>x.answer);
          if(new Set([...starts,...answers]).size!==8 || usedBoards.has(starts.join('|')) || usedAnswers.has(answers.join('|'))) continue;
          const cost=answers.reduce((n,w)=>n+(counts.get(w)||0)*5+(recentCounts.get(w)||0)*12,0) + starts.reduce((n,w)=>n+original.slice(-5).filter(p=>p.starts.includes(w)).length,0);
          if(cost < score && ![...original,...selected].some(p=>p.answers.filter(w=>answers.includes(w)).length>=3)) {score=cost; best={starts,answers,clues:answers.map(w=>lexicon.get(w).clue)};}
        }
      }
    }
  }
  if(!best && theme) return null;
  if(!best) throw Error('No candidate');
  usedBoards.add(best.starts.join('|')); usedAnswers.add(best.answers.join('|'));
  best.answers.forEach(w=>counts.set(w,(counts.get(w)||0)+1)); selected.push(best); return best;
}
const themes={home:'At home',food:'Kitchen table',outdoors:'Fresh air',sea:'By the sea',animals:'Animal friends'};
const bonuses=[];
for(const [tag,name] of Object.entries(themes)) {
  const p=choose(tag) || choose(tag,true);
  if(p) bonuses.push({id:`bonus-${bonuses.length+1}`,title:name,theme:name,difficulty:'Steady',...p});
}
while(bonuses.length<8) bonuses.push({id:`bonus-${bonuses.length+1}`,title:['First class','Sunday stroll','A little detour','One more handoff','Return address','Long weekend','Pocket puzzle','Last delivery'][bonuses.length],difficulty:bonuses.length%2?'Gentle':'Steady',...choose(null,bonuses.length%2===1)});
const expanded=[];
for(let i=0;i<60;i++) {
  const tag=Object.keys(themes)[Math.floor(i/7)%5];
  let p, theme;
  if(i%7===6) { p=choose(tag)||choose(tag,true); if(p) theme=themes[tag]; }
  p??=choose(null,i%7===0||i%7===1);
  expanded.push({id:original.length+1+i,difficulty:i%7===0||i%7===1?'Gentle':'Steady',...(theme?{theme}:{}),...p});
}
fs.writeFileSync(new URL('../expansion-draft.json',import.meta.url), JSON.stringify({ daily: expanded, bonuses }, null, 2) + '\n');
for(const p of [...bonuses,...expanded]) console.log(p.id,p.theme||p.difficulty,p.starts.join('/'),'=',p.answers.join('/'));
