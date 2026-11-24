import fs from 'node:fs';
import { lexicon as base } from './word-bank.mjs';
const lexicon = new Map(base);
const extra = `
PLANET|A world orbiting a star
PLANER|A machine that smooths wood
PLAYER|Someone taking part in a game
SLAYER|Someone who kills a monster in a story
PRAYER|Words spoken to a deity
LAYER|One thickness of a stack
PAYER|The person who settles a bill
STREAM|A narrow flowing body of water
SCREAM|A loud cry of fear
DREAM|A story your mind makes during sleep
DREAMS|Stories your mind makes during sleep
CREAMS|Rich dairy products or skin lotions
STEAMS|Gives off hot water vapor
STRAIN|An injury caused by overstretching a muscle
STRAIT|A narrow passage of water between larger seas
TRAIT|A distinguishing quality of a person
STAIN|A discolored mark left on fabric
SPRING|The season between winter and summer
SPRIG|A small stem with leaves or flowers
STRING|Thin cord used to tie a package
STING|A sharp pain from a bee
STRIPE|A long narrow band of color
STRIP|A long narrow piece of material
SHARED|Let someone else use part of something
SPARED|Saved someone from harm
SCARED|Feeling afraid
SCORED|Earned points in a game
STARED|Looked fixedly at something
TRACED|Copied a drawing by following its lines
TRADES|Exchanges one thing for another
TRADE|Exchange one thing for another
TREADS|Steps on a surface
THREAD|Thin fiber used for sewing
THREAT|A warning of intended harm
STREAK|A run of consecutive successes
STAIRS|Steps between floors of a building
STRAWS|Thin tubes used to sip a drink
STRAW|A tube used to sip a drink
SPLASH|Scatter drops of liquid
SLASH|A diagonal punctuation mark
CHASTE|Refraining from sexual activity
CHASE|Run after someone to catch them
CHASED|Ran after someone to catch them
CHARTS|Diagrams used to display information
CHASER|Someone who pursues another person
SMILED|Made a happy expression
SMILER|Someone with a happy expression
SLIDER|A small hamburger
CLOSER|Nearer in distance
CLOSE|Shut a door
CLOSED|Not open
CLOSET|A small space for storing clothes
CLOVER|A plant whose leaves often have three leaflets
COVER|Put something over to protect or hide it
LOVER|A person in a romantic relationship
LOVERS|People in a romantic relationship
GLOVES|Hand coverings with separate fingers
BOLDER|More willing to take risks
OLDER|Having lived for more years
SOLDER|Metal alloy melted to join other metal pieces
SHORED|Supported with a prop, as in propped up
SHORES|The edges of a lake or sea
CROWDS|Large groups of people gathered together
CROWD|A large group of people gathered together
CROWN|Headwear worn by a monarch
CROWNS|Headwear worn by monarchs
GROWLS|Low threatening sounds from dogs
GROWL|A low threatening sound from a dog
SLOWER|Moving at a lower speed
LOWER|Move something to a position below
FLOWER|The blooming part of a plant
BLOWER|A device that moves air
GROWER|Someone who cultivates crops
ROWER|Someone who propels a boat with oars
SPROUT|A new shoot emerging from a seed
SPOUT|The part of a teapot that pours
STROKE|One movement of an oar or brush
STOKE|Add fuel to a fire
BROKEN|Damaged so it no longer works
BROKE|Past tense of break
SPOKEN|Said aloud rather than written
SPOKE|A rod connecting a wheel's hub and rim
SMOKER|A device that cooks food over wood smoke
SMOKE|The visible cloud produced by a fire
STONES|Small pieces of rock
SPOKES|Rods connecting a wheel's hub and rim
STOKES|Adds fuel to a fire
CHOKER|A necklace worn closely around the neck
CHOKE|Have trouble breathing because the throat is blocked
SPLINT|A rigid support for an injured limb
SPLIT|Divide into two or more parts
PLANTS|Living things with roots and leaves
PLANES|Aircraft with fixed wings
PLATES|Flat dishes used for serving food
WHALE|A large marine mammal
GRIN|A broad smile
BRED|Raised animals to produce offspring
BRED|Raised animals to produce offspring
BRICK|A rectangular block used to build walls
TRICK|An action meant to fool someone
TRACK|A path left by a passing animal
CRACK|A narrow break in a surface
STACK|A neat pile of things
STOCK|Goods kept available for sale
STICK|A thin piece of wood
STUCK|Unable to move from a position
TRUCK|A vehicle used to carry heavy loads
TRUNK|The main woody stem of a tree
DRINK|Swallow a liquid
BRINK|The very edge of something
BLINK|Quickly close and open your eyes
BLANK|Containing no writing or marks
BLAND|Lacking a strong flavor
BLEND|Mix things together smoothly
BRAND|A name used to identify a product line
BLIND|Unable to see
BOUND|Tied securely with rope
ROUND|Shaped like a circle or sphere
SOUND|Something you can hear
FOUND|Discovered something that was missing
POUND|A unit of weight equal to sixteen ounces
MOUND|A small heap of earth
WOUND|An injury that breaks the skin
COUNT|Find the total number of things
COURT|A place where legal cases are heard
COAST|The land beside the sea
ROAST|Cook with dry heat in an oven
BOAST|Talk with excessive pride
BOOST|Help something increase
GHOST|A spirit in a haunted-house story
HOST|Someone who welcomes guests
GUEST|Someone invited to visit
QUEST|A long search for something
QUITE|To a considerable degree
QUOTE|Repeat someone's exact words
`; 
for(const line of extra.trim().split('\n')) { const [w,clue]=line.split('|'); lexicon.set(w,{clue,tags:[]}); }
const words=[...lexicon.keys()];
const firsts=[], transitions=new Map(), lasts=new Map();
for(const start of words) {
 if(start.length===6) for(let i=0;i<6;i++) {
  const answer=start.slice(0,i)+start.slice(i+1);
  if(lexicon.has(answer)) firsts.push({start,answer,outgoing:start[i]});
 }
 if(start.length===5) for(let i=0;i<5;i++) {
  const rest=start.slice(0,i)+start.slice(i+1), outgoing=start[i];
  for(let c=65;c<=90;c++) {
   const incoming=String.fromCharCode(c); if(incoming===outgoing) continue;
   for(let g=0;g<=4;g++) {
    const answer=rest.slice(0,g)+incoming+rest.slice(g);
    if(!lexicon.has(answer)) continue;
    if(!transitions.has(incoming)) transitions.set(incoming,[]);
    if(!transitions.get(incoming).some(t=>t.start===start&&t.answer===answer&&t.outgoing===outgoing)) transitions.get(incoming).push({start,answer,outgoing});
   }
  }
 }
 if(start.length===4) for(let c=65;c<=90;c++) {
  const incoming=String.fromCharCode(c);
  for(let g=0;g<=4;g++) {
   const answer=start.slice(0,g)+incoming+start.slice(g);
   if(!lexicon.has(answer)) continue;
   if(!lasts.has(incoming)) lasts.set(incoming,[]);
   if(!lasts.get(incoming).some(t=>t.start===start&&t.answer===answer)) lasts.get(incoming).push({start,answer});
  }
 }
}
const candidates=[], keys=new Set();
for(const a of firsts) for(const b of transitions.get(a.outgoing)||[]) for(const c of transitions.get(b.outgoing)||[]) for(const d of lasts.get(c.outgoing)||[]) {
 const rows=[a,b,c,d], starts=rows.map(r=>r.start), answers=rows.map(r=>r.answer), key=answers.join('|');
 if(new Set([...starts,...answers]).size<8||keys.has(key)) continue;
 keys.add(key); candidates.push({starts,answers,clues:answers.map(w=>lexicon.get(w).clue)});
}
console.log('Candidate hard relays:', candidates.length);
const counts=new Map(), selected=[];
for(let i=0;i<90;i++) {
 let best, bestScore=Infinity;
 const recent=new Set(selected.slice(-6).flatMap(p=>p.answers));
 for(const p of candidates) {
  if(p.used) continue;
  const score=p.answers.reduce((n,w)=>n+(counts.get(w)||0)*7+(recent.has(w)?30:0),0)+p.starts.reduce((n,w)=>n+(counts.get(w)||0)*2,0);
  if(score<bestScore && !selected.some(previous=>previous.answers.filter(w=>p.answers.includes(w)).length>=3)) {best=p; bestScore=score;}
 }
 if(!best) throw Error('Not enough candidates');
 best.used=true;
 const {used,...p}=best;
 selected.push({id:`hard-${i+1}`,kind:'hard',difficulty:'Hard',maxChecks:4,title:`Daily challenge #${String(i+1).padStart(3,'0')}`,...p});
 [...p.starts,...p.answers].forEach(w=>counts.set(w,(counts.get(w)||0)+1));
}
fs.writeFileSync(new URL('../hard-draft.json',import.meta.url),JSON.stringify(selected,null,2)+'\n');
for(const p of selected) console.log(p.id,p.starts.join('/'),'=',p.answers.join('/'));
