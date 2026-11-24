import { PUZZLES } from '../puzzles.js';
const original = PUZZLES.slice(0, 30);
export const lexicon = new Map();
for (const p of original) p.answers.forEach((word,i)=>lexicon.set(word,{clue:p.clues[i], tags:[]}));
const additions = `
CAT|A pet that purrs|animals
DOG|A pet that barks|animals
BAT|A flying mammal|animals
RAT|A long-tailed rodent|animals
HEN|A female chicken|animals
COW|A farm animal milked by a farmer|animals
PIG|A farm animal with a snout|animals
FOX|A wild animal with a bushy tail|animals
BEAR|A large mammal that may hibernate|animals
BOAR|A male wild pig|animals
GOAT|A farm animal with horns and a beard|animals
MOLE|A small mammal that tunnels underground|animals
HARE|A long-eared relative of a rabbit|animals
DEER|An animal that may grow antlers|animals
SEAL|A flippered marine mammal|animals
DUCK|A web-footed bird that quacks|animals
DOVE|A bird often used as a symbol of peace|animals
WREN|A small brown songbird|animals
CRAB|A sea creature with claws|animals,sea
CLAM|A shellfish with two hinged shells|animals,sea,food
CARP|A freshwater fish often kept in ponds|animals
COD|A fish often served with chips|animals,sea,food
FIN|A fish uses this to steer|sea
WAVE|A ridge of water that rolls toward shore|sea
TIDE|The regular rise and fall of the sea|sea
SAIL|Canvas that catches the wind|sea
BOAT|A small vessel on water|sea
COAST|The land beside the sea|sea
SHORE|Land along the edge of water|sea
PORT|A harbor where ships load cargo|sea
SAND|Tiny grains beneath a beach towel|sea,outdoors
REEF|A ridge of coral beneath the sea|sea
COVE|A small sheltered inlet|sea
OAR|A long paddle used to row|sea
RAIN|Water falling from clouds|outdoors
HAIL|Small balls of ice falling from clouds|outdoors
SNOW|Frozen flakes falling from clouds|outdoors
STAR|A point of light in the night sky|outdoors
SUN|The star at the center of our solar system|outdoors
MOON|Earth's natural satellite|outdoors
WIND|Air moving outside|outdoors
PINE|An evergreen tree with needles|outdoors
OAK|A tree that grows acorns|outdoors
LEAF|A flat green part of a plant|outdoors
ROOT|A plant part that takes in water from soil|outdoors
SEED|A plant can grow from this|outdoors
ROSE|A flower with a thorny stem|outdoors
TREE|A tall plant with a woody trunk|outdoors
POND|A small body of still water|outdoors
LAKE|A large body of water surrounded by land|outdoors
HILL|Raised ground smaller than a mountain|outdoors
PEAK|The top of a mountain|outdoors
PATH|A track made for walking|outdoors
PARK|A public green space|outdoors
LAND|Solid ground rather than water|outdoors
MOSS|A soft green plant growing on damp rocks|outdoors
MIST|A thin cloud close to the ground|outdoors
BARK|The outer covering of a tree|outdoors
BED|A piece of furniture for sleeping|home
MAT|A small covering for a floor|home
RUG|A thick floor covering|home
LAMP|A light on a bedside table|home
DESK|A table used for writing or work|home
DOOR|A movable panel at a room's entrance|home
WALL|A vertical side of a room|home
ROOF|The covering on top of a house|home
ROOM|A space inside a building|home
TILE|A square piece of flooring|home
SINK|A basin with a faucet|home
BATH|A soak in a tub|home
SOAP|Something used with water for washing|home
BOWL|A deep round dish|home,food
CUP|A small drinking vessel with a handle|home,food
MUG|A large cup used for coffee|home,food
PAN|A shallow metal container for cooking|home,food
POT|A deep container used for cooking|home,food
FORK|A utensil with prongs|home,food
CAKE|A sweet baked dessert|food
BAKE|Cook using an oven|food
RICE|Small grains often served with curry|food
PEAR|A fruit with a narrow top and round base|food
LIME|A small green citrus fruit|food
PLUM|A purple fruit with a stone inside|food
BEAN|A seed often cooked in chili|food
PEAS|Small green vegetables that grow in pods|food
CORN|A crop with yellow kernels on a cob|food
MEAT|Animal flesh eaten as food|food
MILK|A white drink often poured over cereal|food
SALT|The seasoning in a shaker|food
DILL|An herb often used to flavor pickles|food
MINT|An herb used in tea and toothpaste|food
OAT|A grain used to make porridge|food
TEA|A drink made by steeping leaves|food
JAM|A fruit spread for toast|food
HAM|Meat from the hind leg of a pig|food
PIE|A baked dish with a pastry crust|food
LOAF|A whole baked mass of bread|food
TOAST|Bread browned by heat|food
CREAM|The rich fatty part of milk|food
STEAM|Water in its gaseous form|food
COST|The amount you pay|
COAT|An outer garment with sleeves|
COLD|At a low temperature|
WARM|Comfortably hot|
HEAT|Warmth from a radiator|
COOL|Slightly cold|
HOT|At a high temperature|
HAT|Something worn on your head|
CAP|A hat with a visor|
CAPE|A sleeveless garment worn over the shoulders|
TAPE|A sticky strip used to fasten things|
TAP|Touch lightly with a finger|
MAP|A drawing that shows where places are|
NAP|A short sleep|
LAP|One complete trip around a running track|
GAP|An empty space between two things|
BAG|A flexible container used to carry things|
TAG|A small label attached to an item|
RAG|A scrap of old cloth|
RAGE|Very strong anger|
AGE|How old someone is|
PAGE|One side of a sheet in a book|
CAGE|An enclosure made of bars|
WAGE|Money paid for work|
GAME|An activity played for fun|
NAME|What someone is called|
SAME|Exactly alike|
TAME|Not wild, as an animal|
TIME|What a clock measures|
DIME|A US coin worth ten cents|
DINE|Eat a meal|
FINE|Money paid as a penalty|
FIRE|Flames that give off heat|
TIRE|The rubber covering around a wheel|
WIRE|A thin strand of metal|
HIRE|Give someone a job|
HIDE|Put something out of sight|
SIDE|One surface of a box|
WIDE|Measuring a long way from side to side|
RIDE|Travel on a bicycle|
RIPE|Ready to pick, as fruit|
PIPE|A hollow tube that carries water|
PILE|A heap of things|
PILL|A small solid dose of medicine|
BILL|A request for payment|
FILL|Make a container full|
WILL|A document stating who inherits property|
WELL|A deep hole dug to reach water|
TELL|Give information in words|
SELL|Exchange something for money|
BELL|A hollow instrument that rings|
FELL|Past tense of fall|
FELT|A fabric made from pressed fibers|
BELT|A strap worn around the waist|
MELT|Change from solid to liquid|
MALT|Grain prepared for brewing|
MILD|Not strong or spicy|
WILD|Living freely in nature|
MIND|The part of you that thinks|
KIND|Caring and considerate|
FIND|Discover something you were looking for|
BIND|Tie things together|
BAND|A group of musicians|
HAND|The body part at the end of an arm|
HARD|Difficult to do|
CARD|A small stiff rectangle of paper|
CART|A wheeled carrier pushed by hand|
PART|A piece of a larger whole|
PAST|The time before the present|
LAST|Coming after all the others|
FAST|Moving at high speed|
EAST|The direction of sunrise|
WEST|The direction of sunset|
BEST|Better than all the rest|
REST|Take a break from activity|
TEST|An exam to check what you know|
TENT|A portable shelter made of fabric|
SENT|Dispatched, as a letter|
RENT|Money paid to use someone else's property|
BENT|Curved rather than straight|
LENT|Let someone borrow something|
LEND|Let someone borrow something|
SEND|Cause a letter to go somewhere|
TEND|Look after a garden|
END|The final point|
AND|A word that joins two things|
ANT|A small insect that lives in a colony|animals
ART|Creative work such as painting|
ARM|The body part between shoulder and wrist|
FARM|Land used to raise crops or animals|
FORM|A document with spaces to fill in|
FOAM|A mass of tiny bubbles|
ROAM|Wander without a fixed route|
ROAD|A paved route for vehicles|
READ|Make sense of written words|
BEAD|A small pierced piece threaded on a necklace|
BEAT|The steady rhythm of a song|
BOAT|A small vessel on water|sea
BOOT|Footwear that covers the ankle|
BOOK|Pages bound together for reading|
LOOK|Direct your eyes toward something|
COOK|Prepare food using heat|food
TOOK|Past tense of take|
TOOL|An implement used to do a job|
POOL|A basin built for swimming|
POLE|A long slender upright stick|
HOLE|An opening in a surface|
HOME|The place where you live|home
HOPE|A wish that something good will happen|
ROPE|Thick cord made of twisted strands|
ROBE|A loose garment worn after a bath|
ROVE|Wander from place to place|
LOVE|A feeling of deep affection|
MOVE|Change position|
MORE|A greater amount|
CORE|The central part of an apple|
SORE|Painful to the touch|
STORE|A place where goods are sold|
SCORE|The number of points in a game|
SPORE|A tiny reproductive cell of a fungus|
SHARE|Give someone part of what you have|
SHAPE|The outline of an object|
SHADE|Shelter from direct sunlight|
SHAKE|Move quickly back and forth|
STAKE|A pointed post driven into the ground|
STATE|One of the fifty parts of the USA|
STALE|No longer fresh, as bread|
SCALE|A device used to measure weight|
SCARE|Give someone a fright|
SPARE|An extra kept in case it is needed|
SPEAR|A weapon with a long shaft and pointed tip|
SPEAK|Say words aloud|
STEAK|A thick slice of beef|food
STEAL|Take something without permission|
STARE|Look fixedly at something|
SNARE|A trap made with a loop|
SNAKE|A reptile with no legs|animals
SKATE|Glide over ice on a blade|
PLATE|A flat dish for food|food,home
PLANE|A fixed-wing aircraft|
PLANT|A living thing that grows roots and leaves|outdoors
PLAIN|Simple and without decoration|
PAINT|Colored liquid applied to a surface|
POINT|The sharp tip of a pencil|
PRINT|Produce words or pictures on paper|
TRAIN|Linked railway cars pulled by an engine|
TRAIL|A path through the woods|outdoors
TRIAL|A formal examination of evidence in court|
BRAIN|The organ inside your skull|
GRAIN|Seeds of wheat or other cereal crops|food
DRAIN|A pipe that carries waste water away|home
CHAIN|Connected metal links|
CHAIR|A seat for one person|home
CHARM|A small ornament worn on a bracelet|
CHART|A diagram that presents information|
CHANT|Repeat words in a rhythmic way|
CHEAT|Break the rules to gain an advantage|
CHEAP|Low in price|
WHEAT|A cereal crop ground into flour|food
SWEAT|Moisture your skin releases when hot|
SWEAR|Make a solemn promise|
SHEAR|Cut the wool off a sheep|
SHEER|Very thin and transparent, as fabric|
SHEET|A large piece of fabric used on a bed|home
SHELF|A flat board used to hold things|home
SHELL|The hard outer covering of a clam|sea
SPELL|Name the letters of a word|
SMELL|Sense something with your nose|
SMILE|A happy expression on your face|
STILE|Steps for crossing a fence|
WHILE|A period of time|
WHITE|The color of fresh snow|
WRITE|Put words on a page|
QUITE|To a considerable degree|
QUIET|Making little or no noise|
QUILT|A warm bedcover stitched in layers|home
GUILT|The feeling after doing something wrong|
BUILT|Constructed something|
BUILD|Put parts together to make something|
GUILD|An association of people in the same trade|
GUIDE|Someone who shows visitors the way|
GLIDE|Move smoothly and quietly|
SLIDE|Move smoothly along a surface|
PRIDE|Satisfaction in an achievement|
BRIDE|A woman on her wedding day|
BREAD|A baked food made from flour|food
TREAD|Step or walk on something|
TREAT|Something special to enjoy|
GREAT|Very good or impressive|
GREET|Say hello to someone|
GREEN|The color of grass|
CREED|A statement of beliefs|
CREEK|A small stream|outdoors
CHEEK|The side of your face below your eye|
CHEER|A shout of encouragement|
CHEAP|Costing little money|
`; 
for(const line of additions.trim().split('\n')) { const [word,clue,tags=''] = line.split('|'); lexicon.set(word,{clue,tags:tags.split(',')}); }
for (const word of ['HART','COOT','ROVE','MACE','AIDE','TOIL','OAF']) lexicon.delete(word);
