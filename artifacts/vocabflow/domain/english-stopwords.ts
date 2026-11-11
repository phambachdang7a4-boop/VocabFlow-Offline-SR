const COMMON_STOP_WORDS = `
a about above across after again against all
also although always am an
and another any anyone anything anyway
are as at be because become becomes becoming
been before behind being below between
both but by can cannot cant could couldnt did didnt
do does doesnt doing done dont down during each either
else elsewhere enough especially even ever every everybody everyone everything
everywhere except few for former formerly from further get gets
had hadnt
has hasnt have havent having he hed hell hes hence
her here heres hereafter hereby herein hereupon hers herself him
himself his how hows however i id ill im ive
if in indeed into is isnt it its
itself just least less
let lets like little
many may maybe me meanwhile might mine more moreover
most mostly move much must mustnt my myself
neither never next no nobody none
nor normally not nothing now of off often on
once one only onto or other our
ours ourselves out outside over own quite rather really same say
says
shall shant she shed shell shes should shouldnt since so
some somebody somehow someone something sometime sometimes somewhat somewhere still
such than that thats
the their theirs them themselves then thence there theres thereafter
thereby therefore therein thereupon these they theyd theyll theyre theyve
this those though through thus to we what when where which whichever while
who whoever whom whose why will with within without would you your yours
yourself yourselves
`;

const CONTRACTION_STOP_WORDS = `
ain't aren't can't couldn't didn't doesn't don't hadn't hasn't haven't
he'd he'll he's i'd i'll i'm i've isn't it'd it'll it's let's
mightn't mustn't shan't she'd she'll she's shouldn't that'd that's there'd
there'll there's they'd they'll they're they've wasn't we'd we'll we're
we've weren't what's when's where's who's why's won't wouldn't you'd
you'll you're you've
`;

export const ENGLISH_STOP_WORDS = new Set([
  ...COMMON_STOP_WORDS.trim().split(/\s+/),
  ...CONTRACTION_STOP_WORDS.trim().split(/\s+/),
]);
