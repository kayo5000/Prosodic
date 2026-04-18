// ─── Enriched literary devices for songwriting ───────────────────────────────
// These entries have full examples, elevates, and tip fields.
// They are merged with the academic Silva Rhetoricae index (devices_data.js)
// in ToolsPage — matching entries by name get their data upgraded; non-matching
// entries are prepended so they appear first in the list.

export const RICH_DEVICES = [

  // ── COMPARISON ──────────────────────────────────────────────────────────────

  {
    name: 'Metaphor',
    category: 'Comparison',
    definition: 'States that one thing IS another — asserting a complete identity between two unlike things without using "like" or "as." The subject becomes the other thing entirely.',
    examples: [
      { line: 'I am the storm — everything you built just fell' },
      { line: 'This city is a graveyard for my dreams' },
      { line: 'My pen is a scalpel — I cut to the truth' },
    ],
    elevates: 'More forceful than a simile because it asserts truth rather than resemblance. It transforms the subject entirely, giving it a new identity the listener must inhabit. The listener doesn\'t compare — they accept. "I am the storm" hits differently than "I\'m like the storm" because it leaves no room for doubt.',
    tip: 'Extend a metaphor across multiple bars to build a full world — "I planted seeds in concrete / watered them with sweat / now the roots crack the foundation." Consistency rewards listeners who are paying attention.',
  },

  {
    name: 'Simile',
    category: 'Comparison',
    definition: 'A direct comparison between two unlike things using "like" or "as." Unlike a metaphor, it acknowledges the comparison — it invites the listener to see one thing through another.',
    examples: [
      { line: 'My life\'s like a bullet — straight through the pain' },
      { line: 'Hard as the concrete I came up on' },
      { line: 'Cold like the winters that raised me, sharp like the hunger' },
    ],
    elevates: 'Instantly bridges abstract emotion with vivid, physical imagery. The listener feels the meaning rather than just hearing it. The "like" or "as" signals a poet at work — deliberate comparison, not accident. It adds speed and punch without over-explaining.',
    tip: 'The more unexpected the comparison, the more memorable the line. Avoid clichés like "cold as ice" — reach for something specific to your world and your experience. "Hard as the smell of bleach in a hallway at 3am" is specific. That specificity is the art.',
  },

  {
    name: 'Extended Metaphor',
    category: 'Comparison',
    definition: 'A metaphor developed across multiple lines, bars, or an entire song — sustaining and elaborating a single comparison throughout, so every element of the metaphor maps onto the subject.',
    examples: [
      { line: 'I planted seeds in concrete / watered them with sweat and time / watched the roots crack through the surface / now they call it overtime' },
      { line: 'I\'m the ship and the ocean / I made the waves and rode them / built the storm and survived it / now I\'m the one who controls it' },
    ],
    elevates: 'Creates a coherent world inside the verse. Every bar feeds into the same image, building cumulative weight and giving the listener a complete picture. It rewards multiple listens — the listener finds new layers in the extended metaphor each time.',
    tip: 'Plan the full arc before you write. What is the subject? What is it compared to? What properties of that comparison map onto the subject? Map it out, then write the bars from the inside of that world.',
  },

  {
    name: 'Personification',
    category: 'Comparison',
    definition: 'Giving human qualities — emotions, actions, intentions, or traits — to non-human things, objects, or abstract concepts.',
    examples: [
      { line: 'The city never sleeps — it just forgets your name' },
      { line: 'Success knocked twice — I wasn\'t home' },
      { line: 'Pain moved in like a tenant and never paid rent' },
    ],
    elevates: 'Creates emotional intimacy with the subject. When hunger "bites" or silence "screams," the listener connects emotionally to what would otherwise be a cold concept. It gives abstract forces a face — and a face can be confronted, loved, or fought.',
    tip: 'Works best when the human trait assigned creates irony or tension — pain that "smiles," or hope that "turns its back." The tension between the familiar human trait and the unfamiliar subject is where the power lives.',
  },

  {
    name: 'Allegory',
    category: 'Comparison',
    definition: 'An extended narrative in which characters, events, or settings represent abstract ideas or moral qualities. The surface story carries a deeper meaning — it\'s a metaphor sustained across an entire composition.',
    examples: [
      { line: 'The whole verse is about a man walking through a city at night — but the city is his mind, the doors are decisions, and the darkness is doubt' },
      { line: 'A song about building a house that\'s actually about building a life, a career, a legacy' },
    ],
    elevates: 'Allows complex philosophical or moral ideas to be felt rather than argued. The listener experiences the idea through story — which is always more powerful than direct statement. Allegory is how you say the most important thing without saying it.',
    tip: 'Keep the surface story fully coherent on its own. The allegory should work as a literal story first — then, for the listener paying attention, the second meaning emerges. If the literal doesn\'t hold, the allegory collapses.',
  },

  {
    name: 'Conceit',
    category: 'Comparison',
    definition: 'An elaborate, extended comparison between two very different things — often surprising or intellectually striking. A conceit pushes a metaphor to its logical extreme, finding unexpected parallels between unlikely subjects.',
    examples: [
      { line: 'My loyalty is a building permit — you still gotta earn the right to build here' },
      { line: 'Love is a record deal — they sign you when you\'re hungry and drop you when you\'re established' },
    ],
    elevates: 'Forces the listener to think. A conceit doesn\'t just describe — it argues. It says: these two things that seem unrelated are actually the same. That intellectual leap creates delight when it lands, and reveals something true about both subjects.',
    tip: 'The best conceits reveal an insight, not just a comparison. Push the metaphor further than feels comfortable — what else is true about both subjects? What\'s the comparison that makes the listener say "I never thought of it that way"?',
  },

  {
    name: 'Synesthesia',
    category: 'Comparison',
    definition: 'Describing one sense in terms of another — blending sight, sound, taste, touch, and smell in ways that create layered, sensory-rich images.',
    examples: [
      { line: 'The bass was a warm color, orange and low' },
      { line: 'Her silence had a texture — rough like burlap on skin' },
      { line: 'The grief tasted like iron and old smoke' },
    ],
    elevates: 'Creates images that are harder to forget because they engage multiple senses simultaneously. The reader\'s brain has to do extra work — and that work makes the image stick. It also signals a heightened, almost altered state of perception.',
    tip: 'Let the emotional state drive the sensory blend. Grief might have a smell. Joy might have a texture. Joy might sound like a color. Follow the feeling, not the logic.',
  },

  // ── SOUND ────────────────────────────────────────────────────────────────────

  {
    name: 'Alliteration',
    category: 'Sound',
    definition: 'Repetition of the same consonant sound at the beginning of nearby words — creating a sonic pattern that locks words together and drives the line forward.',
    examples: [
      { line: 'Broken by the burdens I been bearing' },
      { line: 'Silence speaks softer than screams' },
      { line: 'Grinding through the gravel, growing past the grief' },
    ],
    elevates: 'Creates musicality and rhythm that makes lines "stick." The sonic texture reinforces the emotional weight of the words, making the line feel inevitable — like it couldn\'t have been written any other way. It also creates speed; alliterative phrases accelerate naturally.',
    tip: 'Don\'t force every word — 2-3 hits is usually stronger than 5. Mix alliteration with internal rhyme for maximum sonic density. The alliterating words should be the most important words in the line — let the sound highlight the meaning.',
  },

  {
    name: 'Assonance',
    category: 'Sound',
    definition: 'Repetition of vowel sounds within nearby words — creating internal rhyme and sonic texture even when the words don\'t end-rhyme. It\'s the vowel hum underneath a bar.',
    examples: [
      { line: 'I know the road is long and cold and slow' },
      { line: 'Feel the real deal — steel will heal' },
      { line: 'Time flies, high rise, blind eyes on the prize' },
    ],
    elevates: 'Creates a melody within the line itself — the verse flows even without obvious end rhyme. It\'s the secret weapon of rappers who sound musical without relying on simple rhyme schemes. Assonance is what makes a line feel inevitable before the listener can explain why.',
    tip: 'Use assonance to link words conceptually — "the pain remains the same" creates a loop that feels like the emotion it describes. Pick one vowel sound and thread it through the bar wherever it fits naturally.',
  },

  {
    name: 'Consonance',
    category: 'Sound',
    definition: 'Repetition of consonant sounds within or at the end of nearby words — not just at the start (that\'s alliteration). Consonance creates texture throughout the line.',
    examples: [
      { line: 'I stay strong, still standing, straight through the storm' },
      { line: 'Gripped the script, kept it crisp' },
      { line: 'Dark park, hard heart, sharp art' },
    ],
    elevates: 'Gives a line physical density — the repeated consonants create a tactile feeling when spoken. Hard consonants (K, T, G) create impact; soft consonants (L, M, N) create flow. Choosing consonants is choosing the emotional texture of the bar.',
    tip: 'Pick a consonant cluster that matches your emotional intent. Sharp stops (P, T, K) convey anger, determination, precision. Soft continuants (L, S, M) convey sadness, reflection, intimacy.',
  },

  {
    name: 'Internal Rhyme',
    category: 'Sound',
    definition: 'A rhyme that occurs within a single line — not just at the end. Internal rhymes can hit anywhere in the bar, creating rhythmic surprise and sonic density.',
    examples: [
      { line: 'I been grinding through the timing, never finding what I\'m fighting for' },
      { line: 'I stay patient, no wasting time on the basics' },
      { line: 'I\'m ancient with the cadence, never fading — stay amazing' },
    ],
    elevates: 'Internal rhyme makes every part of the bar carry weight — not just the end word. It creates the feeling of a line that is "full," overflowing with sound. The best rappers make internal rhyme feel effortless, like the words naturally rhyme with themselves.',
    tip: 'Map the stress pattern of your bar first, then look for rhyme opportunities on stressed syllables inside the line. The internal rhyme should land on a word that also carries meaning — not just a filler word.',
  },

  {
    name: 'Slant Rhyme',
    category: 'Sound',
    definition: 'A near-rhyme where words share similar but not identical sounds — often vowel sounds or final consonants that echo without perfectly matching. Also called half rhyme, near rhyme, or off-rhyme.',
    examples: [
      { line: '"game" / "pain" / "rain" / "same" — the AY family holds even without perfect matches' },
      { line: '"breath" / "death" — close enough to feel connected' },
      { line: '"home" / "gone" / "road" — the OH sound links them across difference' },
    ],
    elevates: 'Slant rhyme feels more sophisticated than perfect rhyme because it demands more craft. It tells the listener you\'re not forced into any single word — you chose from a wider vocabulary. It also creates productive dissonance: the expectation of rhyme meets slight surprise.',
    tip: 'The best slant rhymes share the same stressed vowel sound even when the surrounding consonants differ. Build your rhyme families around vowel sounds (AY, OH, EE, OW) and find every word in that family — not just the obvious ones.',
  },

  {
    name: 'Onomatopoeia',
    category: 'Sound',
    definition: 'Words whose sound imitates or evokes the thing they describe — the word itself performs its meaning through phonetics.',
    examples: [
      { line: 'The bass boom knocked the ash off the blunt' },
      { line: 'Sirens wail, gavel cracks, handcuffs click' },
      { line: 'The crowd hisses, the beat buzzes, the snare snaps' },
    ],
    elevates: 'Makes language physical — the sound of the word becomes the experience of the thing. When a line uses onomatopoeia well, the listener doesn\'t just understand — they feel it. It\'s the difference between describing a punch and landing one.',
    tip: 'Look for opportunities where the sound of a word can do double duty — describing both the thing and the emotion it carries. "Crack" is a fact. "Crack like a whip on a cold morning" is an experience.',
  },

  {
    name: 'Rhyme Scheme',
    category: 'Sound',
    definition: 'The intentional pattern of end rhymes across multiple lines — AABB (couplets), ABAB (alternating), ABCB (ballad), AAAA (monorhyme), and more. The scheme creates expectation and shapes how the verse breathes.',
    examples: [
      { line: 'AABB: "I been grindin\' since a teen, never stopped for a break / everything I built was real, none of it was fake"' },
      { line: 'ABAB: "I stood alone" / "then lost the faith" / "I made my way" / "I found my place"' },
      { line: 'AAAA: "I grind it / I find it / I shine it / I mind it"' },
    ],
    elevates: 'The rhyme scheme gives the verse its formal architecture — it shapes breathing, pacing, and release. Switching schemes mid-verse creates intentional rupture. Using an unusual scheme creates instant originality — no one else is writing AAA triplets the same way.',
    tip: 'Choose your scheme based on the emotion. Couplets (AABB) are declarative, forward-moving. Alternating (ABAB) creates tension and release. Monorhyme (AAAA) is overwhelming, relentless. The scheme should feel like the subject.',
  },

  // ── REPETITION ───────────────────────────────────────────────────────────────

  {
    name: 'Anaphora',
    category: 'Repetition',
    definition: 'Repeating the same word or phrase at the beginning of successive lines or clauses — creating a hammer-like rhythm that builds momentum and emotional force.',
    examples: [
      { line: 'I built this with my hands / I bled for every plan / I stood when no one can' },
      { line: 'Every scar is a lesson / Every lesson is a gift / Every gift cost me something' },
      { line: 'We came from nothing / We built from nothing / We rise from nothing' },
    ],
    elevates: 'Builds momentum and emotional accumulation. Each repeated opening hammers the point deeper while the second half of each line pivots — the contrast creates power. It creates a preacher-like cadence that commands attention and demands to be felt.',
    tip: 'Perfect for hooks and bridge sections. The repetition locks the listener in, then each ending delivers a new blow. Vary the emotional register of each ending — start with a fact, move to feeling, end with revelation.',
  },

  {
    name: 'Epistrophe',
    category: 'Repetition',
    definition: 'Repeating the same word or phrase at the END of successive lines or clauses — the mirror image of anaphora. The repeated word lands like punctuation at the close of each thought.',
    examples: [
      { line: 'They doubted me — I survived / They counted me out — I survived / They left me for dead — I survived' },
      { line: 'I did it for the block / built it for the block / bled for the block' },
    ],
    elevates: 'The closing word becomes a refrain, a declaration, a seal. Where anaphora builds toward something, epistrophe settles on something — it\'s the word you keep coming back to because it\'s the truth. It creates finality and insistence.',
    tip: 'Choose the ending word carefully — it needs to be strong enough to bear weight. A weak word repeated sounds like stuttering. A powerful word repeated sounds like conviction.',
  },

  {
    name: 'Anadiplosis',
    category: 'Repetition',
    definition: 'Ending one line with a word and beginning the next line with the same word — creating a chain where each link grows from the one before it.',
    examples: [
      { line: 'Pain builds walls / walls keep out the light / light is what I\'m chasing' },
      { line: 'The grind made me hard / hard enough to survive / survive long enough to thrive' },
    ],
    elevates: 'Creates a sense of inevitability — each idea growing out of the last one, like a chain of cause and effect. It\'s a logical and emotional escalation built into the sound. The verse doesn\'t just assert; it reasons.',
    tip: 'Use anadiplosis when you want to show how one thing leads to another. It\'s perfect for narrative escalation — "poverty led to hustle / hustle led to risk / risk led to loss / loss led to wisdom."',
  },

  {
    name: 'Antimetabole',
    category: 'Repetition',
    definition: 'Repeating words in reversed order — using the same words twice but flipping them so each phrase inverts the other. The reversal reveals a new truth in the same words.',
    examples: [
      { line: 'I lived for the music — now the music lives in me' },
      { line: 'You made me hard, and hardness made you' },
      { line: 'I used to run from my past — now my past runs through me' },
    ],
    elevates: 'Creates a feeling of completeness and inevitability. The reversal makes the line feel like a law of nature — a statement so balanced it must be true. Extremely quotable because the structure itself signals importance.',
    tip: 'Some of the most quoted lines in history are antimetabole ("Ask not what your country can do for you..."). Perfect for hooks and closing bars — the reversal creates a natural pause for impact.',
  },

  {
    name: 'Parallelism',
    category: 'Repetition',
    definition: 'Using the same grammatical structure for a series of phrases or clauses — "I came, I saw, I conquered." The parallel structure creates rhythm, balance, and cumulative force.',
    examples: [
      { line: 'I came from the bottom / I built from the ground / I rose without permission' },
      { line: 'Fighting for respect, dying for a name, living for a legacy' },
      { line: 'Gave them everything — my time, my trust, my tears' },
    ],
    elevates: 'The parallel structure creates unconscious expectation in the listener — they anticipate the next element before it arrives, then feel satisfaction when it lands. Breaking the parallel at the end (parallelism with a twist) creates even more power.',
    tip: 'Vary the length of the parallel units for more impact. Three short units followed by one long one creates a buildup-and-release. Three long units followed by one short creates a sudden stop.',
  },

  {
    name: 'Chiasmus',
    category: 'Structure',
    definition: 'Reversing the grammatical structure of the second clause to mirror the first — A-B / B-A. Not the same words reversed (that\'s antimetabole), but the same grammatical structure reversed with different words.',
    examples: [
      { line: 'I lived for the music — now the music lives in me' },
      { line: 'You made me hard, and hardness made you' },
      { line: 'Work hard in silence — let success make the noise' },
    ],
    elevates: 'Creates a feeling of completeness and inevitability. The reversal makes the line feel like a law of nature. Extremely quotable — the structure itself signals importance. It carries the authority of a proverb.',
    tip: 'Think of chiasmus as a pivot. The first half states something. The second half flips the perspective. The flip should reveal something — not just repeat in reverse, but show the same truth from the other side.',
  },

  {
    name: 'Enjambment',
    category: 'Structure',
    definition: 'Continuing a thought past the end of a line without pause — the meaning spills across the line break, creating tension between where the sound stops and where the sense completes.',
    examples: [
      { line: 'I told myself I\'d stop when I / couldn\'t feel the weight no more' },
      { line: 'Everything I built, I built it / on top of what they said I\'d never have' },
      { line: 'The only thing that kept me going was / nothing — I just kept going' },
    ],
    elevates: 'Creates anticipation and momentum. The listener is pulled forward into the next bar. Also allows unexpected meaning — the end of one bar can stand alone before the second half changes it. The break itself becomes a beat.',
    tip: 'Use enjambment deliberately to delay a punchline or revelation. Let the line break create a false resolution before the next bar corrects it. "I almost gave up — / almost."',
  },

  {
    name: 'Tricolon',
    category: 'Structure',
    definition: 'A series of three parallel elements — three words, phrases, or clauses. Three is the magic number in rhetoric because it creates completeness: setup, development, resolution.',
    examples: [
      { line: 'I grind, I grow, I glow' },
      { line: 'Built from pain, forged in faith, finished in fire' },
      { line: 'I came with nothing / I lost everything / I rebuilt from less' },
    ],
    elevates: 'Three is the minimum for a pattern and the maximum before it becomes a list. Two feels incomplete. Four feels excessive. Three feels inevitable. The third element carries all the weight — it\'s the punch after the setup.',
    tip: 'Escalate across the three elements — each one should be stronger, more emotional, or more surprising than the last. The third element is the one they remember.',
  },

  {
    name: 'Asyndeton',
    category: 'Structure',
    definition: 'Omitting conjunctions ("and," "but," "or") between words or clauses — letting them hit directly against each other without connective tissue.',
    examples: [
      { line: 'I grind, I built, I bled, I rose' },
      { line: 'No sleep, no breaks, no excuses, no stopping' },
      { line: 'Came in hungry, left a legend' },
    ],
    elevates: 'Creates speed, urgency, and intensity. The absence of "and" removes the pause — every item hits immediately after the last. It signals that there\'s too much to list properly, that the speaker is overflowing with content.',
    tip: 'Use asyndeton for lists where you want relentless forward motion. It\'s perfect for bragging bars, survival narratives, or lists of accomplishments. The listener feels the weight of everything accumulated.',
  },

  {
    name: 'Polysyndeton',
    category: 'Structure',
    definition: 'Using conjunctions between every item in a list ("and... and... and...") — the opposite of asyndeton. Every "and" adds weight, slowing the list and making each item feel heavy.',
    examples: [
      { line: 'I lost my job and my girl and my house and my mind and still I stayed standing' },
      { line: 'They took the money and the respect and the time and the youth' },
    ],
    elevates: 'The repeated "and" creates a feeling of accumulation that never ends — like loss or grief that keeps adding to itself. Where asyndeton rushes, polysyndeton trudges. Each "and" signals: there\'s more. It never stops.',
    tip: 'Use polysyndeton when you want the listener to feel the weight of what\'s being listed. Not celebrating — grieving, cataloguing, overwhelmed. The "and" isn\'t additive, it\'s exhausted.',
  },

  {
    name: 'Aposiopesis',
    category: 'Structure',
    definition: 'Breaking off a sentence mid-thought — leaving it incomplete, unfinished. The silence after the break carries more than words could.',
    examples: [
      { line: 'I would\'ve done anything for you. I would\'ve died for — ' },
      { line: 'If you knew what I\'ve been through, you\'d understand why I...' },
      { line: 'The look on her face when I said I was leaving. I can\'t even—' },
    ],
    elevates: 'Forces the listener to complete the thought themselves. Whatever they imagine is more powerful than anything you could write — because it comes from inside them. The unfinished line creates intimacy: you\'ve said something too painful to finish.',
    tip: 'Use aposiopesis for the most emotionally overwhelming moments — the things that genuinely cannot be completed. Don\'t use it as a gimmick. It only works when the listener believes you couldn\'t continue.',
  },

  // ── CONTRAST & IRONY ─────────────────────────────────────────────────────────

  {
    name: 'Irony',
    category: 'Contrast & Irony',
    definition: 'A gap between what is said and what is meant — verbal irony says the opposite of what\'s intended; situational irony describes a twist where what happens is the opposite of what\'s expected.',
    examples: [
      { line: 'Got rich and somehow ended up with less' },
      { line: 'They gave me a crown made of thorns — called it a blessing' },
      { line: 'Finally made it to the top. Nobody there.' },
    ],
    elevates: 'Creates depth and sophistication. The listener has to do cognitive work to get the full meaning — that engagement makes the line memorable. Irony also signals intelligence: you see the contradiction in things that most people accept at face value.',
    tip: 'Verbal irony (saying the opposite of what you mean) works well in verses — it sounds like braggadocio but carries critique. Situational irony (the twist) works best in storytelling bars. Don\'t explain the irony — trust the listener.',
  },

  {
    name: 'Oxymoron',
    category: 'Contrast & Irony',
    definition: 'Combining two contradictory terms into a single phrase — creating a paradox compressed into two words. "Deafening silence." "Living death." "Bittersweet." The contradiction is the point.',
    examples: [
      { line: 'I\'m the world\'s most famous nobody' },
      { line: 'This deafening silence is the loudest I\'ve ever heard' },
      { line: 'We were building something beautiful and destroying each other' },
    ],
    elevates: 'Captures the complexity of experience — moments that are simultaneously two contradictory things. Life rarely fits one description, and an oxymoron honors that. It also creates instant memorability: the brain pauses on the contradiction.',
    tip: 'The best oxymorons reveal a truth that couldn\'t be expressed any other way. "Violent peace," "loving hatred" — the contradiction isn\'t decoration, it\'s the whole idea. Find the contradiction that describes the feeling exactly.',
  },

  {
    name: 'Paradox',
    category: 'Contrast & Irony',
    definition: 'A statement that seems contradictory or absurd but contains a deeper truth. Unlike an oxymoron (two words), a paradox is usually a full statement or claim that must be thought through to be understood.',
    examples: [
      { line: 'I had to lose everything to understand what I had' },
      { line: 'The only way out was further in' },
      { line: 'The strongest thing I ever did was admit I was weak' },
    ],
    elevates: 'Creates philosophical depth. A paradox rewards reflection — the listener keeps turning it over because it shouldn\'t work but does. It signals wisdom earned through contradiction, not from a textbook.',
    tip: 'A paradox must be genuinely true, not just contradictory. Test it: is the seeming contradiction actually a deeper insight? "The strongest thing is weakness" works because vulnerability builds real strength. Pure nonsense isn\'t paradox, it\'s confusion.',
  },

  {
    name: 'Antithesis',
    category: 'Contrast & Irony',
    definition: 'Juxtaposing two contrasting ideas in parallel grammatical structure — placing opposing concepts side by side to create maximum contrast and clarity.',
    examples: [
      { line: 'They built walls / I built bridges' },
      { line: 'You chase the crowd / I lead the lonely' },
      { line: 'Short memories, long paper — that\'s the game' },
    ],
    elevates: 'Creates clarity through contrast — the difference between the two things becomes sharper when they\'re placed next to each other. Antithesis is also argumentation: it asserts a value by showing its opposite.',
    tip: 'The grammatical parallel is essential — both halves should mirror each other structurally. The contrast should reveal something true about the world or the speaker\'s position within it, not just be decoration.',
  },

  {
    name: 'Juxtaposition',
    category: 'Contrast & Irony',
    definition: 'Placing two contrasting ideas, images, or situations side by side without necessarily using parallel structure — letting the contrast create meaning through proximity.',
    examples: [
      { line: 'Gold teeth and empty fridges / private jets and public trauma' },
      { line: 'She prayed every morning, ran every night, and still never made it out' },
      { line: 'The man with everything had nothing. The man with nothing had everything.' },
    ],
    elevates: 'Creates tension and complexity. Shows that you see both sides of a truth — that nothing is simple. Forces the listener to hold two realities at once, which is closer to actual experience than any single perspective can be.',
    tip: 'The most powerful juxtapositions are true contradictions from your actual experience, not manufactured opposites. "I bought my mother a house the same year I lost my faith" — that\'s a juxtaposition that happened.',
  },

  {
    name: 'Understatement',
    category: 'Contrast & Irony',
    definition: 'Deliberately saying less than the situation warrants — downplaying the significance of something for rhetorical effect. The understatement implies the full weight of what\'s being minimized.',
    examples: [
      { line: 'It wasn\'t the best year of my life' },
      { line: 'I had a few issues back then' },
      { line: 'We had our differences' },
    ],
    elevates: 'Creates dark humor, emotional control, and authority. The listener fills in the gap between the mild statement and the enormous reality it minimizes. It signals that the speaker has been through so much that hyperbole would be redundant — the facts need no amplification.',
    tip: 'Understatement works best after the listener already knows the weight of what\'s being understated. Set up the severity, then undercut it. The gap between the setup and the understatement is where the meaning lives.',
  },

  // ── EMPHASIS & AMPLIFICATION ─────────────────────────────────────────────────

  {
    name: 'Hyperbole',
    category: 'Emphasis & Amplification',
    definition: 'Deliberate exaggeration used for emphasis or effect — not meant to be taken literally. Hyperbole says: this feeling is too large for ordinary language.',
    examples: [
      { line: 'I\'ve cried enough tears to flood this whole block' },
      { line: 'Waited a million years for one moment of peace' },
      { line: 'I could eat this city alive and still be hungry' },
    ],
    elevates: 'Translates intense internal states into language that matches their scale. Tells the listener "this feeling is too big for ordinary words" — and they believe you. It also creates humor and wit when used for braggadocio.',
    tip: 'Ground hyperbole in specific, real imagery to keep it from feeling cartoonish. "I\'ve been running since birth" hits harder than "I\'ve been running forever." The specific exaggeration is more believable than the vague one.',
  },

  {
    name: 'Climax',
    category: 'Emphasis & Amplification',
    definition: 'Arranging a series of elements in order of increasing importance, intensity, or power — building from the weakest to the strongest, from the smallest to the largest.',
    examples: [
      { line: 'I started as a child, became a student, became a craftsman, became a legend' },
      { line: 'They whispered about me, then talked, then argued, then finally listened' },
      { line: 'First I lost the money. Then the pride. Then I almost lost myself.' },
    ],
    elevates: 'Creates forward momentum and emotional escalation. The listener feels the buildup, anticipates the peak, and is rewarded when it arrives. Each step makes the next one possible — the structure teaches the listener what to expect and then exceeds it.',
    tip: 'The sequence must genuinely escalate — each item must be bigger or more intense than the last. If the order is arbitrary, it\'s just a list. If it builds, it\'s a climax. Test it: would changing the order weaken the impact?',
  },

  // ── IMAGERY & DESCRIPTION ────────────────────────────────────────────────────

  {
    name: 'Imagery',
    category: 'Imagery & Description',
    definition: 'Language that appeals to the senses — sight, sound, touch, taste, smell — creating mental pictures and physical experiences through words. Imagery is the art of putting the listener inside the scene.',
    examples: [
      { line: 'The hallway smelled like cigarettes and old apologies' },
      { line: 'Streetlight hitting puddles, red and gold, 3am and nothing moving' },
      { line: 'The mattress springs pressing through the sheet, the cold coming through the window crack' },
    ],
    elevates: 'Transports the listener into the scene rather than telling them about it. Specific sensory detail creates authenticity — it signals that you were actually there. Abstract statements can be dismissed; sensory images cannot be unfelt.',
    tip: 'The more specific and unexpected the sensory detail, the more powerful. "A cold room" is nothing. "The mattress springs pressing through the sheet" is a scene. Go for the detail that only someone who was there would know.',
  },

  {
    name: 'Symbolism',
    category: 'Imagery & Description',
    definition: 'Using a concrete object, person, or place to represent an abstract idea or larger theme. The symbol carries meaning beyond its literal surface.',
    examples: [
      { line: 'This chain ain\'t jewelry — it\'s everything I survived' },
      { line: 'I planted roses in the rubble of my father\'s name' },
      { line: 'The key to the city they gave me was hollow. Nothing opens.' },
    ],
    elevates: 'Allows you to carry enormous emotional weight through small, concrete images. The symbol does double duty — it exists on the surface and underneath it simultaneously. It rewards the listener who pays attention.',
    tip: 'Let the symbol speak for itself — don\'t explain it. If you build enough context, the listener will feel what the symbol means. The moment you say "this represents..." the symbol loses its power. Trust the image.',
  },

  {
    name: 'Motif',
    category: 'Imagery & Description',
    definition: 'A recurring image, phrase, or idea throughout a song or verse — a thread that weaves through the work, gaining more meaning each time it appears.',
    examples: [
      { line: 'Returning to the image of hands across an entire album — working hands, praying hands, reaching hands, empty hands' },
      { line: 'Planting a phrase in bar 1 and returning to it in bar 16 with a different meaning' },
    ],
    elevates: 'Creates cohesion and depth. The first instance plants; each return harvests more meaning. The listener who recognizes the motif\'s return feels rewarded — included in the craft. Motif is how a song becomes a world, not just a sequence of bars.',
    tip: 'The motif should change meaning each time it appears. Same image, new context, deeper truth. The final return should feel like the inevitability that was always hidden in the first appearance.',
  },

  // ── WORDPLAY ─────────────────────────────────────────────────────────────────

  {
    name: 'Pun',
    category: 'Wordplay',
    definition: 'A play on words that exploits multiple meanings of the same word, or words that sound similar but mean different things. A pun creates two meanings simultaneously.',
    examples: [
      { line: '"I\'m at a higher level" — altitude and consciousness' },
      { line: '"I\'ve been through the fire" — literal hardship and spiritual refinement' },
      { line: '"They said I was basic, I upgraded to acid" — chemistry and cultural commentary' },
    ],
    elevates: 'Rewards the listener who catches the second meaning — they feel smart for getting it. A well-landed pun creates delight, demonstrates wit, and says two things at once. In hip-hop, this is the backbone of wordplay bars.',
    tip: 'The best puns are invisible at first — the surface meaning carries the sentence, the second meaning is discovered. Force-feeding a pun ruins it. Let both meanings coexist naturally in the same line.',
  },

  {
    name: 'Double Entendre',
    category: 'Wordplay',
    definition: 'A phrase with two interpretations — one obvious and acceptable on the surface, one secondary and often more charged, subversive, or revealing. The phrase works on both levels simultaneously.',
    examples: [
      { line: '"I keep my circle tight" — loyal crew AND protective boundaries' },
      { line: '"I\'m always working on my craft" — writing AND a boat navigating rough waters' },
      { line: '"They never saw me coming" — surprise success AND invisibility as a weapon' },
    ],
    elevates: 'Creates layers of meaning that reward multiple listens. The surface reads clean; the second reading reveals more. Double entendre is the art of saying what you really mean inside something that looks like you\'re saying something else.',
    tip: 'The two meanings must both be strong — not one real meaning and one accidental coincidence. Build the line so either reading makes complete sense on its own. The intersection of both meanings is where the genius lives.',
  },

  {
    name: 'Antanaclasis',
    category: 'Wordplay',
    definition: 'Repeating a word but in a different or contrasting sense each time — the same word, two meanings, placed close together to create a pivot or reversal.',
    examples: [
      { line: '"Your argument is sound — all sound, no substance"' },
      { line: '"I can\'t take any more — take it or leave it"' },
      { line: '"We have to work harder so that work doesn\'t become our whole life"' },
    ],
    elevates: 'Creates a verbal snap — the word shifts underneath the listener and they feel it. It\'s the rhetorical equivalent of pulling the rug. Used well, it creates wit, insight, and a memorable turn in the verse.',
    tip: 'The two meanings should be genuinely different — not just shades of the same meaning. The more the meanings diverge, the stronger the snap. Find words with wide semantic range: work, light, cold, hard, right, free.',
  },

  {
    name: 'Polyptoton',
    category: 'Wordplay',
    definition: 'Repeating a word but in a different grammatical form — changing from noun to verb, verb to adjective, singular to plural. The word transforms while staying the same word.',
    examples: [
      { line: '"The strong don\'t just survive — they strengthen everything around them"' },
      { line: '"I fought the good fight and found something worth fighting for"' },
      { line: '"I love the way she loved" — past and present, the same love across time' },
    ],
    elevates: 'Shows mastery of language — the speaker is in command of every form a word can take. It creates a sense of completeness, as if the word has been turned over and examined from every angle. It can also reveal irony in the transformation.',
    tip: 'Use polyptoton when you want to explore the full meaning of a word. The transformation should reveal something — how the quality of "strength" differs from the act of "strengthening." The form change carries the insight.',
  },

  // ── REFERENCE ────────────────────────────────────────────────────────────────

  {
    name: 'Allusion',
    category: 'Reference',
    definition: 'An indirect reference to a person, event, work of art, or cultural idea — importing the weight of that entire story into a single phrase without explaining it.',
    examples: [
      { line: 'Built like David — they all sleep on Goliath' },
      { line: 'This is my Lazarus moment — watch me rise from what they buried me in' },
      { line: 'Turned water into wine, and still they questioned the miracle' },
    ],
    elevates: 'Layers meaning by importing the weight of an entire story into a single phrase. Creates connection with listeners who get the reference, and rewards re-listening. Each allusion is a door — those who know the reference walk through it into a richer meaning.',
    tip: 'Allusions work best when they\'re precise. "My Judas moment" tells a whole story. Mix biblical, historical, and pop-culture references for range. The reference should add meaning, not just decorate — the listener should understand the verse MORE because of the allusion.',
  },

  // ── ADDRESS ──────────────────────────────────────────────────────────────────

  {
    name: 'Apostrophe',
    category: 'Address',
    definition: 'Directly addressing an absent person, an abstract concept, or an inanimate object as if it can hear you — turning away from the present audience to speak to something or someone else.',
    examples: [
      { line: 'Fear, I\'ve been carrying you since I was nine years old' },
      { line: 'God, if you\'re listening, I got one more ask' },
      { line: 'Success, you kept me waiting. Now I\'m on time.' },
    ],
    elevates: 'Creates intense emotional intimacy. Suddenly the song becomes a direct conversation — the listener feels like they\'re witnessing something private and real. It signals vulnerability and courage: the speaker is saying something that couldn\'t be said in ordinary address.',
    tip: 'Works especially well for addressing the self, dead loved ones, or abstract forces like time, pain, or success. It makes the lyric feel confessional — like the listener is overhearing something not meant for them.',
  },

  {
    name: 'Prosopopoeia',
    category: 'Address',
    definition: 'Giving voice to an absent or imaginary person, or to an abstract concept — making something that cannot speak actually speak. Related to personification but specifically about giving voice.',
    examples: [
      { line: 'And if the streets could talk, they\'d say: "I watched you fall and I watched you get up"' },
      { line: 'If my city had a voice it would sound like: tired, proud, alive, forgotten' },
      { line: 'Death told me: not yet. Twice.' },
    ],
    elevates: 'Allows the speaker to give voice to perspectives that can\'t speak for themselves — places, concepts, the dead, the future. It\'s a way to externalize internal truth through invented speech. What "the streets would say" is really what the speaker knows.',
    tip: 'Use prosopopoeia sparingly — it\'s striking precisely because it\'s unusual. The voice you invent should reveal a truth the speaker couldn\'t state directly. What does your city say that you can\'t say for yourself?',
  },

  // ── ARGUMENT & LOGIC ─────────────────────────────────────────────────────────

  {
    name: 'Rhetorical Question',
    category: 'Argument & Logic',
    definition: 'A question asked for effect — not to receive an answer, but to make a point, challenge the listener, or lead them to a conclusion the speaker has already drawn.',
    examples: [
      { line: 'If they never believed in me, why are they here now?' },
      { line: 'How long can you keep running from what you built?' },
      { line: 'What do you call someone who gives everything and gets nothing back?' },
    ],
    elevates: 'Engages the listener directly — makes them participate in the argument. The question creates a gap, and the listener\'s mind rushes to fill it. If the implied answer is obvious, the rhetorical question makes the listener feel they\'ve arrived at the insight themselves.',
    tip: 'The rhetorical question should have a clear implied answer — don\'t use it to create confusion, use it to create conviction. The listener should feel: "Obviously. That\'s exactly right." And then feel that YOU said it.',
  },

  {
    name: 'Aporia',
    category: 'Argument & Logic',
    definition: 'Expressing genuine or performed doubt — openly admitting uncertainty about where to begin, what to say, or whether something is true. Not weakness, but honest hesitation used rhetorically.',
    examples: [
      { line: 'I don\'t even know where to start. Maybe that\'s the start.' },
      { line: 'Was it strength or was it fear? I stopped being able to tell the difference.' },
      { line: 'I\'m not sure what I\'m building. I just know I have to build it.' },
    ],
    elevates: 'Creates intimacy and credibility. The speaker who admits doubt is trusted — they\'re not performing certainty they don\'t feel. It signals self-awareness and invites the listener into the speaker\'s uncertainty rather than lecturing from above.',
    tip: 'Aporia works best before a revelation — admitting you don\'t know sets up the discovery. "I had no idea who I was / but I knew exactly what I wasn\'t" — the aporia makes the clarity that follows more powerful.',
  },

  {
    name: 'Hypophora',
    category: 'Argument & Logic',
    definition: 'Asking a question and then immediately answering it yourself — you raise the doubt and resolve it in the same breath.',
    examples: [
      { line: 'What made me different? Nothing. I just refused to stop.' },
      { line: 'Why am I still here? Because this city made me and I owe it something.' },
      { line: 'Did I make it? Not yet. But I\'m closer than I was yesterday.' },
    ],
    elevates: 'Creates a dynamic of challenge-and-response within a single speaker. It demonstrates confidence — you can ask the hardest question and answer it immediately. It pre-empts the listener\'s doubt and dismantles it in real time.',
    tip: 'Use hypophora when you want to steer the listener\'s thinking. You control both the doubt and the resolution. The question should be one the listener might actually have — answer it before they can hold it against you.',
  },

  // ── EMOTION & TONE ───────────────────────────────────────────────────────────

  {
    name: 'Pathos',
    category: 'Emotion & Tone',
    definition: 'An appeal to the emotions of the listener — writing that is designed to move, to create empathy, grief, fear, joy, or longing. Not manipulation but authentic emotional communication.',
    examples: [
      { line: 'She never saw the graduation. She was supposed to be in the front row.' },
      { line: 'I called and the number was disconnected. That was how I found out.' },
      { line: 'He saved for 30 years. They took it in one night.' },
    ],
    elevates: 'The most powerful writing creates feeling — not just understanding. When a listener connects emotionally, they carry the song with them. Pathos is the bridge between the speaker\'s experience and the listener\'s heart.',
    tip: 'Specific details create more pathos than general statements. "She was supposed to be in the front row" is more devastating than "I lost my mother." The specific detail is the proof of love.',
  },

  {
    name: 'Ekphrasis',
    category: 'Imagery & Description',
    definition: 'A vivid, detailed description of a visual work of art, scene, or image — writing that makes the reader see something so completely they feel they are looking at it.',
    examples: [
      { line: 'The painting on my grandmother\'s wall: a field, gold and endless, with one tree at the center, half-dead and still flowering' },
      { line: 'Describe the block in such detail that anyone who\'s been there sees it exactly, and anyone who hasn\'t feels they\'ve lived there' },
    ],
    elevates: 'Turns description into experience. The listener doesn\'t hear about the scene — they stand inside it. Ekphrasis is the proof that words can do what images do, and sometimes more.',
    tip: 'Choose the scene with the highest emotional loading — not any scene, but the scene that carries the most meaning in your story. Then describe it completely enough that the detail itself becomes the argument.',
  },

  {
    name: 'Exclamatio',
    category: 'Emotion & Tone',
    definition: 'An outburst of emotion — a sudden exclamation that breaks through the controlled surface of the verse. The speaker can no longer contain the feeling.',
    examples: [
      { line: 'And I just need you to know — I tried. I really tried.' },
      { line: 'God. This city. What it takes from people.' },
      { line: 'That was it. That was the moment everything changed.' },
    ],
    elevates: 'Creates emotional rupture — a moment where the controlled craft gives way to raw feeling. The exclamation is the proof that something is real. It creates intimacy: the listener witnesses the speaker broken through.',
    tip: 'Use exclamation sparingly. One real exclamation per verse lands hard. Three loses its power. The outburst means more because you were controlled for twelve bars before it.',
  },

  // ── CLASSICAL RHETORIC ───────────────────────────────────────────────────────

  {
    name: 'Accismus',
    category: 'Emphasis & Amplification',
    definition: 'Feigned refusal of something one actually desires — false modesty used as a rhetorical strategy to appear humble while drawing attention to an achievement.',
    examples: [
      { line: 'I wasn\'t even trying on that track — that\'s just how I warm up' },
      { line: 'I don\'t need the award. Keep it. The game already knows.' },
    ],
    elevates: 'False modesty in hip-hop is a power move — the refusal signals that the accomplishment is so far above normal that it barely registers. The listener understands: if THIS is them not trying, what happens when they do? It elevates the speaker without appearing desperate for credit.',
    tip: 'Only works when the underlying accomplishment is real and the audience already knows it. Empty false modesty sounds like self-delusion. Land an undeniable bar first, then wave it off.',
  },

  {
    name: 'Adage / Adagium',
    category: 'Classical Rhetoric',
    definition: 'A widely known saying accepted as true — a proverb deployed as rhetorical support. It borrows the authority of collective wisdom for your argument.',
    examples: [
      { line: 'They say heavy is the head that wears the crown — I\'ve been heavy since birth' },
      { line: 'They say it\'s lonely at the top — I\'ve been training for the loneliness' },
    ],
    elevates: 'Invoking a proverb instantly brings a whole tradition of shared wisdom into the bar. The listener nods because they already agree — now your verse rides that momentum. It also grounds personal experience in universal truth, making the specific feel inevitable.',
    tip: 'Flip the adage — state it, then either confirm it with your own evidence or subvert it entirely. "They say money can\'t buy happiness — they were measuring wrong." The contrast between the familiar saying and your spin is where the bar lives.',
  },

  {
    name: 'Addubitatio',
    category: 'Classical Rhetoric',
    definition: 'Expressing doubt about where to begin or what to say — a performative hesitation that creates intimacy with the audience before the main content arrives.',
    examples: [
      { line: 'I don\'t even know where to take this. Let me just start.' },
      { line: 'How do you explain a decade of war in four bars? I\'ll try.' },
    ],
    elevates: 'The performance of not knowing where to start signals that the subject matters too much for easy entry. It lowers the speaker\'s guard in front of the audience — and that vulnerability creates trust. The listener leans in because you clearly care.',
    tip: 'Use addubitatio when the emotional weight is genuinely heavy. Follow it immediately with a bar that lands hard — the hesitation sets the table, but the content has to justify it.',
  },

  {
    name: 'Admonitio',
    category: 'Emotion & Tone',
    definition: 'A warning or gentle rebuke — counsel directed at someone about the consequences of their path, delivered with care rather than aggression.',
    examples: [
      { line: 'Slow down, little bro — I\'ve been where you\'re headed and came back limping' },
      { line: 'I\'m not threatening you. I\'m telling you what happens next if you stay on that road.' },
    ],
    elevates: 'A warning carries more weight than a threat because it comes from a position of experience, not ego. The listener understands the speaker has been through it and survived. Admonitio communicates wisdom and authority without aggression — it\'s the older version of the threat.',
    tip: 'Pair admonitio with a brief personal reference to the cost you paid learning the same lesson. The warning lands harder when the listener understands it wasn\'t theoretical.',
  },

  {
    name: 'Affirmatio',
    category: 'Classical Rhetoric',
    definition: 'Strong, unqualified assertion — stating something with maximum confidence and zero hesitation. No "maybe," no "I think" — just the declaration.',
    examples: [
      { line: 'I am the best to ever do this. Full stop.' },
      { line: 'This is who I am. This is where I come from. This is where I\'m going.' },
    ],
    elevates: 'Unqualified assertion is a form of authority. When a speaker removes all hedges and states something absolute, the listener experiences it as conviction rather than opinion. In hip-hop, unflinching self-declaration is a core form of artistic identity.',
    tip: 'Affirmatio lives or dies by what follows it. State the declaration, then spend the next bar proving it through image or evidence. The boldest claims need the sharpest evidence.',
  },

  {
    name: 'Aganactesis',
    category: 'Emotion & Tone',
    definition: 'An expression of intense indignation — sustained, righteous outrage directed at injustice, betrayal, or hypocrisy.',
    examples: [
      { line: 'You built a system on my back and call me ungrateful for shaking it off' },
      { line: 'They took the culture, the sound, the style — and left us the credit card debt' },
    ],
    elevates: 'Controlled outrage in verse is one of the most powerful emotional registers in hip-hop. When the anger is specific, directed, and grounded in real grievance, it converts the listener\'s passive understanding into active feeling. Indignation that is righteous becomes rally.',
    tip: 'Keep indignation specific — name the act, not just the feeling. "You left" is less powerful than "you left on a Tuesday and didn\'t call for three months." Specificity is what separates genuine indignation from general complaint.',
  },

  {
    name: 'Antonomasia',
    category: 'Wordplay',
    definition: 'Substituting a descriptive phrase or epithet for a proper name, or using a proper name as a common noun. It creates identity through the label itself.',
    examples: [
      { line: 'The God of the Booth needs no introduction' },
      { line: 'Every rapper in this city wants to be the next King of New York' },
    ],
    elevates: 'Epithets and titles are how cultures encode status. When a rapper substitutes a title for a name — or earns a name that stands for a category — it signals mythological stature. The label creates the legend. "The God" or "The Goat" does more work than any proper name.',
    tip: 'Build the epithet from evidence in the verse rather than announcing it. The listener should feel the weight of the title by the time it\'s invoked — not be told to accept it cold.',
  },

  {
    name: 'Aphorismus',
    category: 'Classical Rhetoric',
    definition: 'Questioning the proper use of a word or expression — calling attention to a term being misused, abused, or emptied of meaning.',
    examples: [
      { line: 'You keep saying "real" — I don\'t think that word means what you think it means' },
      { line: 'They call it "culture" but they haven\'t earned the word' },
    ],
    elevates: 'Challenging a word is a form of intellectual authority — it says: I understand this thing more precisely than you do, and your careless use of the language reveals your distance from the truth. In hip-hop, it\'s a precision blade in argument bars.',
    tip: 'Name the word you\'re questioning, then provide the correct understanding in the following bar. The challenge is only powerful when you have a better definition ready.',
  },

  {
    name: 'Apophasis',
    category: 'Classical Rhetoric',
    definition: 'Seeming to pass over something while actually highlighting it — "I won\'t even mention the fact that..." The denial is the assertion.',
    examples: [
      { line: 'I\'m not gonna bring up the fact that you owe me three years — let\'s move forward' },
      { line: 'I won\'t even mention how many doors you walked through that I opened' },
    ],
    elevates: 'The power is in the pretense. Apophasis gives you full credit for the accusation while appearing magnanimous for not making it. The listener hears everything you claim to be withholding — which is exactly the effect you want. It signals control: I have more on you than I\'m using.',
    tip: 'The key is restraint in tone — deliver the "I won\'t mention" with calm, not aggression. The calmer the voice, the more devastating the content you\'re supposedly not using.',
  },

  {
    name: 'Apothegm',
    category: 'Classical Rhetoric',
    definition: 'A pithy, memorable statement of a general truth — shorter and punchier than a full maxim. The apothegm is the tweet before Twitter existed.',
    examples: [
      { line: 'Loyalty is earned in the dark, not announced in the light' },
      { line: 'What you run from runs faster' },
    ],
    elevates: 'A well-crafted apothegm is the most quotable unit in hip-hop — the bar that gets screenshotted, tattooed, and repeated without context. It compresses a lifetime of observation into one sentence. The listener feels smarter for having heard it.',
    tip: 'Test your apothegm by removing every word that isn\'t essential. If "loyalty is earned in silence" is the truth, then every filler word around it dilutes it. Strip down to the bone.',
  },

  {
    name: 'Apparent Refusal',
    category: 'Classical Rhetoric',
    definition: 'Seeming to decline something while actually asserting it — a close cousin of apophasis. You perform the refusal to achieve the thing you\'re refusing.',
    examples: [
      { line: 'I\'m not even going to respond to that. Here\'s my response.' },
      { line: 'I could spend this whole verse taking you apart — but you\'re not worth the bars' },
    ],
    elevates: 'The paradox is the point: refusing to dignify something with a response is itself a response, and usually a more powerful one. The apparent refusal signals supreme confidence — you\'re so far above the dispute that engaging is beneath you.',
    tip: 'Make the "refusal" look effortless. If it sounds labored, the pretense collapses. The best apparent refusals feel like they cost the speaker nothing — which costs the target everything.',
  },

  {
    name: 'Appositio',
    category: 'Classical Rhetoric',
    definition: 'Placing one phrase immediately beside another to rename, clarify, or expand it — the appositive is the second noun phrase that redefines the first.',
    examples: [
      { line: 'My mother — the strongest person I have ever seen — never asked for anything' },
      { line: 'This city, my everything, my prison, my home' },
    ],
    elevates: 'Apposition lets you hold two names for the same thing at once — and both names add meaning. It slows the bar down to a meditation, forcing the listener to sit with the subject before the verse continues. It\'s how you show something is too complex for one label.',
    tip: 'The appositive phrase should add something the original noun cannot — a dimension, a contradiction, a revelation. If the appositive just repeats the noun in different words, cut it.',
  },

  {
    name: 'Ara',
    category: 'Emotion & Tone',
    definition: 'A curse or imprecation — wishing harm upon an opponent or invoking consequences. Not a threat but a declaration of fate.',
    examples: [
      { line: 'May everything you built on lies come apart at the seam' },
      { line: 'Let the record show what you did — and let the record judge you for it' },
    ],
    elevates: 'The curse elevates the conflict from interpersonal to cosmic. You\'re not threatening — you\'re declaring fate, invoking the universe as your witness. It gives the grievance moral authority beyond personal revenge.',
    tip: 'Keep curses specific to the transgression. Vague curses sound petty. "May every lie you told catch up with you in front of everyone who believed you" is devastating because it names exactly what the person did.',
  },

  {
    name: 'Asphalia',
    category: 'Classical Rhetoric',
    definition: 'Offering guarantees or assurances — promising certainty as a rhetorical move. The guarantee creates trust and removes doubt.',
    examples: [
      { line: 'I promise you this will be different. I\'ve done the work this time.' },
      { line: 'Trust me on this — I haven\'t been wrong yet' },
    ],
    elevates: 'A guarantee in verse is a form of credibility claim. The speaker says: I know this, and I\'m willing to stake something on it. It invites the listener to hold you accountable, which paradoxically creates more trust than hedged claims.',
    tip: 'Only guarantee what you can back up. An empty promise in a verse reads as bluster. The assurance must be attached to real evidence — the bar before it should prove why the listener should trust the bar after.',
  },

  {
    name: 'Barbarism',
    category: 'Classical Rhetoric',
    definition: 'Using non-standard, foreign, or "incorrect" language — in classical terms, a fault. In hip-hop, deliberate dialect, slang, and code-switching is cultural authority, not error.',
    examples: [
      { line: 'You can\'t code-switch your way out of where you came from' },
      { line: 'I speak the language of my block and I don\'t apologize for it' },
    ],
    elevates: 'What classical rhetoric called error, hip-hop calls authenticity. Speaking in dialect, slang, or code carries cultural information that "correct" language erases. The "wrong" grammar signals belonging — it\'s a marker of where you come from and who you\'re talking to.',
    tip: 'The deliberate use of dialect works best when it\'s genuine — when the "incorrect" form is actually the correct form in your cultural context. Forced slang sounds like costume. The real thing sounds like home.',
  },

  {
    name: 'Benedictio',
    category: 'Classical Rhetoric',
    definition: 'A blessing or formal expression of goodwill — words of benediction that invoke positive force over someone or something.',
    examples: [
      { line: 'May you find what you were running toward before the running ran out' },
      { line: 'God bless the ones who stayed when staying cost them something' },
    ],
    elevates: 'Blessing in verse creates a powerful tonal shift — from declaration or argument to benediction. It signals generosity and spiritual awareness. In the middle of a hard verse, a moment of blessing creates contrast that makes both the hardness and the kindness land harder.',
    tip: 'Benedictions are most powerful when they\'re given to people who weren\'t expected to receive them — enemies, the lost, the doubters. Blessing the opposition is a profound move.',
  },

  {
    name: 'Bomphiologia',
    category: 'Classical Rhetoric',
    definition: 'Inflated or boastful speech — grandiose self-praise that may or may not be earned. In hip-hop, braggadocio is an art form when backed by credibility.',
    examples: [
      { line: 'I am the standard. Everything else is a variation of what I made possible.' },
      { line: 'They study what I did casually. That\'s their full-time job.' },
    ],
    elevates: 'Braggadocio is one of hip-hop\'s oldest and most legitimate rhetorical moves — but it only lands when the speaker has earned it. When the boast is backed by real accomplishment, it reads as confidence. When it\'s empty, it reads as delusion.',
    tip: 'Follow the boast with proof. Don\'t just claim to be the best — show the work that makes the claim credible. The bar after the brag should be so good that the brag looks modest.',
  },

  {
    name: 'Cataplexis',
    category: 'Emotion & Tone',
    definition: 'A threat — promising punishment or negative consequences for a specific behavior. Unlike a curse, cataplexis is conditional and specific.',
    examples: [
      { line: 'Keep my name in your mouth and I\'ll give you a reason to use it' },
      { line: 'Try me once. I want you to try me once.' },
    ],
    elevates: 'The threat in verse establishes stakes. It converts abstract conflict into consequence. The best threats don\'t detail the punishment — they leave the listener to imagine it, which is always worse. Restraint in a threat is more menacing than elaboration.',
    tip: 'Keep it calm and specific. Explosive threats sound scared. Quiet, specific threats sound certain. "Touch what\'s mine and see what happens next" hits harder because the speaker sounds like they already know the ending.',
  },

  {
    name: 'Categoria',
    category: 'Classical Rhetoric',
    definition: 'Direct accusation — naming the crime, the person, and the evidence without euphemism or indirection. The charge is delivered plainly.',
    examples: [
      { line: 'You stole the record, the publishing, and the credit — in that order' },
      { line: 'I\'m naming names: you lied. To my face. Twice.' },
    ],
    elevates: 'Direct accusation in verse has the weight of testimony. When everything is named — the act, the actor, and the evidence — the listener cannot dismiss it as vague complaint. It converts feeling into fact. It\'s the most confrontational mode in hip-hop.',
    tip: 'Only use direct accusation when you can prove everything you say. Naming crimes without evidence is just libel. The accusation must be supported by the verse that surrounds it.',
  },

  {
    name: 'Charientismus',
    category: 'Classical Rhetoric',
    definition: 'Softening an unpleasant truth through graceful, pleasant expression — saying a difficult thing in a way that makes it easier to receive.',
    examples: [
      { line: 'I say this with love: you\'re going in the wrong direction at full speed' },
      { line: 'Not to put too fine a point on it, but everything you thought you built is borrowed' },
    ],
    elevates: 'The grace of delivery can disarm a listener who would otherwise refuse to hear hard truth. Charientismus is emotional intelligence in action — you care enough to tell the truth, and you care enough to tell it in a way that doesn\'t permanently close the door.',
    tip: 'The graceful framing must feel genuine — not like a manipulation, but like actual concern. If the softening sounds sarcastic, it becomes the opposite: a crueler form of the insult.',
  },

  {
    name: 'Chreia',
    category: 'Classical Rhetoric',
    definition: 'A short account of a saying or action attributed to a specific person — the anecdote as rhetorical proof. You say: here\'s what happened, here\'s what was said, and here\'s what it proves.',
    examples: [
      { line: 'My father told me once: a man who won\'t be moved isn\'t strong — he\'s just stuck' },
      { line: 'My grandmother said: God don\'t give you more than you can carry — but he doesn\'t help you pick it up' },
    ],
    elevates: 'The attributed anecdote carries the authority of lived experience. When you say "my father told me," you\'re importing another person\'s credibility into your argument. It also humanizes the verse — the listener sees the speaker as part of a larger story.',
    tip: 'Let the anecdote do its work without over-explanation. State the person, state the saying, then let the listener absorb it before you apply it to your current argument.',
  },

  {
    name: 'Correctio',
    category: 'Classical Rhetoric',
    definition: 'Self-correction — taking back what was said and replacing it with a more accurate or more powerful statement. The revision reveals precision of thought.',
    examples: [
      { line: 'I said I was good — no, I meant I was transformed. There\'s a difference.' },
      { line: 'They call it success. I call it survival. Not the same thing.' },
    ],
    elevates: 'Self-correction signals that the speaker is actively thinking, not reciting. It says: I care enough about the truth to revise in real time. The correction is usually more precise and more powerful than what it replaces — the listener feels the arrival of the right word.',
    tip: 'Use correctio when the first word is close but not exact, and the correction reveals something important. "I said I forgave you. I meant I let you go. Those are different." The gap between the two words is where the insight lives.',
  },

  {
    name: 'Condescensio',
    category: 'Classical Rhetoric',
    definition: 'Adjusting language and register to connect with the audience — meeting people where they are as a communicative strategy, not as condescension.',
    examples: [
      { line: 'I know some of y\'all never read a book about this — so let me tell it like it actually was' },
      { line: 'I\'m not above where you are. I just got here first. Let me show you the way.' },
    ],
    elevates: 'The speaker who adjusts register to reach a wider audience — speaking plainly about complex things — demonstrates mastery and generosity simultaneously. In hip-hop, code-switching between abstract and street-level language is a craft skill.',
    tip: 'The key is authenticity — you can simplify without being patronizing. Speak plainly about complex things without dumbing them down. The listener should feel respected, not managed.',
  },

  {
    name: 'Deesis',
    category: 'Classical Rhetoric',
    definition: 'An earnest entreaty or supplication — a sincere, urgent plea directed at a person, institution, or divine force.',
    examples: [
      { line: 'I\'m asking you — not telling you — just give us a chance to be heard' },
      { line: 'Please. Before you judge. Listen to the whole story.' },
    ],
    elevates: 'A genuine plea in verse is one of the most vulnerable and therefore most powerful moves in hip-hop. The speaker drops armor to ask for something they need. That nakedness creates immediate emotional intimacy.',
    tip: 'The plea must feel sincere. If it sounds strategic, it\'s just manipulation. Real entreaty has a specific request, a reason, and a willingness to be refused.',
  },

  {
    name: 'Deprecatio',
    category: 'Classical Rhetoric',
    definition: 'Seeking pardon or forgiveness — not making excuses, but genuinely acknowledging fault and asking to be excused.',
    examples: [
      { line: 'I was wrong. I know what it cost you. I\'m not asking you to forget — just to know I know.' },
      { line: 'There are things I did that I can\'t undo. I can only show you I\'m not that person anymore.' },
    ],
    elevates: 'The apology song or verse is a demanding form precisely because it requires real accountability — not explanation, not deflection, but ownership. When it\'s genuine, it creates profound empathy. When it\'s performed, listeners see through it immediately.',
    tip: 'The most powerful deprecatio doesn\'t ask to be forgiven — it simply acknowledges. The request for pardon is implicit in the ownership of the fault. "I was wrong" is more powerful than "I\'m sorry." Own the act before you ask anything of the listener.',
  },

  {
    name: 'Digressio',
    category: 'Classical Rhetoric',
    definition: 'A controlled departure from the main subject — a tangent that illuminates the main point by approaching it from an unexpected angle.',
    examples: [
      { line: 'Let me tell you about a Tuesday in 2009 — it has nothing to do with this and everything to do with this' },
      { line: 'Bear with me. This story about my grandfather connects to everything I just said.' },
    ],
    elevates: 'A digression that returns with new meaning is one of the most sophisticated structural moves in hip-hop. The listener thinks you\'ve left the subject — then the digression lands and recontextualizes everything. It rewards patience and attention.',
    tip: 'Every digression must return. If you leave the main argument, the tangent must enrich it when you come back. A digression that simply ends without connecting back is just a drift.',
  },

  {
    name: 'Doubtfull / Dubitatio',
    category: 'Classical Rhetoric',
    definition: 'Expressing genuine or performed uncertainty about a point — openly admitting that the answer isn\'t clear or that multiple possibilities exist.',
    examples: [
      { line: 'I don\'t know if I made the right call. I just know it was the only call I had.' },
      { line: 'Maybe I was wrong. Or maybe being right wasn\'t the point.' },
    ],
    elevates: 'Admitted uncertainty is a sign of intellectual maturity and emotional honesty. In a genre built on declarative certainty, genuine doubt is surprising and therefore powerful. It signals that the speaker has actually grappled with the question.',
    tip: 'Follow dubitatio with a resolution or acceptance — not leaving the listener in the fog, but showing how you learned to live with not knowing. The doubt is the setup; the response to the doubt is the bar.',
  },

  {
    name: 'Encomium',
    category: 'Classical Rhetoric',
    definition: 'A formal expression of praise — celebrating a person, place, era, or thing. In hip-hop, the tribute verse is the encomium.',
    examples: [
      { line: 'This is for the ones who stayed when leaving was easier' },
      { line: 'Let me tell you about my city — what it taught me, what it cost me, what it made me' },
    ],
    elevates: 'The tribute verse does what elegies and monuments do — it preserves and honors what deserves to be remembered. Hip-hop has a tradition of city pride, mentor tributes, and legacy-honoring bars. Done right, the encomium is one of the most emotionally resonant modes in the genre.',
    tip: 'Specificity is everything. A general tribute to "all the real ones" says nothing. A specific tribute — naming a person, a place, a moment — creates genuine emotion. The more specific the praise, the more universal the feeling it creates.',
  },

  {
    name: 'Energia',
    category: 'Classical Rhetoric',
    definition: 'The quality of forceful, vivid expression — language that feels kinetic, like it has physical energy pushing through it. Not what is said but how it is propelled.',
    examples: [
      { line: 'Words that move like heat — you don\'t decide to feel them, you just feel them' },
      { line: 'Every bar I write has got to land like I meant it and I\'m standing right behind it' },
    ],
    elevates: 'Energia is the aliveness in language — the quality that makes a verse feel like it\'s happening right now, not being recalled. It\'s the difference between describing a fire and making the listener feel the heat. Every craft decision — rhythm, word choice, syntax — either builds or diminishes it.',
    tip: 'Energia comes from writing toward urgency. If the verse feels like you could have taken your time with it, it lacks energia. Write as if the thought is too important to finish slowly. The pressure of necessity is the source of force.',
  },

  {
    name: 'Epanorthosis',
    category: 'Classical Rhetoric',
    definition: 'Self-correction for emphasis or precision — going back and restating more accurately, usually to land harder.',
    examples: [
      { line: 'I said I moved on — scratch that — I learned to carry it differently' },
      { line: 'I almost gave up — no. I gave up. Then I started again.' },
    ],
    elevates: 'The revision is often more powerful than the original statement. By correcting yourself mid-bar, you demonstrate precision of feeling — you\'re not willing to settle for a close approximation. The listener trusts that what follows the correction is the real truth.',
    tip: 'The correction should be more specific, more honest, or more precise than what it replaces. "I was hurt" becomes "I was devastated." "I moved on" becomes "I learned to function with it." The difference between the first and second word is the whole verse.',
  },

  {
    name: 'Epiphonema',
    category: 'Classical Rhetoric',
    definition: 'A memorable concluding statement — a pithy, summarizing remark that closes an argument or section with finality and weight.',
    examples: [
      { line: 'That\'s all. That\'s everything. No footnotes.' },
      { line: 'They had everything. They wanted more. That\'s the whole story.' },
    ],
    elevates: 'The epiphonema is the period at the end of the sentence — it seals the argument and sends the listener away with something to carry. In hip-hop, the closing bar of a verse is a form of epiphonema. It should feel inevitable: the only way this could have ended.',
    tip: 'Strip the epiphonema to its essence. The closer should be short, declarative, and undeniable. The verse builds to it; the closer doesn\'t need to explain itself. If it requires explanation, it hasn\'t landed.',
  },

  {
    name: 'Epiplexis',
    category: 'Classical Rhetoric',
    definition: 'Asking sharp questions to rebuke or reproach — the rhetorical question used as accusation rather than inquiry.',
    examples: [
      { line: 'How many times did I have to ask? How many times did you not show up? How many times do I have to count?' },
      { line: 'Where were you when it mattered? Where were you when I needed you to show up?' },
    ],
    elevates: 'The interrogative accusation is more powerful than the declarative one because it forces the target to apply the question to themselves. The listener also applies it — suddenly they\'re inside the argument, not watching it. Questions demand engagement in a way statements don\'t.',
    tip: 'Use a series of questions in escalating specificity. Each question should be harder to dismiss than the last. The final question should be unanswerable — not because it\'s unfair, but because the answer is obvious and devastating.',
  },

  {
    name: 'Epitrope',
    category: 'Classical Rhetoric',
    definition: 'Granting permission to an opponent while completely confident that the result will favor you — "go ahead, try it" as a rhetorical move.',
    examples: [
      { line: 'Take your shot. I\'ll be right here when it doesn\'t land.' },
      { line: 'Respond. Please. I want you to respond to this.' },
    ],
    elevates: 'Inverse confidence — inviting the opponent to do their worst — signals absolute certainty in the outcome. The listener understands: the speaker has calculated the exchange and already won. It\'s the most confident move in combat rap.',
    tip: 'The power of epitrope collapses if the result doesn\'t follow. Use it only when you have something in reserve that justifies the confidence. The invitation must be backed by the response you\'re already prepared to give.',
  },

  {
    name: 'Erotema',
    category: 'Classical Rhetoric',
    definition: 'A rhetorical question — the classical term for asking a question where the answer is implied and the effect is emphasis, not information.',
    examples: [
      { line: 'Who else was going to do it?' },
      { line: 'You think this came easy?' },
    ],
    elevates: 'The rhetorical question activates the listener — they silently answer, and in answering, they agree. It converts passive listening into active participation. The implied answer becomes something the listener has arrived at themselves, which is more convincing than being told.',
    tip: 'The implied answer must be obvious and strong. A rhetorical question where the answer is unclear just creates confusion. The listener should answer it before you\'ve finished asking it.',
  },

  {
    name: 'Eucharistia',
    category: 'Emotion & Tone',
    definition: 'An expression of gratitude — giving thanks as a rhetorical move. Gratitude in verse signals awareness of what you didn\'t do alone.',
    examples: [
      { line: 'I owe that chapter to everyone who said it couldn\'t be done — the doubt became the fuel' },
      { line: 'Thank you for the cold shoulder — it made the work warmer' },
    ],
    elevates: 'Gratitude in hip-hop — especially when expressed toward unexpected sources like struggle, opposition, or loss — demonstrates emotional and spiritual maturity. It reframes hardship as gift, which is one of the most powerful narrative moves in autobiography.',
    tip: 'The most memorable expressions of gratitude are paradoxical — thanking the difficulty, the loss, the betrayal. "Thank you for leaving, because leaving made me." The unexpected thank-you is more powerful than the expected one.',
  },

  {
    name: 'Euche',
    category: 'Emotion & Tone',
    definition: 'A prayer or vow — direct address to a divine being, making a request or a promise. The euche is the most spiritually intimate rhetorical form.',
    examples: [
      { line: 'God, if you\'re hearing this — I just need one more year to make it right' },
      { line: 'I swear on everything I built and everyone I lost that I won\'t stop' },
    ],
    elevates: 'The prayer in verse opens a vertical dimension — the speaker reaches above their own experience toward something larger. It signals vulnerability, faith, and a recognition that not everything is in the speaker\'s control. In hip-hop, prayers and vows create some of the most emotionally raw moments in the genre.',
    tip: 'The prayer must sound genuine, not performed. Use specific images and specific requests rather than general spiritual language. "God, let my mother live long enough to see it" is more powerful than "Lord watch over my family."',
  },

  {
    name: 'Eulogia',
    category: 'Classical Rhetoric',
    definition: 'Speaking well of someone — formal praise given in honor of a person\'s character, actions, or legacy.',
    examples: [
      { line: 'He never asked for anything and gave more than anyone — that\'s the whole biography' },
      { line: 'She built something out of nothing and never let the nothing define her' },
    ],
    elevates: 'The tribute is one of hip-hop\'s most important functions — it preserves the memory of people who might otherwise be forgotten. A well-crafted eulogia doesn\'t sentimentalize; it documents. The specific detail is what makes the person live on in the verse.',
    tip: 'Eulogia lives in specific memory — the particular thing this person did, said, or survived. Generic praise could apply to anyone. The eulogy that names the exact gesture, habit, or sacrifice is the one that lasts.',
  },

  {
    name: 'Euphemismus',
    category: 'Classical Rhetoric',
    definition: 'Substituting a pleasant or indirect expression for something harsh, taboo, or uncomfortable — deliberately smoothing the rough edge.',
    examples: [
      { line: '"Transition" for death. "Let go" for fired. "Moved on" for gave up.' },
      { line: 'They said the neighborhood was "developing" — what they meant was moving us out' },
    ],
    elevates: 'Hip-hop oscillates between raw directness and coded euphemism — and the euphemisms are often as revealing as the explicit terms. Calling something by a softer name creates irony when the listener understands the gap between the word and the reality. Euphemism can be weaponized.',
    tip: 'Use euphemism consciously: either genuinely softening something painful for emotional effect, or ironically — deploying the polite term to highlight how polite language conceals violence. Know which one you\'re doing.',
  },

  {
    name: 'Eutrepismus',
    category: 'Classical Rhetoric',
    definition: 'Numbering and ordering the points to be made — "I have three things to say, and the third is the one that matters." Creating a formal list structure.',
    examples: [
      { line: 'First the money, then the respect, then the peace — in that order and not before' },
      { line: 'There are three reasons I made it: I had no other option, I had no other option, I had no other option.' },
    ],
    elevates: 'The numbered list signals that the speaker has organized their thinking. It creates anticipation — the listener waits for each item. And the final item carries disproportionate weight because everything before it has been building toward it.',
    tip: 'The third item in a eutrepismus should be the strongest — the revelation, the punchline, the turn. Don\'t save your weakest point for last. The structure creates expectation; the final item has to justify it.',
  },

  {
    name: 'Exouthenismos',
    category: 'Classical Rhetoric',
    definition: 'Contemptuous dismissal — treating something as so beneath consideration that it isn\'t worth engaging with seriously.',
    examples: [
      { line: 'I\'m not even going to dignify that with a full bar' },
      { line: 'That\'s not competition. That\'s just noise in the background.' },
    ],
    elevates: 'Dismissal is a power move when done right — it signals that the speaker is operating at a level where certain things simply don\'t register. The contempt is the point. But it only works if the speaker\'s status is already established. Dismissing from weakness is just avoidance.',
    tip: 'Make the dismissal final and specific, then immediately move on to something bigger. The quicker you move past the dismissed thing, the more effective the contempt. Lingering on what you\'re dismissing undermines the dismissal.',
  },

  {
    name: 'Gnome',
    category: 'Classical Rhetoric',
    definition: 'A short moral statement of general truth — a maxim or proverb that compresses lived experience into a single, portable sentence.',
    examples: [
      { line: 'The ones who stayed quiet longest usually had the most to say' },
      { line: 'You can\'t see the road from where you started — only from where you arrived' },
    ],
    elevates: 'The gnome is the most quotable unit in a verse — the bar that gets lifted out of context and repeated as wisdom. It compresses a whole essay into one sentence. When a listener can carry a bar with them without the rest of the verse, that bar has achieved the gnome.',
    tip: 'The best gnomes are counter-intuitive — they say something the listener sensed but never articulated. "The ones who stayed quiet longest usually had the most to say" is more memorable than "quiet people have a lot inside them." Compress, invert, and make the familiar strange.',
  },

  {
    name: 'Horismus',
    category: 'Classical Rhetoric',
    definition: 'A brief definition — stating exactly what a term means, often to reclaim or redefine a word that has been misused or diluted.',
    examples: [
      { line: 'When I say loyalty I mean: you show up when showing up costs you something' },
      { line: 'Real doesn\'t mean raw — real means honest, even when honesty is uncomfortable' },
    ],
    elevates: 'Defining your own terms is an act of linguistic and philosophical authority. In hip-hop, where words like "real," "authentic," and "legend" are constantly devalued, reclaiming their precise meaning is a form of cultural critique and self-assertion.',
    tip: 'The definition should be narrower and more specific than common usage — not just restating the dictionary, but specifying what YOU mean. The more precise the definition, the more authority it carries.',
  },

  {
    name: 'Inopinatum',
    category: 'Classical Rhetoric',
    definition: 'Introducing the unexpected — turning a verse in a direction the listener could not have anticipated.',
    examples: [
      { line: 'I was going to end this verse with victory — but the honest answer is I\'m still in the middle' },
      { line: 'Everything you thought this was about — it\'s actually about something else entirely' },
    ],
    elevates: 'Surprise is one of the most powerful rhetorical tools. When a verse breaks the listener\'s prediction, it creates delight and attention. The unexpected move signals creative intelligence — this speaker goes places you wouldn\'t go.',
    tip: 'The unexpected turn must still feel inevitable in retrospect. A random turn is just disorienting. A surprising turn that makes perfect sense once it lands — that\'s craft. Set it up subliminally before you reveal it.',
  },

  {
    name: 'Insinuatio',
    category: 'Classical Rhetoric',
    definition: 'Winning over a hostile or indifferent audience through indirect approach — establishing common ground or credibility before making the controversial point.',
    examples: [
      { line: 'I know some of y\'all don\'t want to hear this — I used to be in your position too' },
      { line: 'Before I say what I\'m about to say, let me tell you where I come from' },
    ],
    elevates: 'The hostile audience requires a different entry point. Rather than confronting resistance head-on, insinuatio finds the angle of approach that the audience hasn\'t already closed. By the time the real argument arrives, the listener has lowered their defenses.',
    tip: 'Find the shared ground first — not to manipulate, but to build a real bridge. The most effective insinuatio is genuine: you actually do share something with the resistant listener. Start there.',
  },

  {
    name: 'Intimation',
    category: 'Classical Rhetoric',
    definition: 'Suggesting something without stating it directly — the implication, the hint, the thing said between the lines.',
    examples: [
      { line: 'I didn\'t say anything. I just described what I saw.' },
      { line: 'Make of that what you will. Some people will understand.' },
    ],
    elevates: 'The implied meaning is often more powerful than the stated one because the listener arrives at it themselves. Intimation creates insider knowledge — those who understand feel rewarded, and those who miss it must return. It\'s the basis of subtext and the subliminal diss.',
    tip: 'The best intimations are specific enough to be unmistakable to the target but plausibly deniable to everyone else. "I didn\'t name anyone" is its own form of naming.',
  },

  {
    name: 'Martyria',
    category: 'Classical Rhetoric',
    definition: 'Confirming something by appealing to personal experience or direct observation — "I know because I was there, I saw it, I lived it."',
    examples: [
      { line: 'I\'m not theorizing — I\'m telling you what I watched happen in front of my eyes' },
      { line: 'This isn\'t something I read. This is something I survived.' },
    ],
    elevates: 'First-person witness is the foundation of hip-hop\'s authority. The claim "I was there" is unrebuttable. When a speaker grounds an argument in personal experience, it becomes testimony — harder to dismiss than any abstract claim.',
    tip: 'The more specific the personal detail, the stronger the martyria. "I was there" is a claim. "I was there at 2am on a Wednesday when the call came in" is testimony. Specificity is credibility.',
  },

  {
    name: 'Maxim',
    category: 'Classical Rhetoric',
    definition: 'A short general truth — a concise statement of principle that claims universal validity. Slightly more formal than a gnome, slightly more argumentative than an apothegm.',
    examples: [
      { line: 'You cannot outrun what you haven\'t faced' },
      { line: 'Every door that closes is proof there was something better behind the next one' },
    ],
    elevates: 'Maxims function as rhetorical proof — they borrow the authority of universal truth for your personal argument. When your verse arrives at a maxim, it signals: this isn\'t just my experience, this is how things work. It gives personal narrative philosophical weight.',
    tip: 'The best maxims feel earned — they should arrive at the end of a narrative sequence, after you\'ve shown the experience that proves them. The maxim without the evidence is just a platitude.',
  },

  {
    name: 'Metabasis',
    category: 'Classical Rhetoric',
    definition: 'A transition — briefly summarizing what has been said and introducing what will follow. The pivot that connects two parts of a verse.',
    examples: [
      { line: 'That was then. Now here\'s where it gets interesting.' },
      { line: 'I told you where I started. Let me show you where that led.' },
    ],
    elevates: 'The clean transition is an act of architectural intelligence — it proves the speaker knows exactly where they are in the verse and where they\'re going. It creates momentum and signals to the listener that the best is still coming.',
    tip: 'Keep transitions minimal. The best metabasis is a single line that reorients the listener without stopping the verse\'s momentum. "That\'s the story — here\'s the lesson" does the work in eight words.',
  },

  {
    name: 'Metastasis',
    category: 'Classical Rhetoric',
    definition: 'Quickly acknowledging a point while passing over it — a brief nod to something without engaging it fully.',
    examples: [
      { line: 'There\'s more to say about that but this isn\'t the verse for it' },
      { line: 'I could address that separately — but let\'s stay on the main point' },
    ],
    elevates: 'Knowing what to skip is as important as knowing what to include. Metastasis signals editorial intelligence — the speaker controls the pace and selects what deserves full attention. The acknowledgment without elaboration keeps the verse moving while noting everything relevant.',
    tip: 'Use metastasis when a point is real but tangential. Briefly acknowledging it prevents the listener from thinking you missed it, while not derailing the verse\'s main purpose.',
  },

  {
    name: 'Orcos',
    category: 'Classical Rhetoric',
    definition: 'A solemn oath — swearing on something sacred to assert truth or sincerity. The oath elevates the claim from statement to covenant.',
    examples: [
      { line: 'On everything I love — every word of this is the truth as I know it' },
      { line: 'I swear on my mother\'s life I was there. I watched it happen.' },
    ],
    elevates: 'The oath elevates a claim to a different register — it stakes something sacred on the truth of what\'s said. In hip-hop, swearing on loved ones or invoking divine witness is a form of credibility claim that cannot be intellectually disputed, only emotionally doubted.',
    tip: 'Swear on something specific and irreplaceable. "I swear on my son" is more powerful than "I swear to God" because the specificity makes the stakes concrete. The oath should match the weight of the claim it\'s sworn for.',
  },

  {
    name: 'Parrhesia',
    category: 'Classical Rhetoric',
    definition: 'Speaking one\'s mind freely and honestly, even at personal risk — the courageous truth-telling that may cost the speaker something.',
    examples: [
      { line: 'This will probably get me in trouble but I\'d rather be honest and broke than lying and comfortable' },
      { line: 'They don\'t want me to say this. That\'s why I\'m saying it.' },
    ],
    elevates: 'In hip-hop, speaking truth to power is a founding tradition. Parrhesia is the rhetorical category for that tradition — the willingness to say true things at personal cost. It creates authority precisely because the speaker has something to lose.',
    tip: 'The risk must be real. Performed courage — pretending to say something dangerous when it isn\'t — reads as posturing. Real parrhesia involves actual stakes: industry relationships, safety, revenue, reputation.',
  },

  {
    name: 'Periergia',
    category: 'Classical Rhetoric',
    definition: 'Excessive care or ornamentation — overdoing the style to the point where the style obscures the substance. The beautiful sentence that says nothing.',
    examples: [
      { line: 'Sometimes a rapper gets so caught up in the complexity they forget to say something real' },
      { line: 'All the ornate vocabulary in the world can\'t save a verse with nothing to say' },
    ],
    elevates: 'Periergia names a pitfall rather than a technique — it\'s what to avoid. But naming the failure helps define the standard: ornamentation should serve meaning, not replace it. The best lyrical complexity is transparent; the content shines through the craft.',
    tip: 'Read your bars without the sonic effects — the internal rhyme, the alliteration. If the idea holds up in plain prose, the complexity is adding to it. If the idea disappears without the ornamentation, the ornamentation was hiding its absence.',
  },

  {
    name: 'Prodiorthosis',
    category: 'Classical Rhetoric',
    definition: 'Preparing the audience for something shocking or unexpected — a forewarning that creates space for a hard truth to land without completely destabilizing the listener.',
    examples: [
      { line: 'I\'m about to say something that might be hard to hear — but you need to hear it from someone who cares' },
      { line: 'What comes next in this verse changed my life — not for the better at first' },
    ],
    elevates: 'The forewarning is a form of respect for the listener. It says: I\'m going to take you somewhere difficult, and I want you to be ready. It also creates tension and anticipation — the listener leans forward, prepared to receive what\'s coming.',
    tip: 'The warning must be proportionate to what follows. An overhyped warning for an underwhelming reveal is comedic. The warning creates expectation that the content must justify.',
  },

  {
    name: 'Protrope',
    category: 'Classical Rhetoric',
    definition: 'Urging action — a call to do something immediately, with energy and conviction.',
    examples: [
      { line: 'Get up. Start now. Not tomorrow — there is no tomorrow in this' },
      { line: 'If you\'ve been waiting for a sign — this is the sign. Move.' },
    ],
    elevates: 'The call to action in verse creates a moment of direct address that breaks the fourth wall between speaker and listener. It converts passive reception into potential agency — the listener isn\'t just being told a story, they\'re being mobilized.',
    tip: 'Use protrope when the verse has built enough emotional context for the call to feel earned. An urgent call at the start of a verse sounds presumptuous. At the end of a carefully built case, it sounds like the only possible conclusion.',
  },

  {
    name: 'Sententia',
    category: 'Classical Rhetoric',
    definition: 'A pithy, memorable statement of general truth deployed as a conclusion — the aphorism that seals the argument.',
    examples: [
      { line: 'The work outlasts the worker — that\'s why the work matters' },
      { line: 'You don\'t earn legacy. You build it slowly and it stays after you leave.' },
    ],
    elevates: 'The sententia is the closing signature of the verse — the line that crystallizes everything that came before into one durable, portable statement. It\'s what the whole verse was building toward. When it lands, the listener knows the verse is complete.',
    tip: 'Write the sententia first, then build the verse that earns it. Knowing your conclusion before you build the argument ensures every bar leads there. The closing line should feel inevitable — as if nothing else could have ended the verse.',
  },

  {
    name: 'Sermocinatio',
    category: 'Classical Rhetoric',
    definition: 'Speaking in the voice of another person — inventing or reporting dialogue, inhabiting a perspective other than your own.',
    examples: [
      { line: 'And she said: "I need you to hear me right now, not tomorrow" — and I wasn\'t ready to hear it' },
      { line: 'My father\'s voice in my head: "You know what to do. You\'ve always known."' },
    ],
    elevates: 'Sermocinatio creates a second character inside the verse — another perspective, another voice, another truth. It deepens the narrative and creates dramatic scene. The listener inhabits both the speaker and the other voice, which doubles the emotional complexity.',
    tip: 'Give the invented voice something to say that the speaker couldn\'t say themselves. The other person\'s line should illuminate something about the speaker — their blindness, their need, their moment of clarity. The dialogue reveals the speaker as much as the person spoken to.',
  },

  {
    name: 'Sustentatio',
    category: 'Classical Rhetoric',
    definition: 'Keeping the audience in suspense — deliberately delaying a resolution to heighten tension and maintain attention.',
    examples: [
      { line: 'I\'m going to tell you what happened. But first I need you to understand what led there.' },
      { line: 'You\'ll know by the end of this verse why I made that choice. Not yet.' },
    ],
    elevates: 'Suspense is one of storytelling\'s most reliable tools. By withholding resolution, the speaker creates forward momentum and investment — the listener cannot stop paying attention because they don\'t yet know how it ends. This is the engine of narrative bars.',
    tip: 'Delay only what the listener actually wants to know. If the withheld information isn\'t something they\'re actively curious about, the delay is just frustration. The suspense must feel like tension, not stalling.',
  },

  {
    name: 'Transitio',
    category: 'Classical Rhetoric',
    definition: 'A brief statement that closes one section and opens another — the clean pivot.',
    examples: [
      { line: 'That was the before. Here\'s the after.' },
      { line: 'I could keep going but the next part is what matters.' },
    ],
    elevates: 'Good transitions are invisible — they don\'t interrupt the flow but redirect it. Poor transitions stop the verse cold. A skilled rapper can move from grief to triumph, from childhood to now, from the personal to the political, without losing the listener — through a well-placed pivot.',
    tip: 'The transitio should reference what came before without restating it, and launch what comes next without announcing it. "That was then" does it in three words.',
  },

  // ── BREVITY & OMISSION ───────────────────────────────────────────────────────

  {
    name: 'Abcisio',
    category: 'Brevity & Omission',
    definition: 'Breaking off speech mid-thought — leaving a sentence incomplete for dramatic effect. A classical form of aposiopesis.',
    examples: [
      { line: 'I almost told her everything. Almost.' },
      { line: 'If you knew what I gave up to be here you\'d understand why I can\'t—' },
    ],
    elevates: 'The uncompleted sentence puts the weight on the silence. The listener\'s imagination fills the gap — which is always more powerful than any word you could choose. The break is the bar. What isn\'t said carries what was.',
    tip: 'Use the cut at the moment of maximum emotional intensity. The incomplete sentence only works when the listener can feel exactly what was going to be said. If the gap is confusing, it\'s not dramatic — it\'s just incomplete.',
  },

  {
    name: 'Brachylogia',
    category: 'Brevity & Omission',
    definition: 'Condensed expression — saying much in very few words. The compression of a long thought into a short, dense line.',
    examples: [
      { line: 'All of that in four words: I was there first.' },
      { line: 'Long story. I won.' },
    ],
    elevates: 'Economy of language is a form of mastery. The speaker who can compress an entire essay into one tight bar demonstrates complete control of the material. Brachylogia signals: I understand this so well I can say it in the minimum words.',
    tip: 'Try writing the full thought first, then compress until nothing can be removed without losing meaning. The goal isn\'t to be cryptic — it\'s to find the exact words that contain everything else. Test it by explaining the bar to someone who didn\'t get it. If you can\'t, it\'s too compressed.',
  },

  {
    name: 'Brachiepia',
    category: 'Brevity & Omission',
    definition: 'Extreme brevity — expression reduced to its absolute minimum. Even shorter and more compressed than brachylogia.',
    examples: [
      { line: 'Done.' },
      { line: 'I made it. The rest is detail.' },
    ],
    elevates: 'Maximum compression can deliver maximum impact. The one-word bar or the three-word verse line carries the weight of everything that came before it — the compression is the punctuation, the finality, the complete statement that ends debate.',
    tip: 'Extreme brevity requires maximum setup. The shorter the landing, the more the approach must earn it. "Done." means nothing without a full verse of context that makes "done" feel like the only word left.',
  },

  {
    name: 'Circumlocutio',
    category: 'Brevity & Omission',
    definition: 'Expressing in many words what could be said in few — periphrasis, circumlocution. Sometimes a fault; sometimes a deliberate strategy.',
    examples: [
      { line: 'The person who gave me life and held my hand through every dark hallway — my mother' },
      { line: 'In the city of concrete and cold fronts, where the winters lasted until June — that\'s where I grew up' },
    ],
    elevates: 'Sometimes the long way around is the right way. When the destination is a simple word ("mother," "home"), the journey to arrive at it creates emotional weight that the single word alone cannot carry. Circumlocution as an intentional device earns the noun it arrives at.',
    tip: 'Use circumlocution to delay and amplify a term that the listener already knows. The buildup earns the final word. Use it sparingly — every periphrastic construction should justify its length by the weight of the arrival.',
  },

  {
    name: 'Macrologia',
    category: 'Brevity & Omission',
    definition: 'Using more words than necessary — a verbose style. In classical terms, a fault. In hip-hop, sometimes deployed deliberately for comedic, overwhelming, or hypnotic effect.',
    examples: [
      { line: 'I would describe the particular quality of the difficulty I\'ve encountered as significant, notable, and not insignificant' },
      { line: 'When the night fell on the particular evening in question, the ambient temperature and atmospheric conditions were such that—' },
    ],
    elevates: 'Deliberate verbosity can be used for comic effect, to parody bureaucratic or academic language, or to create an overwhelming, hypnotic density. Some rappers use extended, intricate sentences to demonstrate stamina and verbal control.',
    tip: 'Macrologia as a deliberate device works best for contrast — a long, circuitous sentence followed by a brutal short one. The excess of the first makes the economy of the second explosive.',
  },

  {
    name: 'Periphrasis',
    category: 'Brevity & Omission',
    definition: 'Using many words to express what could be expressed in fewer — circumlocution for effect, decorum, or poetic compression.',
    examples: [
      { line: 'The house where I learned what cold really means' },
      { line: 'The woman who gave me my name and everything that came with it' },
    ],
    elevates: 'Periphrasis earns its length when the elaboration adds something the simple word cannot carry. "The woman who gave me my name" carries more than "my mother" because it describes the act of naming, which is an act of creation and identity. The description does the work the simple noun cannot.',
    tip: 'Test each periphrastic phrase: does the elaboration add emotional weight or poetic texture that justifies the extra words? If the simple word would do the same work, use the simple word. If the elaborate description adds a dimension, earn that length.',
  },

  {
    name: 'Pleonasm',
    category: 'Brevity & Omission',
    definition: 'Using more words than technically necessary — sometimes a fault, sometimes used deliberately for emphasis or rhythm.',
    examples: [
      { line: 'I saw it with my own eyes — these eyes, right here' },
      { line: 'Nobody, not a single person, not one soul, believed in me then' },
    ],
    elevates: 'Deliberate pleonasm creates emphasis through redundancy — "I saw it with my own eyes" is technically redundant but rhythmically and emotionally more powerful than "I saw it." The doubling insists. It refuses to be dismissed. It stamps a boot on the floor.',
    tip: 'Use pleonasm when the fact is important enough to hammer twice. Every unnecessary word must earn its place by adding rhythmic weight or emotional insistence. Pleonasm that just wastes syllables is a dead zone in the verse.',
  },

  {
    name: 'Perissologia',
    category: 'Brevity & Omission',
    definition: 'Using more words than the sense requires — a form of verbal excess.',
    examples: [
      { line: 'The excessive, verbose, unnecessarily elaborate style can itself become the subject of commentary' },
      { line: 'I could say this in fewer words — but the abundance of words is the point of the abundance' },
    ],
    elevates: 'Like macrologia, deliberate perissologia can be wielded for effect — creating a sense of overwhelming accumulation, parodying over-explanation, or building a hypnotic verbal density. The key is that the excess is controlled, not accidental.',
    tip: 'Use perissologia self-consciously — acknowledge the excess in the verse itself. A rapper who knows they\'re being verbose, and deploys that verbosity with control, demonstrates the mastery that excuses the indulgence.',
  },

  // ── SOUND ────────────────────────────────────────────────────────────────────

  {
    name: 'Cacophonia',
    category: 'Sound',
    definition: 'Harsh or deliberately unpleasant sound — using phonetically grating combinations to create discomfort or intensity.',
    examples: [
      { line: 'The click-crack-scratch of the system grinding against the bone' },
      { line: 'Gritty, brittle, frictive — the sound of something breaking' },
    ],
    elevates: 'Just as harmony creates pleasure, dissonance creates tension. Harsh phonemes — hard stops, fricatives, guttural consonants — can make a line feel physically rough, like the experience it describes. When the subject is violence, grief, or conflict, sonic roughness reinforces meaning.',
    tip: 'Match the sound to the emotional register. Hard, grating sounds (K, T, G, X, SK) suit anger and violence. Reserve the smoother sounds for love and reflection. Conscious cacophonia signals that the speaker is in control of every layer of the verse.',
  },

  {
    name: 'Homoioteleuton',
    category: 'Sound',
    definition: 'Ending successive clauses with the same or similar sounds — a structural sound pattern at the ends of phrases that creates the effect of rhyme before the end of the line.',
    examples: [
      { line: 'I climbed through the breaking, survived through the shaking, kept building and making' },
      { line: 'The waiting, the praying, the staying, the paying — all of it' },
    ],
    elevates: 'Similar endings create a sonic loop — a sense of the clauses belonging together, almost rhyming with themselves. It creates internal music and the feeling of completeness without requiring full end rhyme. The similar endings pull the phrase into a circle.',
    tip: 'Use homoioteleuton in list constructions. When every item in the list ends with the same sound, the accumulation becomes rhythmic rather than merely enumerative. The sonic unity makes the list feel like a cohesive argument.',
  },

  {
    name: 'Paroemion',
    category: 'Sound',
    definition: 'Alliteration at its most extreme — every word (or nearly every word) beginning with the same sound. The full-sentence alliterative run.',
    examples: [
      { line: 'Broke, building, burning, becoming something beyond what they believed' },
      { line: 'Patience, persistence, presence — the practice produces the power' },
    ],
    elevates: 'An all-alliterative line is a demonstration of technical control. It creates a sonic tunnel — the listener moves through a single consonant sound from start to finish. The density of the repetition is hypnotic when used well and self-parody when overused.',
    tip: 'Use paroemion for a single striking line, not an entire verse. Total alliteration quickly becomes a tongue-twister exercise rather than a lyrical moment. One all-alliterative line in a verse stands out precisely because it\'s surrounded by normal sound patterns.',
  },

  {
    name: 'Paromoiosis',
    category: 'Sound',
    definition: 'Grammatical parallelism combined with sound similarity — phrases that mirror each other in both structure and phonetics.',
    examples: [
      { line: 'Built by broken hands, born from broken lands' },
      { line: 'Fought through the fire, fell through the floor, found what I\'m for' },
    ],
    elevates: 'When structure and sound align simultaneously, the line achieves maximum sonic density. The listener experiences both grammatical symmetry and phonetic echo at once, creating an almost musical inevitability. It\'s one of the most sophisticated single-bar achievements in hip-hop.',
    tip: 'Find the phonetic family (alliteration or assonance) that serves your meaning, then build parallel grammatical structures within it. Don\'t force the sound onto the structure or the structure onto the sound — let them find each other in revision.',
  },

  {
    name: 'Homoeoprophoron',
    category: 'Sound',
    definition: 'Alliteration sustained across an entire clause — every word begins with the same sound.',
    examples: [
      { line: 'Silence speaks softer, stronger, slower than screaming' },
      { line: 'Purpose persists past pain, past poverty, past people\'s projections' },
    ],
    elevates: 'Sustained alliteration creates a sonic atmosphere — the entire clause is bathed in a single consonant sound. When the consonant matches the mood (hard K for aggression, soft S for reflection), the phonetics reinforce the meaning throughout.',
    tip: 'Commit fully or not at all. A half-maintained alliterative run sounds accidental. If you\'re going to alliterate across a full clause, every stressed syllable should carry the sound.',
  },

  {
    name: 'Metathesis',
    category: 'Sound',
    definition: 'Transposing letters or sounds within a word — deliberate sound rearrangement. In hip-hop, a tool for creating novel words and wordplay.',
    examples: [
      { line: 'Flipped the script and the script got flipped back — now neither of us know the words' },
      { line: 'Scramble the letters and the meaning scrambles with them' },
    ],
    elevates: 'Metathesis signals that the speaker treats language as something to be played with, inverted, rearranged. It\'s a sonic cousin of wordplay — showing that nothing is fixed, that sound can be transposed and meaning can follow. It creates small moments of linguistic surprise.',
    tip: 'Use metathesis for portmanteau words, invented slang, or to create a sonic stumble that calls attention to a word\'s parts. Deliberate sound transposition is most effective when the resulting sound is itself evocative.',
  },

  {
    name: 'Synaeresis',
    category: 'Sound',
    definition: 'Contraction of two syllables into one — eliding sounds for the sake of flow and meter.',
    examples: [
      { line: 'E\'ry time, n\'er mind, t\'other side — contracting the syllables to fit the pocket' },
      { line: 'The natural elision of spoken language — "going to" becomes "gonna," "want to" becomes "wanna"' },
    ],
    elevates: 'Hip-hop flow depends on syllabic flexibility — the ability to fit more words into a bar through contraction, or to stretch syllables for emphasis. Synaeresis is the formal term for what rappers do instinctively when navigating the relationship between natural speech and rhythmic constraint.',
    tip: 'Listen to where you naturally elide syllables when you speak fast. These contractions are authentic to your speech pattern. Don\'t invent contractions that don\'t exist in your natural cadence — they sound forced. Use the ones that are already in your mouth.',
  },

  {
    name: 'Synaloepha',
    category: 'Sound',
    definition: 'The elision of a final vowel before an initial vowel at a word boundary — smoothing two words together for flow.',
    examples: [
      { line: 'The "of it" becoming "of\'t" — natural spoken elision in fast flow' },
      { line: 'How spoken language erodes written grammar: "I am" becomes "I\'m," "he is" becomes "he\'s"' },
    ],
    elevates: 'The natural contraction of spoken language is one of the primary drivers of flow. Hip-hop operates at the intersection of spoken cadence and musical rhythm — synaloepha is the phonological process that allows natural speech to fit the beat. Understanding it consciously helps control the verse\'s density.',
    tip: 'Write your verse out loud before you write it on paper. The contractions and elisions you make naturally when flowing are guides to where the synaeresis belongs. Written text often over-enunciates what natural speech would contract.',
  },

  {
    name: 'Prothesis',
    category: 'Sound',
    definition: 'Adding a syllable to the beginning of a word — an artificial prefix that changes the word\'s sound and rhythm.',
    examples: [
      { line: 'Every rapper who adds a syllable to the front of a word to fit the meter is using prothesis' },
      { line: '"A-wake" stretched to "awake-a," "begin" to "a-begin" — pushing the word forward into the pocket' },
    ],
    elevates: 'The added syllable is a rhythmic tool — it allows a word that doesn\'t quite fit the meter to be stretched into alignment. Hip-hop has a tradition of deliberate syllable addition as a style marker, not just a necessity.',
    tip: 'Use added syllables to create a signature rhythmic texture. The best flow innovations come from treating syllable addition as a creative decision rather than a metrical fix. The "extra" syllable becomes part of the voice.',
  },

  {
    name: 'Paragoge',
    category: 'Sound',
    definition: 'Addition of a sound or syllable to the end of a word — extending the word for rhythmic or expressive purposes.',
    examples: [
      { line: '"Real-ah," "truth-ah," "still-ah" — extending final syllables for rhythmic emphasis' },
      { line: 'Adding syllables at the end of words to extend into the pocket of a slow beat' },
    ],
    elevates: 'The extended final syllable is one of hip-hop\'s most recognizable stylistic features — it signals emotional emphasis and rhythmic command. The added syllable tells the listener: I\'m not done with this word yet. The extension creates dwelling, not rushing.',
    tip: 'Use paragoge on the words that deserve the most emphasis. The syllable extension should feel earned — not a mechanical habit but a deliberate decision that a specific word or emotion warrants the extra time.',
  },

  {
    name: 'Tasis',
    category: 'Sound',
    definition: 'Sustaining a sound or argument — prolonged expression that holds rather than releases.',
    examples: [
      { line: 'Holding a vowel sound across a bar: "I\'ve been wa-a-a-iting for this moment"' },
      { line: 'The note or syllable held past its natural duration — emphasis through endurance' },
    ],
    elevates: 'Sustained sound creates emotional holding — the listener waits in the extended tone. In hip-hop, vocal sustain on emotionally loaded words (love, pain, gone) creates the same effect as a singer\'s held note. The sustain is a form of dwelling in the meaning.',
    tip: 'Combine tasis with strategic word choice — sustain the word that most needs to land. Holding an emotionally neutral word is just delay. Holding "gone," "real," or "love" is emphasis.',
  },

  {
    name: 'Verborum Bombus',
    category: 'Sound',
    definition: 'Bombastic or high-sounding language without substance — empty grandeur in speech or verse.',
    examples: [
      { line: 'Verses full of polysyllabic vocabulary that circles back to nothing' },
      { line: 'The elaborate multi-bar set-up that leads to a punchline that doesn\'t land' },
    ],
    elevates: 'Verborum bombus names a failure mode — the trap of mistaking elaborate sound for deep content. But naming the trap helps avoid it: substance must drive style, not the other way around. Grandiose language without earned content is empty performance.',
    tip: 'After you write an elaborate bar, strip out all the sonic flourish and ask: what does this say in plain English? If the answer is nothing, the bar is verborum bombus. If the answer is something powerful, then add the ornament back.',
  },

  // ── COMPARISON ───────────────────────────────────────────────────────────────

  {
    name: 'Continued Metaphor',
    category: 'Comparison',
    definition: 'A metaphor sustained across multiple clauses or lines — the metaphor expanded into a chain of related images.',
    examples: [
      { line: 'I\'m the ocean: I carry what I don\'t show, I move without asking permission, I wear down everything that stands in my way' },
      { line: 'This city is a test: it grades on survival, the passing mark is scars, and the diploma is just making it out' },
    ],
    elevates: 'Each extension of the metaphor adds a new dimension — the comparison deepens with each clause, revealing new aspects of both the subject and the image. It creates a sense that the speaker inhabits the metaphor completely, knows it from the inside.',
    tip: 'Each extension should discover something new, not just restate the original comparison. If "I\'m the ocean" is the base, each subsequent line should reveal a different property of oceans that maps onto a different property of the speaker.',
  },

  {
    name: 'Homoeosis',
    category: 'Comparison',
    definition: 'A broad category of comparison through resemblance — the general family that includes metaphor, simile, and related devices.',
    examples: [
      { line: 'Everything in hip-hop that makes you see one thing through another is homoeosis working at the root' },
      { line: 'The resemblance creates understanding — you already know the thing I\'m comparing myself to, so now you know me' },
    ],
    elevates: 'Comparison is one of the fundamental operations of language and cognition. When a verse says "this is like that," it\'s borrowing the listener\'s existing understanding of one thing to build understanding of another. It\'s the engine beneath most figurative language.',
    tip: 'Choose your comparisons from your world — things the listener knows firsthand, or things so universal they require no introduction. The comparison works by activating existing knowledge.',
  },

  {
    name: 'Icon',
    category: 'Comparison',
    definition: 'A comparison that describes through visual resemblance — a word or image that stands in for something through visual similarity.',
    examples: [
      { line: 'His smile is a knife — you can see the edge in it' },
      { line: 'Her presence is like light through a slat — specific, sharp, and gone before you catch it' },
    ],
    elevates: 'The icon creates a visual shorthand — instead of describing a quality through abstract terms, it makes the listener see it. Visual comparison is more immediate than intellectual comparison because it bypasses analysis and creates direct perception.',
    tip: 'The visual comparison should be precise — not just any visual similarity but the specific angle that reveals the quality you\'re trying to capture. "His smile is a knife" works because knives reveal their edge only at certain angles, just as certain smiles do.',
  },

  {
    name: 'Parabola',
    category: 'Comparison',
    definition: 'An extended comparison told as a narrative — a story whose meaning comes from its structural similarity to the point being made.',
    examples: [
      { line: 'I planted a tree in concrete — and when people asked why I said: you\'ll see when it flowers' },
      { line: 'Tell a story about a man who kept showing up to a door that was always locked — that\'s the whole argument' },
    ],
    elevates: 'The parabola embeds the argument inside a story, making the point easier to absorb and harder to forget. The listener follows the narrative, arrives at the meaning, and feels they discovered it themselves. Stories teach without lecturing.',
    tip: 'The narrative vehicle must genuinely parallel the point — not just loosely relate to it. Every element of the story should map onto an element of the argument. If the mapping breaks down, so does the parabola.',
  },

  {
    name: 'Syncrisis',
    category: 'Comparison',
    definition: 'A comparison of opposites in parallel clauses — holding two contrasting things in grammatically equivalent structures.',
    examples: [
      { line: 'What I built in the light was real. What I survived in the dark was realer.' },
      { line: 'The rich man counts what he has. The wise man counts what he doesn\'t need.' },
    ],
    elevates: 'Parallel comparison of opposites creates maximum contrast with maximum structural elegance. The listener experiences both the similarity of form and the difference of content simultaneously — which is where the insight lives.',
    tip: 'The contrast should reveal something about the relative value of the two things — not just that they differ, but that the difference carries meaning. The comparison is the argument.',
  },

  // ── REPETITION ───────────────────────────────────────────────────────────────

  {
    name: 'Accumulatio',
    category: 'Repetition',
    definition: 'Heaping up of words, arguments, or examples for cumulative effect — building a pile of evidence, images, or charges.',
    examples: [
      { line: 'I gave you my time, my trust, my work, my doubt, my faith, my silence, my years' },
      { line: 'Cold streets, cold winters, cold phones, cold stares, cold coffee — it\'s all the same cold' },
    ],
    elevates: 'The accumulated list creates the sensation of overwhelm — the listener feels the weight of everything piled up. Each addition makes the whole heavier. When the subject is sacrifice, loss, or achievement, accumulatio converts abstract concepts into felt quantity.',
    tip: 'Vary the rhythm of the items in the list. Items of different lengths create a natural rise-and-fall. End with the heaviest item — the last thing in the pile is what the listener carries away.',
  },

  {
    name: 'Acervatio',
    category: 'Repetition',
    definition: 'The same as accumulatio — piling up of words or ideas for emphasis. The heap as rhetorical device.',
    examples: [
      { line: 'Every year, every setback, every door, every "no," every almost — it all went into this' },
      { line: 'Hunger and cold and doubt and time and distance — I carried all of it here' },
    ],
    elevates: 'The pile of experiences, rejections, or elements communicates lived weight. When a rapper lists everything they overcame, the listener understands not just what happened but the scale of what it cost. The heap is the proof.',
    tip: 'Let the pile be specific. Generic accumulation (hardship, struggle, pain) carries little weight. Specific accumulation (cold apartments, bounced checks, unreturned calls) makes the listener feel the texture of what was endured.',
  },

  {
    name: 'Congeries',
    category: 'Repetition',
    definition: 'A heap or accumulation of words, phrases, or ideas — similar to accumulatio, the congeries creates mass through collection.',
    examples: [
      { line: 'Everything in this verse — the imagery, the rhythm, the memory, the rage — is one thing piled on another' },
      { line: 'More words, more images, more weight — the congeries doesn\'t ask you to untangle it, just to feel it' },
    ],
    elevates: 'The congeries creates a sense of richness — the verse has too much to contain. This abundance signals that the subject demands more than a single approach. Multiple angles, multiple images, multiple strategies all pointed at the same target.',
    tip: 'Use congeries when a single image or argument isn\'t large enough to carry the subject. The accumulation says: this can\'t be captured in one line. The pile is the evidence of scale.',
  },

  {
    name: 'Conversio',
    category: 'Repetition',
    definition: 'Returning to an earlier word or phrase — specifically, repetition at the ends of successive lines. Close to epistrophe.',
    examples: [
      { line: 'I built this from nothing — nothing / I started with nothing — nothing / I carried nothing until it wasn\'t nothing anymore' },
      { line: 'Everything I gave you was love / everything I kept from you was love / everything I finally said was love' },
    ],
    elevates: 'The returning word creates a closed loop — every line ends at the same place, like a toll booth the verse keeps passing through. The repeated ending accumulates meaning with each pass. By the final instance, the word carries the weight of everything that preceded it.',
    tip: 'The repeated ending word should be able to absorb multiple meanings as the lines progress. "Nothing" means literally nothing at first, then becomes something enormous by repetition. Choose a word that can bear that transformation.',
  },

  {
    name: 'Epanodos',
    category: 'Repetition',
    definition: 'Repeating words in reversed order or returning to the beginning after a digression — the circular structure that closes back on itself.',
    examples: [
      { line: 'I came here with nothing. Let me tell you what happened. And I came back with everything.' },
      { line: 'Started with just the words. Found the money. Found the respect. And in the end, I had just the words again — and that was enough.' },
    ],
    elevates: 'The circular structure creates narrative resolution — you end where you began, but everything has changed. The return to the beginning feels like completion: the journey was worth taking because it transformed what you found when you came back.',
    tip: 'Plan the circle before you write. Know where you\'ll return to at the start. The ending should echo the beginning, but the echoed words should carry new weight from everything that happened between them.',
  },

  {
    name: 'Epimone',
    category: 'Repetition',
    definition: 'Frequent repetition of a phrase or question to fix it in the listener\'s mind — the refrain-like return that makes something impossible to unhear.',
    examples: [
      { line: 'How much longer? How much longer? Every bar in the verse comes back to: how much longer?' },
      { line: 'The phrase "still here" recurring across all four verses — by the end it means something different' },
    ],
    elevates: 'Epimone creates a theme that accumulates meaning with each return. The first time is a statement. The third time is a conviction. The fifth time is a philosophy. The repetition doesn\'t diminish the phrase — it deepens it.',
    tip: 'Choose the phrase that can sustain multiple contexts. A phrase that means only one thing is exhausted quickly by repetition. A phrase that means something slightly different each time it appears — that\'s the engine of epimone.',
  },

  {
    name: 'Exergasia',
    category: 'Repetition',
    definition: 'Repeating the same idea through different rhetorical figures — the same truth expressed through metaphor, then parallel structure, then direct statement.',
    examples: [
      { line: 'I\'m immovable. I\'m the anchor and the rock and the thing that doesn\'t shift. I was built to stay.' },
      { line: 'They didn\'t deserve what I gave. What I sacrificed was beyond their capacity to value. The currency of what I offered was foreign to them.' },
    ],
    elevates: 'Each new expression of the same idea finds a different angle of approach, reaching listeners who might not have received the first or second version. It also creates the feeling of complete coverage — the idea has been examined from every side.',
    tip: 'Each repetition should use a different rhetorical mode: one metaphorical, one structural, one direct. The variety of forms prevents the repetition from feeling circular while reinforcing the single idea.',
  },

  {
    name: 'Expolitio',
    category: 'Repetition',
    definition: 'Repeating the same thought in different words and with different examples — elaborating a single point through varied restatement.',
    examples: [
      { line: 'I mean: I was there. What I\'m saying is: I watched it. Let me put it this way: I can\'t forget it.' },
      { line: 'In other words: they failed us. Which is to say: we were on our own. That\'s another way of saying: we figured it out ourselves.' },
    ],
    elevates: 'Some truths need multiple approaches before they fully land. Expolitio doesn\'t weaken the point by repeating it — it strengthens it by finding the angle of approach that breaks through. Each restatement is another path into the same room.',
    tip: 'Each restatement should be shorter and more direct than the last — the final version should be the simplest and the most absolute. Build the elaboration toward the plain statement that couldn\'t have been said without all the context.',
  },

  {
    name: 'Frequentatio',
    category: 'Repetition',
    definition: 'Heaping up the strongest arguments from what has been said — selective summary through accumulation of the most powerful points.',
    examples: [
      { line: 'All of that to say: I showed up, I stayed, I delivered. End of the case.' },
      { line: 'To review: I was right, they were wrong, and the record proves it.' },
    ],
    elevates: 'Recapitulation through the strongest points creates a sense of overwhelming evidence. By the time the heap arrives, the listener has absorbed each point individually — now seeing them piled together, the case becomes undeniable.',
    tip: 'Only heap the points that genuinely carried weight the first time. Including weak points in the frequentatio dilutes the pile. The accumulation should feel like evidence, not padding.',
  },

  {
    name: 'Mesarchia',
    category: 'Repetition',
    definition: 'Repetition of the same word at the beginning and middle of successive sentences — a blend of anaphora and mesodiplosis.',
    examples: [
      { line: 'I know what it costs, I know what I gave, I know the price of knowing too much' },
      { line: 'Real love is patient, real love is silent, real love shows up when you never asked it to' },
    ],
    elevates: 'The doubled repetition — at both start and middle — creates a dense, woven texture. The word echoes from two positions, surrounding the variable content between them. It creates the sense that the repeated word is the foundation on which everything else is built.',
    tip: 'Choose the repeated word carefully — it carries the most weight and appears most often. "Real," "love," "know," "time" — words broad enough to hold multiple contexts without losing meaning through repetition.',
  },

  {
    name: 'Mesodiplosis',
    category: 'Repetition',
    definition: 'Repetition of the same word in the middle of successive clauses — the repeated word functions as a hinge point.',
    examples: [
      { line: 'Built from pain, grown through pain, still here despite the pain' },
      { line: 'Lost it all — time, money, people, time — started over' },
    ],
    elevates: 'Middle repetition creates a rhythmic hinge — the repeated word is the pivot each clause turns on. The variety on each side of the hinge keeps the verse moving while the hinge word accumulates emphasis.',
    tip: 'Place the most emotionally loaded word at the hinge. The things on either side should vary — if all three middle words and all three surrounding phrases are the same, it\'s just repetition, not mesodiplosis.',
  },

  {
    name: 'Repetitio',
    category: 'Repetition',
    definition: 'General repetition of a word or phrase for emphasis — the broad category from which all the specific repetition devices derive.',
    examples: [
      { line: 'More. Always more. More than enough but still more.' },
      { line: 'It matters. It matters more than you know. It matters and I need you to know that.' },
    ],
    elevates: 'Repetition is the most fundamental rhetorical tool — saying a thing more than once signals that it cannot be passed over, cannot be forgotten. In music, repetition is what makes a melody a hook. In verse, it\'s what makes a word a belief.',
    tip: 'Each repetition should escalate — either in intensity, specificity, or emotional register. Flat repetition ("I tried, I tried, I tried") is weaker than escalating repetition ("I tried, I tried everything, I tried everything I had in me").',
  },

  {
    name: 'Synathroesmus',
    category: 'Repetition',
    definition: 'Heaping up of words for amplification — related to accumulatio, but specifically a list of similar things piled together.',
    examples: [
      { line: 'Patience, discipline, sacrifice, consistency, humility — all of it, at the same time, for years' },
      { line: 'The noise, the heat, the weight, the wait, the doubt, the debt' },
    ],
    elevates: 'The dense list creates sonic texture as well as semantic weight. The words themselves, stacked together, create a rhythm that reinforces the sense of accumulation. The listener feels surrounded by the piled items.',
    tip: 'Vary the syllable count of the items — two-syllable items alternating with one-syllable items create a more complex rhythm than all single syllables or all equal lengths.',
  },

  {
    name: 'Synonymia',
    category: 'Repetition',
    definition: 'Using several synonyms in succession for amplification — circling the same concept from multiple angles with different words.',
    examples: [
      { line: 'I was angry, furious, enraged, past the point of articulation' },
      { line: 'Tired, exhausted, spent, hollow — there\'s no word big enough for what I was' },
    ],
    elevates: 'Synonymia says: this thing is too large for any single word. Each synonym approaches from a different angle, and together they create a composite that\'s larger than any one term. The escalating synonyms also show the speaker in the act of searching for the right word — which is emotionally honest.',
    tip: 'Arrange synonyms in escalating intensity. The first should be the most general, the last the most extreme and specific. The final synonym is the one that says what the others were approaching.',
  },

  {
    name: 'Tautologia',
    category: 'Repetition',
    definition: 'Needless repetition of the same idea in different words — sometimes a fault, sometimes deliberate for emphasis or rhythmic effect.',
    examples: [
      { line: 'It\'s over, done, finished, complete, concluded, ended — there\'s nothing left' },
      { line: 'I know, I understand, I get it, I hear you — and I\'m still not changing' },
    ],
    elevates: 'Deliberate tautologia can be used for comic effect, to signal frustration, or to create hypnotic density. The listener understands that you\'re repeating — and the repetition itself becomes the message. "It\'s over" means one thing; "it\'s over done finished complete" means the speaker can\'t stop saying it, which says everything.',
    tip: 'Use tautologia when the emotional state justifies the verbal excess. The speaker who keeps restating the same point is revealing something about their inability to accept or move past it. The repetition is the psychology.',
  },

  {
    name: 'Transplacement',
    category: 'Repetition',
    definition: 'Using the same word repeatedly but in different positions in each clause — the word moves through the line like a ball through hands.',
    examples: [
      { line: 'Love made me. I made love into something else. Something else made love strange.' },
      { line: 'I work for the work. The work works through me. What works, I work with.' },
    ],
    elevates: 'The mobile repetition creates a sense that the word is alive, transforming with each context. The listener hears the same word arrive from different grammatical positions — subject, object, verb — and each position reveals a new dimension of the word\'s meaning.',
    tip: 'Choose a word with enough semantic range to absorb multiple grammatical positions without losing meaning. Monosyllabic, high-frequency words — work, love, time, real, free — handle transplacement better than specific nouns.',
  },

  {
    name: 'Traductio',
    category: 'Wordplay',
    definition: 'Using the same word several times in different senses or with different emphases — each repetition twists the meaning.',
    examples: [
      { line: 'I found my mind when I lost my mind. That kind of lost is how you find.' },
      { line: 'I\'m cold: cold as in detached, cold as in calculated, cold as in they left me in the cold' },
    ],
    elevates: 'Each twist of the word reveals a new facet of its meaning — the listener tracks the word across its variations and arrives at a more complete understanding than any single definition could provide. It\'s a semantic journey inside a single word.',
    tip: 'Use traductio for words with rich semantic fields — words that carry multiple legitimate meanings. The contrasts between the meanings should illuminate something about the subject. "Cold" meaning detached and cold meaning the childhood of poverty — that contrast says something.',
  },

  // ── STRUCTURE ────────────────────────────────────────────────────────────────

  {
    name: 'Anacoloutha',
    category: 'Structure',
    definition: 'Grammatical inconsistency — beginning a sentence with one structure and completing it with another. The syntax shifts mid-sentence.',
    examples: [
      { line: 'Everything I worked for — they just took it.' },
      { line: 'To survive this city, you need — actually, survival isn\'t even the word.' },
    ],
    elevates: 'A grammatical break-and-shift can signal the speaker\'s emotional disruption — the sentence changes direction because the thought couldn\'t be contained in the original form. Used deliberately, it creates authentic psychological texture: this is what a mind looks like mid-struggle.',
    tip: 'The break should feel like a genuine interruption of thought, not a careless mistake. Set up the original grammatical path clearly, then disrupt it in a way that reveals something — a correction, an overflow, a sudden arrival at a different truth.',
  },

  {
    name: 'Anapodoton',
    category: 'Structure',
    definition: 'A sentence with a clear if-clause but no completing then-clause — the expected resolution is withheld.',
    examples: [
      { line: 'If you knew what I gave up for this...' },
      { line: 'If they could have seen what I saw...' },
    ],
    elevates: 'The unresolved conditional is a form of aposiopesis applied to logical structure. The listener\'s mind rushes to complete the sentence — and what they supply is always more emotionally resonant than any ending you could provide. The unfinished "if" becomes an invitation.',
    tip: 'The "if" clause must set up something the listener can feel. Vague conditionals produce vague responses. "If you knew what it cost me to smile through all of that..." creates a specific emotional gap the listener can inhabit.',
  },

  {
    name: 'Diazeugma',
    category: 'Structure',
    definition: 'Multiple predicates attached to a single subject — one subject performs a long series of actions.',
    examples: [
      { line: 'I came, I watched, I struggled, I fell, I got up, I found it, I built it, I held it.' },
      { line: 'She prayed every morning, ran every night, saved every dollar, trusted the wrong person, and never gave up.' },
    ],
    elevates: 'The single subject accumulating actions creates a sense of narrative momentum — the same person persisting through everything. Each predicate adds to the account of what was endured or achieved. The subject doesn\'t change; only the accumulation of their actions changes.',
    tip: 'The series of predicates should escalate toward the most important action. The final predicate is where the argument lands. Everything before it is buildup.',
  },

  {
    name: 'Enallage',
    category: 'Structure',
    definition: 'Substituting one grammatical form for another — using the wrong tense, number, or person deliberately for effect.',
    examples: [
      { line: '"You just stand there" instead of "I stood there" — the distance collapses into present tense immediacy' },
      { line: 'Speaking in second person to describe your own experience: "you wake up and the house is empty"' },
    ],
    elevates: 'The grammatical shift creates a perspective effect — moving from "I" to "you" puts the listener inside the experience. Moving from past tense to present makes the memory feel immediate. The "wrong" grammar creates a psychological effect the correct grammar cannot.',
    tip: 'The most powerful enallage in hip-hop is the second-person shift: "I" becomes "you." Suddenly the listener is inside the story, not watching it. Use it for your most vulnerable bars — the moments you want the listener to inhabit, not observe.',
  },

  {
    name: 'Hendiadys',
    category: 'Structure',
    definition: 'Expressing a single idea through two coordinate nouns (or adjectives) rather than a noun modified by an adjective — "with might and force" instead of "with mighty force."',
    examples: [
      { line: 'With patience and fire — meaning: with passionate patience, a slow-burning determination' },
      { line: 'Built on sweat and time — meaning: built through sustained hard work over years' },
    ],
    elevates: 'Two nouns side by side create more visual and emotional weight than an adjective-noun pair. Each noun stands as its own thing — the compound carries both independently before the two meanings merge. The pairing enriches both words through proximity.',
    tip: 'Choose noun pairs where both words have independent resonance. "Sweat and time" works because both words carry full weight alone. "Effort and duration" is the same idea but weaker because neither word has physical presence.',
  },

  {
    name: 'Hysterologia',
    category: 'Structure',
    definition: 'Placing later in the sentence what logically should come first — the natural temporal or causal order is reversed.',
    examples: [
      { line: 'I ate last, after everyone else had left, if there was anything left' },
      { line: 'And then I built it — everything they said couldn\'t be built, before I even had the tools' },
    ],
    elevates: 'Reversed sequence creates a retrospective quality — the end is stated first, then the conditions of the beginning follow. This creates the feeling of memory: you know the outcome, and what comes next is the context that explains it.',
    tip: 'Use hysterologia when the outcome is the emotionally important part and the conditions are explanatory. Starting with the result and working backward creates a different kind of suspense — not "what happens" but "how did we get there."',
  },

  {
    name: 'Hysteron Proteron',
    category: 'Structure',
    definition: 'Putting what should logically come last first — reversal of the natural or temporal sequence.',
    examples: [
      { line: 'I\'m already where you\'re trying to get to — let me show you how I got here' },
      { line: 'The destination is the starting point. I\'m telling the story backwards.' },
    ],
    elevates: 'Reversed sequence creates a narrative surprise — the ending arrives before the journey, which makes the journey into a revelation of how something already established came to be. It asks: now that you know where we end up, let me show you how it happened.',
    tip: 'Use hysteron proteron when the ending is so important that starting with it changes how the listener understands the whole journey. In autobiography, beginning with the achievement and working backward to the hunger can be more powerful than the chronological rise.',
  },

  {
    name: 'Scesis Onomaton',
    category: 'Structure',
    definition: 'A sentence constructed entirely of nouns and adjectives, without verbs — pure description without action.',
    examples: [
      { line: 'Empty pockets. Cold walls. Quiet hunger. The whole story right there.' },
      { line: 'Late nights, old dreams, borrowed time, faded photographs.' },
    ],
    elevates: 'The verbless sentence creates a static, painterly quality — a snapshot rather than a narrative. Without verbs, there is no action, only presence. This creates emotional weight through absence of movement: things just are, not happening, just existing.',
    tip: 'Use scesis onomaton for moments that deserve to be held in suspension — a grief that isn\'t moving through time, an image that needs to be seen without explanation. The absence of verbs is the silence that follows a statement too large to unpack.',
  },

  {
    name: 'Syllepsis',
    category: 'Structure',
    definition: 'Using one word to govern two or more others in different and sometimes conflicting senses — the word applies to each differently.',
    examples: [
      { line: 'She broke my heart and my habits, both in the same afternoon' },
      { line: 'He took my money and my youth — the word "took" does two different kinds of violence' },
    ],
    elevates: 'The single word carrying two meanings simultaneously creates compression and complexity. The listener processes both applications at once — and the tension between them is where the poetry lives. One word, two stories.',
    tip: 'The two applications should be genuinely different in kind — not just two physical things but one physical and one abstract, or two things from completely different registers. The greater the distance between the two applications, the more powerful the syllepsis.',
  },

  {
    name: 'Zeugma',
    category: 'Structure',
    definition: 'One word governing two or more others in different senses — a single verb or preposition applying to multiple objects, each in a different way.',
    examples: [
      { line: 'He lost his temper and his wallet — different "lost" for each' },
      { line: 'She gave me her trust and three years — one act, two things of incomparable different kinds' },
    ],
    elevates: 'Zeugma is compression through grammatical double-duty — one word does the work of two differently. The slight wrongness of using the same word for incompatible objects creates a kind of poetic friction. The listener notices the grammatical strain and that noticing is the delight.',
    tip: 'The zeugmatic word should be familiar and simple. Complex verbs draw too much attention to themselves. The simple verb ("gave," "lost," "took") allows the two very different objects to create the effect, not the verb.',
  },

  {
    name: 'Synchysis',
    category: 'Structure',
    definition: 'A deliberately confused or disordered arrangement of words — chaos in syntax used to create disorientation or mirror mental disorder.',
    examples: [
      { line: 'Everything fast and wrong and too late and the door already closed and why' },
      { line: 'I don\'t even — the noise of it — everything at once — the year it happened — I can\'t structure it' },
    ],
    elevates: 'Syntactic disorder mirrors psychological disorder. When a speaker\'s syntax fragments, the listener experiences the fragmentation emotionally. Trauma, grief, overwhelming joy, panic — these states can\'t be expressed in ordered sentences without betraying their nature.',
    tip: 'Use synchysis sparingly and in specific emotional contexts where the chaos is appropriate. A verse that\'s disordered for no reason is just confusing. But a carefully placed syntactic collapse — at the moment of maximum emotional intensity — is devastating.',
  },

  {
    name: 'Syntheton',
    category: 'Structure',
    definition: 'Coupling together two or more words — the compound pairing that creates a new unit from its parts.',
    examples: [
      { line: 'Life-and-death decisions made in hunger-and-cold conditions' },
      { line: 'Pain-and-pride, faith-and-doubt — the hyphenated paradoxes of being alive' },
    ],
    elevates: 'The paired compound creates a unit that is more than either word alone. The coupling implies that the two things always come together — they\'re inseparable aspects of the same reality. "Hunger and cold" are never separate where this speaker comes from.',
    tip: 'The most powerful synthetonal pairs are genuinely conjoined in reality — things that actually occur together and reveal something about that togetherness. Not random pairings for sonic effect, but pairings that are true.',
  },

  {
    name: 'Taxis',
    category: 'Structure',
    definition: 'Orderly arrangement — placing elements in their proper logical or chronological order.',
    examples: [
      { line: 'First the grind, then the recognition, then the question of what you want now that you have it' },
      { line: 'Set up, development, turn, resolution — the architecture beneath every good verse' },
    ],
    elevates: 'Order creates clarity. When a verse has proper taxis — a clear beginning, middle, and end — the listener can track the argument or narrative without effort. They don\'t have to work to understand the structure; they can give all their attention to the content.',
    tip: 'Map the order of your verse before you write it. Know what\'s first, what\'s second, and what\'s the destination. The listener should never wonder where you are in the argument.',
  },

  // ── IMAGERY & DESCRIPTION ────────────────────────────────────────────────────

  {
    name: 'Chronographia',
    category: 'Imagery & Description',
    definition: 'Description of a time or period — creating the texture of an era, a season, or a specific moment through sensory detail.',
    examples: [
      { line: 'The 90s: dial-up modems, burned CDs, pagers and beepers and the smell of fast food after school' },
      { line: 'That winter when everything froze — the pipes, the money, the conversations' },
    ],
    elevates: 'Temporal description grounds the narrative in a specific historical moment, making it real. The listener who lived in the same era recognizes the details; the listener who didn\'t inhabits a vividly constructed world. Chronographia converts abstract time into lived experience.',
    tip: 'Choose the most specific sensory details of the time period — not the broad strokes of history but the small, everyday textures that only someone who was there would know. That specificity is the proof of presence.',
  },

  {
    name: 'Descriptio',
    category: 'Imagery & Description',
    definition: 'A detailed description of a person, place, object, or situation — making the subject fully present through accumulation of specific detail.',
    examples: [
      { line: 'Let me describe the apartment: single bulb, linoleum floor, a mattress on the floor and a window that let in more cold than light' },
      { line: 'My grandfather: hands like geography, voice like something that had been through fire and kept going' },
    ],
    elevates: 'Description is the basic act of making language physical — converting abstraction into presence. When the details are specific, the listener sees, hears, and smells the subject. Description is what separates "I was poor" from something the listener can feel.',
    tip: 'Go for the unexpected detail — the thing you\'d only notice if you were really looking. Anyone can describe a sad room as "dark and empty." The specific crack in the linoleum, the specific smell of old cooking, the specific sound of the building — those are the details that prove you were there.',
  },

  {
    name: 'Diaskeue',
    category: 'Imagery & Description',
    definition: 'Amplifying the most striking details of a description — making the vivid more vivid through intensification.',
    examples: [
      { line: 'It wasn\'t just cold — the cold had weight, it had presence, it sat on your chest and didn\'t move' },
      { line: 'Not just loud — it was the kind of loud that rearranged the furniture in your chest' },
    ],
    elevates: 'Amplification of the right detail does more than adding more description — it focuses the listener\'s attention on what matters most. By making one detail larger, more vivid, more extreme, the speaker signals: this is the thing that carries the meaning.',
    tip: 'Choose the one detail that, if intensified, reveals everything. Amplifying the wrong detail just creates noise. The detail that deserves diaskeue is the one that, made larger, opens up the whole experience.',
  },

  {
    name: 'Ecphrasis',
    category: 'Imagery & Description',
    definition: 'Detailed description of a work of art, place, or object — making the absent vividly present through language.',
    examples: [
      { line: 'I will describe this block so completely that anyone who\'s walked it knows it exactly, and anyone who hasn\'t feels they lived there' },
      { line: 'Let me give you the mural on the corner: who made it, what it shows, what it meant to everyone who walked past it for twenty years' },
    ],
    elevates: 'Ecphrasis is the art of making language compete with visual experience — creating an image in the mind\'s eye through words alone. When done well, the description is more real than a photograph because it includes everything the photograph can\'t: smell, memory, meaning.',
    tip: 'Describe not just what a thing looks like but what it means to the people who interact with it. The mural on the corner has a visual reality and a social reality. Both together make it real.',
  },

  {
    name: 'Effictio',
    category: 'Imagery & Description',
    definition: 'A detailed portrait of a person through physical description — the full body portrait in language.',
    examples: [
      { line: 'Let me tell you what he looked like: walked like something that had survived, talked like it hadn\'t forgotten how much surviving cost' },
      { line: 'She wore the years in her eyes. Her hands were a whole biography.' },
    ],
    elevates: 'Physical description of people is a form of memory and honor. When someone is described specifically — the particular way they moved, the particular line in their face — they become real in a way that general tribute cannot achieve. The body carries the biography.',
    tip: 'Focus on the detail that is specific to this person and no one else — the thing that, described, makes anyone who knew them immediately recognize them. Generic physical description is forgettable. Specific physical memory is portraiture.',
  },

  {
    name: 'Enargia',
    category: 'Imagery & Description',
    definition: 'Vivid description that creates the sensation of being present — description so clear that the absent thing becomes immediately real.',
    examples: [
      { line: 'I am going to put you in that room. You can smell the smoke, feel the floor, hear the argument through the wall.' },
      { line: 'By the time this bar is over you will have been in the car with me on that night in February.' },
    ],
    elevates: 'The highest form of descriptive writing is one that makes the listener feel they are experiencing something rather than being told about it. Enargia is the name for that quality — the vividness that creates presence. It\'s the difference between a report and a scene.',
    tip: 'Enargia requires all five senses and the sense of time. What does the place look like, smell like, sound like? What time of day? What season? What is the emotional temperature? The more senses you activate, the more present the listener becomes.',
  },

  {
    name: 'Hypotyposis',
    category: 'Imagery & Description',
    definition: 'Vivid description that makes absent things present — a broader category that includes enargia and ekphrasis.',
    examples: [
      { line: 'The whole verse is a window into a world you weren\'t there for — but when it\'s done right, you were' },
      { line: 'This is how the block looked at 2am: empty cans, corner store shut, the only light a phone screen' },
    ],
    elevates: 'Making the absent present is one of storytelling\'s fundamental powers. Hypotyposis is why listeners close their eyes at certain verses — because the description has created something real enough to see. Language becomes experience.',
    tip: 'The goal isn\'t photographic accuracy but emotional accuracy. The details that create presence aren\'t necessarily the most objectively precise — they\'re the ones that carry the most meaning. Choose them accordingly.',
  },

  {
    name: 'Pragmatographia',
    category: 'Imagery & Description',
    definition: 'Vivid description of an action or event — making a moment or incident so clear the listener witnesses it.',
    examples: [
      { line: 'I\'m going to show you exactly what happened: the knock, the door, the voices, the way the room changed' },
      { line: 'Frame by frame: she turned around, she saw it, she didn\'t say anything. That silence was the loudest thing in the room.' },
    ],
    elevates: 'Describing action in specific, step-by-step detail creates the feeling of witnessing — the listener becomes an eyewitness to the event. This is how narrative bars create impact: not by stating what happened but by showing it happening.',
    tip: 'Slow down the action. Real events happen fast; vivid description slows them to a pace where the listener can see every detail. The slow-motion rendering of a fast moment is where the emotional weight lives.',
  },

  {
    name: 'Prosopographia',
    category: 'Imagery & Description',
    definition: 'Description of an absent or imaginary person\'s appearance — conjuring the physical reality of someone who is not present.',
    examples: [
      { line: 'I want to describe my father to you the way I remember him — height, voice, the way he filled a room' },
      { line: 'Let me tell you what grief looks like when it\'s wearing a person\'s face' },
    ],
    elevates: 'The description of an absent person is an act of resurrection — you are making them present through language. When the description is specific, the absent person becomes real to the listener. This is one of hip-hop\'s most powerful elegiac modes.',
    tip: 'Describe the absent person through their most distinctive, individual qualities — not their appearance in general, but the specific way they moved, the specific sound of their voice, the specific gesture that meant them and no one else.',
  },

  {
    name: 'Topographia',
    category: 'Imagery & Description',
    definition: 'Description of a specific place — making a physical location real through sensory detail.',
    examples: [
      { line: 'Let me show you the corner: the bodega on one side, the church on the other, and us in between' },
      { line: 'Third floor apartment, building on 145th — I can describe it with my eyes closed' },
    ],
    elevates: 'Place in hip-hop is identity. Where you\'re from shapes what you say and how you say it. The vivid description of a specific place — the exact intersection, the specific smell of the specific building — grounds the artist in a real world and tells the listener exactly who they\'re dealing with.',
    tip: 'The most powerful place descriptions identify the things that only that place has — the specific bodega, the specific park, the specific sound at that specific corner. Generic urban description could be anywhere. Specific description is exactly one place.',
  },

  {
    name: 'Topothesia',
    category: 'Imagery & Description',
    definition: 'Description of an imaginary place — creating a vivid fictional location through language.',
    examples: [
      { line: 'I built a city in my mind where everything I lost still lives' },
      { line: 'There\'s a place I go to in my head when the real world gets too loud — here\'s what it looks like' },
    ],
    elevates: 'The invented place externalizes an internal reality — makes a psychological state spatial and visible. When an artist describes a place that doesn\'t physically exist but is emotionally real, they\'re doing something dreams and memory already do. The invented geography makes the feeling navigable.',
    tip: 'Ground the imaginary place in specific sensory details, even if they\'re impossible. "The sky there is always the color of 3am" — impossible but real. Specificity makes the imaginary feel true.',
  },

  {
    name: 'Geographia',
    category: 'Imagery & Description',
    definition: 'Description of places generally — the geographic survey as a form of establishing world and context.',
    examples: [
      { line: 'From the coastline to the inland, from the corner to the county — this is the map of where I come from' },
      { line: 'Every city I\'ve been to has a version of this same block — the geography changes but the story stays' },
    ],
    elevates: 'Geographic description establishes the world scale of a verse — situating personal experience within physical and political geography. It says: this isn\'t just my block, it\'s this region, this country, this historical landscape. The personal is always somewhere.',
    tip: 'Move from wide to specific: start with the broad geographic context, narrow to the specific location, then down to the single corner, the single room. The zoom creates intimacy.',
  },

  {
    name: 'Hydrographia',
    category: 'Imagery & Description',
    definition: 'Description of water — rivers, oceans, rain, floods as imagery.',
    examples: [
      { line: 'The river behind the neighborhood ran gray all winter — that\'s the color I think of when I think of patience' },
      { line: 'Rain in this city sounds different — like something the sky has been holding back for months' },
    ],
    elevates: 'Water in hip-hop is one of the most resonant natural images — fluid, powerful, capable of both sustaining life and causing destruction. The specific description of water in a specific place grounds the elemental in the personal. Rain, rivers, and oceans carry enormous emotional weight when rendered specifically.',
    tip: 'Water descriptions work best when the water\'s properties (movement, opacity, temperature, sound) mirror the emotional state being described. Gray water for depression, clear water for clarity, rain for release or relief.',
  },

  {
    name: 'Anemographia',
    category: 'Imagery & Description',
    definition: 'Description of the wind — using wind as image, metaphor, or setting detail.',
    examples: [
      { line: 'Chicago winds weren\'t weather — they were a character, and they had opinions about you' },
      { line: 'The wind the night she left: I remember it specifically because it seemed to be doing what I couldn\'t' },
    ],
    elevates: 'Wind is invisible force — the perfect image for things that can\'t be seen but are undeniably felt. In hip-hop, wind descriptions can carry grief, change, power, or indifference. The wind that doesn\'t care is often the right image for an indifferent world.',
    tip: 'Give the wind a personality that mirrors the emotional environment. An indifferent wind, a hostile wind, a cleansing wind — the personified weather carries the emotional temperature of the verse.',
  },

  // ── ARGUMENT & LOGIC ─────────────────────────────────────────────────────────

  {
    name: 'Aetiologia',
    category: 'Argument & Logic',
    definition: 'Giving reasons or causes — explaining why something is the case. The formal explanation of origin or motivation.',
    examples: [
      { line: 'I tell you why I am this way, so you understand what you\'re dealing with' },
      { line: 'The reason isn\'t complicated: this happened, then this happened, and I became what I needed to be to survive both.' },
    ],
    elevates: 'Explanation of cause deepens understanding and creates empathy. When a speaker explains why they are what they are, the listener moves from judgment to comprehension. Aetiologia converts biography into argument: this is what made me, and that making is the evidence.',
    tip: 'The cause you cite should be specific and unpredictable — not the generic childhood trauma story but the particular event, the specific turning point. The unexpected cause creates more insight than the expected one.',
  },

  {
    name: 'Anticategoria',
    category: 'Argument & Logic',
    definition: 'Counter-accusation — responding to an attack by turning the same or worse charge back on the attacker.',
    examples: [
      { line: 'You\'re calling me disloyal? Let\'s talk about 2018 when you disappeared for six months.' },
      { line: 'You\'re accusing me of the exact thing you\'ve been doing to everyone around you for years.' },
    ],
    elevates: 'The counter-accusation in hip-hop is the rhetorical foundation of the diss — turning the attack back with force. It\'s most powerful when the counter-charge is more specific and better-evidenced than the original accusation. The attacker becomes the attacked.',
    tip: 'The counter-accusation must be proportionate or greater than the original charge. A weak counter makes the original accusation look stronger. The point is to overturn the accusation, not match it.',
  },

  {
    name: 'Antilogy',
    category: 'Argument & Logic',
    definition: 'A contradiction within an argument — two positions held simultaneously that cannot both be true.',
    examples: [
      { line: 'You said you didn\'t care, but you\'ve been talking about it for two years — those are two different truths that can\'t both be true' },
      { line: 'You claim poverty and live large — I\'m just describing what I see' },
    ],
    elevates: 'Exposing an internal contradiction is one of the most surgical rhetorical moves in hip-hop. The counter-argument doesn\'t require a refutation — just a clear statement of the two incompatible positions. The contradiction speaks for itself.',
    tip: 'State both contradictory positions with precision, then step back. The contradiction should be undeniable — not a matter of interpretation. The speaker\'s own words are the best evidence.',
  },

  {
    name: 'Antirrhesis',
    category: 'Argument & Logic',
    definition: 'Rejecting an argument, accusation, or authority as irrelevant, insufficient, or unworthy of response.',
    examples: [
      { line: 'That argument doesn\'t apply here. The rules are different where I come from.' },
      { line: 'That authority means nothing in this context. Try again with something that matters.' },
    ],
    elevates: 'Dismissing an argument as irrelevant is often more powerful than refuting it — it signals that the speaker is operating on a different level where the argument doesn\'t reach. Used with confidence, antirrhesis closes the debate without engaging it.',
    tip: 'The rejection must be earned — it only works when the speaker has established enough credibility that dismissing the argument seems justified, not evasive. Without established authority, antirrhesis reads as deflection.',
  },

  {
    name: 'Apodixis',
    category: 'Argument & Logic',
    definition: 'Proving a point from common experience or universal knowledge — appealing to what everyone knows to be true.',
    examples: [
      { line: 'Everybody knows how this ends when you make that choice — I\'m not the first to say it' },
      { line: 'You don\'t need me to tell you what poverty does to a family — you already know' },
    ],
    elevates: 'The appeal to common knowledge creates an unspoken contract with the listener — I don\'t need to prove this because you already know it\'s true. It converts the speaker\'s personal claim into shared wisdom, which is rhetorically unassailable.',
    tip: 'Use apodixis only when the appeal to common knowledge is actually universal. If the "everyone knows" is only known in your specific community, acknowledge that. False universals alienate listeners who don\'t share the presumed knowledge.',
  },

  {
    name: 'Assumptio',
    category: 'Argument & Logic',
    definition: 'Taking up an argument from the opponent\'s own position and using it against them — turning their logic back on itself.',
    examples: [
      { line: 'You said the work ethic matters most — good. Now tell me who was in the studio every night.' },
      { line: 'By your own standard, using your own framework: I win.' },
    ],
    elevates: 'Turning an opponent\'s argument against them is the highest form of rhetorical ju-jitsu. It requires complete understanding of their position — you have to accept their premise in order to show it leads to a conclusion they don\'t want. It\'s undismissable because the speaker can\'t reject their own argument.',
    tip: 'State the opponent\'s premise clearly before turning it. The listener needs to understand what you\'re accepting before they see you redirect it. The acceptance makes the redirection more devastating.',
  },

  {
    name: 'Contrarium',
    category: 'Argument & Logic',
    definition: 'Arguing from the contrary — using the opposite case to prove the current one. If X were the case, then Y would be true; Y is not true; therefore X is not the case.',
    examples: [
      { line: 'If I was what you say I am, I wouldn\'t have done what I did. The record contradicts the accusation.' },
      { line: 'The opposite of what you\'re describing would look like this — and that\'s exactly what happened' },
    ],
    elevates: 'Arguing from the contrary is logical but feels like more than logic — it shows that the speaker has imagined the alternative and found it impossible. The negative example illuminates the positive case by contrast.',
    tip: 'Construct the contrary case with enough specificity that the audience can evaluate it. The contrary must be genuinely impossible given the facts, not just implausible. If the contrary is actually plausible, the argument doesn\'t work.',
  },

  {
    name: 'Dialysis',
    category: 'Argument & Logic',
    definition: 'Presenting alternatives exhaustively and then eliminating all but one — the systematic narrowing to the only possible conclusion.',
    examples: [
      { line: 'There were three options. Two of them led to the same place I came from. So I took the third.' },
      { line: 'Either it was fate, or it was work, or it was luck. Eliminate two of those. What\'s left is what I stand on.' },
    ],
    elevates: 'Systematic elimination is rigorous and demonstrates complete thinking. When a speaker has considered every alternative and found them wanting, the single remaining option carries the authority of necessity rather than preference.',
    tip: 'List the alternatives honestly, including the ones the listener might prefer. Dismissing the comfortable alternatives fairly, before arriving at the hard truth, is more convincing than only listing the easy alternatives.',
  },

  {
    name: 'Dilemma',
    category: 'Argument & Logic',
    definition: 'Presenting an opponent with two choices, both of which are unfavorable — the "no-win" argument.',
    examples: [
      { line: 'Either you knew and didn\'t say something, or you didn\'t know and should have — neither answer is good for you' },
      { line: 'If you respond you prove the point. If you don\'t respond, you prove a different point. Welcome to the dilemma.' },
    ],
    elevates: 'The no-win framing is one of the most powerful positions in hip-hop argumentation. When you have genuinely constructed a situation where any response is a losing response, the opponent has no rhetorical exit. The dilemma doesn\'t need to be cruel — just logically airtight.',
    tip: 'Make sure both horns of the dilemma are real. If there\'s an obvious third option you\'ve overlooked, the dilemma collapses. Test it by trying to find the escape yourself before presenting it as inescapable.',
  },

  {
    name: 'Enthymeme',
    category: 'Argument & Logic',
    definition: 'An argument with an implied rather than stated premise — you supply two terms and leave the listener to supply the logical connective.',
    examples: [
      { line: 'I grew up in that neighborhood. I know what it does to people. Draw your own conclusion.' },
      { line: 'He had the opportunity. He had the motive. The rest is obvious.' },
    ],
    elevates: 'The argument with the missing premise invites the listener to complete the syllogism themselves — and arguments you arrive at yourself are more convincing than arguments you\'re given. The enthymeme respects the listener\'s intelligence and creates complicity.',
    tip: 'The implied premise must be one the listener will supply automatically and correctly. If the implied premise is controversial or unclear, the enthymeme fails — the listener supplies the wrong link and the argument doesn\'t land.',
  },

  {
    name: 'Expeditio',
    category: 'Argument & Logic',
    definition: 'Eliminating all alternatives except the one to be argued for — systematic dismissal leading to a single inevitable conclusion.',
    examples: [
      { line: 'Not talent alone — I\'ve seen talented people fail. Not luck — luck ran out on me early. Not connections — I had none. What\'s left? Work.' },
      { line: 'Take away everything else and what you have left is the truth I\'ve been building toward this whole verse.' },
    ],
    elevates: 'By dismissing everything that doesn\'t explain the outcome, the speaker arrives at the one true cause through elimination. The listener watches the field narrow to a single point — and that point, when reached, feels inevitable rather than asserted.',
    tip: 'Dismiss each alternative with specific evidence, not just assertion. "Not talent alone — I\'ve seen talented people fail" is a dismissal with evidence. "Not talent alone — that\'s not the whole story" is just a dismissal.',
  },

  {
    name: 'Inter Se Pugnantia',
    category: 'Argument & Logic',
    definition: 'Arguments that contradict each other — pointing out the internal inconsistency in an opponent\'s case.',
    examples: [
      { line: 'In verse one you said loyalty. In verse two you said opportunity. You can\'t hold both.' },
      { line: 'The first claim kills the second. You can\'t have both things be true.' },
    ],
    elevates: 'Exposing internal inconsistency is clean, undeniable work — you don\'t need to provide counter-evidence, just quote the person back to themselves and let the contradiction do its job. The speaker who contradicts themselves has lost the argument to their own words.',
    tip: 'State both contradictory positions with precision, in the order they were made. The listener needs to feel the collision of the two positions. Don\'t editorialize — just juxtapose. The contradiction speaks.',
  },

  {
    name: 'Paromologia',
    category: 'Argument & Logic',
    definition: 'Conceding a point to make a stronger one — giving up a small argument in order to win the large one.',
    examples: [
      { line: 'You\'re right, I made mistakes. I\'m not here to argue that. I\'m here to talk about what came after the mistakes.' },
      { line: 'Conceded: I lost that round. Noted: I won the next five.' },
    ],
    elevates: 'Concession is a form of confidence. A speaker who can afford to give something up to prove something larger is operating from strength, not weakness. It also creates credibility — the willingness to acknowledge fault makes the subsequent argument more believable.',
    tip: 'The concession must be genuine, and the trade must be worth it. Give up something real to take something that matters more. The listener is watching the exchange — if the conceded point was worthless, the strategy reads as evasion.',
  },

  {
    name: 'Prolepsis',
    category: 'Argument & Logic',
    definition: 'Taking up an anticipated objection and answering it before it can be raised — pre-emptive refutation.',
    examples: [
      { line: 'Before you say I had privilege — let me describe what I actually started with' },
      { line: 'I know what you\'re thinking. Here\'s why you\'re wrong before you finish thinking it.' },
    ],
    elevates: 'Anticipating the counter-argument demonstrates that the speaker has fully considered the opposing position. It closes escape routes before the listener can take them. More than that, it signals intellectual honesty — the speaker isn\'t pretending the objection doesn\'t exist, they\'re dismantling it.',
    tip: 'Anticipate the strongest objection, not the weakest. Defeating a straw man doesn\'t impress anyone. Taking on the best counter-argument and beating it anyway — that\'s the move.',
  },

  {
    name: 'Prosapodosis',
    category: 'Argument & Logic',
    definition: 'Providing reasons for each of several preceding statements — going back to prove what you\'ve already asserted.',
    examples: [
      { line: 'I said I was loyal, I said I was committed, I said I sacrificed — and I\'m about to prove each of those in order' },
      { line: 'Three claims, three proofs. Watch.' },
    ],
    elevates: 'The commitment to prove each preceding statement is a form of rhetorical integrity — you made claims and you\'re fulfilling the obligation to substantiate them. It creates structural satisfaction: the listener watches each claim get backed up in turn.',
    tip: 'Set up the claims clearly before providing the proofs. The listener should be able to match each proof to each claim. Numbered structure helps — "first I said X, here\'s why X is true" — but it shouldn\'t feel mechanical.',
  },

  {
    name: 'Pysma',
    category: 'Argument & Logic',
    definition: 'Asking multiple questions at once without waiting for answers — a rhetorical barrage of questions.',
    examples: [
      { line: 'Who was there? Who did the work? Who stayed? Who showed up when it mattered? Who? Tell me who?' },
      { line: 'How long? How much? How many? How many times did I have to prove it before you believed it?' },
    ],
    elevates: 'The question barrage overwhelms — not through one unanswerable question but through the accumulation of many. The listener cannot process them all, and in that overwhelm experiences the emotional weight of what\'s being asked. Each unanswered question piles on the last.',
    tip: 'The questions in a pysma should build in intensity and specificity. Start broadly, narrow to the most personal and unanswerable. The final question is the one that lands hardest because the buildup makes it undodgeable.',
  },

  {
    name: 'Ratiocinatio',
    category: 'Argument & Logic',
    definition: 'Drawing a conclusion through a chain of reasoning — each step following necessarily from the last.',
    examples: [
      { line: 'I started from nothing. Nothing teaches you everything. Everything I know came from nothing. Therefore: I know more than someone who started with something.' },
      { line: 'The environment shaped the person. The person shaped the art. The art shaped the culture. Follow the chain back and you find the block.' },
    ],
    elevates: 'The reasoned chain demonstrates intelligence and rigor. In hip-hop, the ability to construct a logical sequence — not just assert conclusions but trace the path to them — signals a different kind of craft. It converts autobiography into argument.',
    tip: 'Each step in the chain must follow necessarily from the previous. If any step is a jump rather than a logical consequence, the chain breaks. Test the sequence by asking: does this necessarily follow from that?',
  },

  {
    name: 'Restrictio',
    category: 'Argument & Logic',
    definition: 'Qualifying a general statement by excluding specific cases — "this is true, except when..."',
    examples: [
      { line: 'I trust everyone — except the ones who\'ve already shown me what their trust costs' },
      { line: 'I say what I mean, always — except when the truth will do more damage than the silence' },
    ],
    elevates: 'Qualification is a form of precision. A speaker who can state a principle and then identify its exact limits demonstrates complete understanding of both the rule and the reality it operates within. The exception reveals that the speaker lives in the real world, not in absolute abstractions.',
    tip: 'The restriction should be specific and should reveal something about the values behind the general principle. What you\'re willing to make exceptions for tells the listener as much about you as the principle itself.',
  },

  {
    name: 'Sorites',
    category: 'Argument & Logic',
    definition: 'A chain of syllogisms — each conclusion becomes the premise for the next argument. A logical cascade.',
    examples: [
      { line: 'Patience leads to consistency. Consistency leads to craft. Craft leads to reputation. Reputation opens doors that money can\'t buy.' },
      { line: 'First the hunger. The hunger brings the work. The work brings the skill. The skill is the only currency that doesn\'t devalue.' },
    ],
    elevates: 'The logical cascade creates the sense of a mind that has followed every implication to its end. Each link in the chain is small but the chain reaches enormous conclusions. The listener experiences the logic as movement — each step carries them somewhere new.',
    tip: 'Keep each step short. The power of a sorites is the length of the chain relative to the simplicity of each individual link. Long steps feel like leaps. Short steps that together reach far — that\'s the craft.',
  },

  {
    name: 'Subjectio',
    category: 'Argument & Logic',
    definition: 'Asking questions of oneself and answering them — a form of self-interrogation that processes doubt in front of the listener.',
    examples: [
      { line: 'Did I know it would cost this much? I did. Was I ready? No. Did I go anyway? Yes.' },
      { line: 'What did I learn? That the hardest lesson is the one you already knew. What do I do with that? Keep learning.' },
    ],
    elevates: 'Self-interrogation creates psychological transparency — the listener watches the speaker examine themselves in real time. It signals honesty and self-awareness: the speaker asks the hardest questions of themselves and doesn\'t look away from the answers.',
    tip: 'The questions you ask yourself should be the ones the listener would ask. Anticipate their doubts and interrogate yourself on their behalf. The self-answer is more convincing when the listener\'s question was already the speaker\'s own.',
  },

  // ── CONTRAST & IRONY ─────────────────────────────────────────────────────────

  {
    name: 'Amara Irrisio',
    category: 'Contrast & Irony',
    definition: 'Bitter mockery — irony deployed with genuine cruelty rather than playful wit. The mock that does not smile.',
    examples: [
      { line: 'Oh, congratulations on the deal. Real art takes more than a check, but congratulations.' },
      { line: 'Wonderful to see you doing so well — with my ideas, my sound, my lane.' },
    ],
    elevates: 'The distinction between wit and bitterness is the speaker\'s genuine anger. Amara irrisio doesn\'t invite the target to laugh along — it cuts with the intent to wound. In hip-hop, the bitter mock often carries more credibility than pure rage because it shows the speaker is hurt and still maintains composure.',
    tip: 'The bitterness should be specific enough to be credible and restrained enough to be devastating. A controlled bitter mock is more powerful than an out-of-control one. The speaker who is hurt but not unhinged is the speaker who wins.',
  },

  {
    name: 'Antiphrasis',
    category: 'Contrast & Irony',
    definition: 'Using a word in a sense completely opposite to its normal meaning — irony compressed into a single word.',
    examples: [
      { line: '"Beautiful" for something devastating. "Wonderful" for something terrible. The word is the irony.' },
      { line: 'Called it a "blessing" — everything that word pretends to be is what that situation wasn\'t.' },
    ],
    elevates: 'Single-word irony is one of the most efficient rhetorical tools — the contradiction between word and reality creates meaning through the gap. The listener hears both the word and its negation simultaneously, which is cognitively complex and emotionally resonant.',
    tip: 'The more extreme the gap between the word\'s usual meaning and the reality you\'re describing, the more powerful the antiphrasis. Calling a betrayal a "gift" is powerful because of how far the reality is from the word.',
  },

  {
    name: 'Antistasis',
    category: 'Contrast & Irony',
    definition: 'Repeating a word in a different or contrary sense — the same word, two meanings, creating a reversal.',
    examples: [
      { line: 'I used to be free — until freedom taught me what it cost' },
      { line: 'I know what loyalty means to you — and I know what loyalty actually means' },
    ],
    elevates: 'The repeated word that carries a different meaning reveals that the concept itself is contested. The speaker and the world use the same word but mean different things — and that gap is where the argument lives.',
    tip: 'The two meanings should be genuinely different — ideally, one the speaker\'s and one the opponent\'s. The contrast between the two definitions makes the argument visible without needing to make it explicit.',
  },

  {
    name: 'Antitheton',
    category: 'Contrast & Irony',
    definition: 'The formal argument from contrast — stating the opposing position in order to refute it or clarify the speaker\'s own position.',
    examples: [
      { line: 'The question is not whether I deserve this — the question is whether they do' },
      { line: 'Not what I was given — what I built despite what I wasn\'t given' },
    ],
    elevates: 'Stating the contrast makes the position clearer. The antitheton doesn\'t just assert your position — it defines it by opposition. What you\'re not is often as important as what you are, and the formal statement of the contrast sharpens both sides.',
    tip: 'The contrasted position should be genuinely held by someone — not a straw man. If the opposing position is real and fairly stated, defeating it carries weight. If it\'s a caricature, the victory is empty.',
  },

  {
    name: 'Diasyrmus',
    category: 'Contrast & Irony',
    definition: 'Rejecting an argument through ridicule rather than refutation — dismissing the opposing case as beneath serious engagement.',
    examples: [
      { line: 'You want me to respond to that? That argument?' },
      { line: 'I\'d dismantle this if there was anything to dismantle — but there isn\'t.' },
    ],
    elevates: 'Ridicule is a more powerful dismissal than refutation when the argument is genuinely weak. By laughing at an argument rather than engaging it, you signal that it doesn\'t deserve serious attention. But this only works when the target\'s weakness is obvious to everyone.',
    tip: 'Use diasyrmus only when the audience already shares your view that the argument is weak. If the argument seems plausible to the listener and you only ridicule it, the ridicule reads as evasion.',
  },

  {
    name: 'Enantiosis',
    category: 'Contrast & Irony',
    definition: 'Using opposites to confirm or expand a point — affirming something by describing both its presence and its absence.',
    examples: [
      { line: 'I won because I was afraid to lose and too tired to stop — the fear and the exhaustion are both the fuel' },
      { line: 'In the best of moments and the worst of moments, I was doing the same thing: working' },
    ],
    elevates: 'The use of opposites to describe the same thing creates completeness — you\'re not just affirming one side of the reality but capturing the full contradiction. It\'s more honest and more complex than a statement that only acknowledges one pole.',
    tip: 'The opposites should genuinely both be true — not manufactured contrast for effect. When the real experience involves simultaneously contradictory states, enantiosis is the most honest way to describe it.',
  },

  {
    name: 'Litotes',
    category: 'Contrast & Irony',
    definition: 'Understatement through the negation of the opposite — "not unhappy" instead of "happy." The double negative creates a careful, qualified affirmation.',
    examples: [
      { line: '"Not without sacrifice" — more powerful than "with great sacrifice"' },
      { line: '"This was not nothing" — the negated nothing is heavier than any positive term could be' },
    ],
    elevates: 'Litotes creates precision through indirection — the negation of the opposite signals careful modulation. "Not unhappy" isn\'t the same as "happy" — it implies happiness with reservations. The listener must consider what\'s excluded as well as what\'s included.',
    tip: 'Litotes works best when you need to affirm something without the full force of positive assertion — when the positive term would over-claim. "Not without effort" honors the struggle without converting it into heroics.',
  },

  {
    name: 'Meiosis',
    category: 'Contrast & Irony',
    definition: 'Deliberate understatement — describing something as smaller or less significant than it is, for irony or emphasis.',
    examples: [
      { line: '"It was a difficult period" — for a decade of near-destruction and gradual rebuilding' },
      { line: '"Things were a little challenging" — spoken about years that nearly ended everything' },
    ],
    elevates: 'The deliberate understatement creates irony through scale — the listener knows the magnitude of what\'s being minimized, and the gap between the mild language and the massive reality is where the meaning lives. Meiosis signals control: the speaker is so far past it they can make it small.',
    tip: 'Meiosis requires that the listener already knows the scale of what\'s being understated. If the true magnitude hasn\'t been established, the understatement just sounds like underreporting. Set up the scale, then meiosis it.',
  },

  {
    name: 'Mycterismus',
    category: 'Contrast & Irony',
    definition: 'Sarcastic mockery accompanied by gesture — irony that includes the physical performance of contempt.',
    examples: [
      { line: 'The sarcastic smile in the delivery — the voice that says "sure, of course" with a whole other meaning' },
      { line: 'Reading the words with everything in your voice that isn\'t in the words themselves' },
    ],
    elevates: 'In hip-hop, delivery is argument. The same words can mean entirely different things depending on how they\'re performed. Mycterismus is the performance layer of irony — when the voice, cadence, and delivery mock what the literal words accept, the listener hears both simultaneously.',
    tip: 'In written verse, mycterismus requires careful setup — words that clearly call for ironic delivery. Phrases like "sure," "absolutely," "wonderful" trigger ironic reading when the context has established that the literal meaning is false.',
  },

  {
    name: 'Sarcasmus',
    category: 'Contrast & Irony',
    definition: 'Bitter irony — mockery delivered with genuine hostile intent, not playful wit.',
    examples: [
      { line: 'Oh, I\'m sorry — I didn\'t realize your comfort was supposed to be my priority' },
      { line: 'Incredible work. Really. The level of mediocrity required to produce this is technically impressive.' },
    ],
    elevates: 'Sarcasm works best in hip-hop when it is precise and cold. The hostile irony signals that the speaker is past the point of direct argument — the target doesn\'t deserve engagement, only the demonstration of how obvious their failure is.',
    tip: 'The sarcasm should target something specific and demonstrable. Vague sarcasm sounds like bitterness. Precise sarcasm — directed at a specific claim, action, or failure — sounds like devastating accuracy.',
  },

  {
    name: 'Synoeciosis',
    category: 'Contrast & Irony',
    definition: 'Joining contraries in one statement — holding two opposite things together as if they belong.',
    examples: [
      { line: 'I am the most dangerous kind of person: someone with nothing left to lose and everything to prove' },
      { line: 'The paradox of the grind: you work to be free, and the freedom is what costs you everything' },
    ],
    elevates: 'The conjoined opposites create paradoxical richness — reality is more complicated than either term alone. Synoeciosis is honest about complexity in a way that single-pole statements can\'t be. It says: both these things are true simultaneously, and their simultaneous truth is the whole truth.',
    tip: 'The joined contraries should be genuinely both present — not manufactured for effect. When the real experience is actually contradictory (freedom and imprisonment, strength and vulnerability) the synoeciosis names the truth no single word can hold.',
  },

  {
    name: 'Tapinosis',
    category: 'Contrast & Irony',
    definition: 'Debasing language — using diminishing or low words to undercut the importance of what is described.',
    examples: [
      { line: 'Calling something great "fine." Calling someone powerful "okay." The debasement is the statement.' },
      { line: '"A minor inconvenience" for something catastrophic — the low word is the knife' },
    ],
    elevates: 'Tapinosis is understatement taken to its logical extreme — not just minimizing but actively debasing. The listener experiences the gap between the low language and the high subject as a form of commentary. It says: this thing that you\'re elevating doesn\'t deserve elevation.',
    tip: 'Tapinosis is most powerful when used ironically to debase something the target values. Calling their achievement "a nice little project," their legacy "some decent work" — the diminishing language is the argument.',
  },

  // ── EMOTION & TONE ───────────────────────────────────────────────────────────

  {
    name: 'Abominatio',
    category: 'Emotion & Tone',
    definition: 'Expressing extreme hatred or disgust — a sustained declaration of revulsion.',
    examples: [
      { line: 'I am done with the tolerance, the patience, the pretending — this is what it actually looks like under all of that' },
      { line: 'There are things I can forgive. This is not in that category.' },
    ],
    elevates: 'In hip-hop, the expression of principled disgust — especially when directed at injustice, betrayal, or hypocrisy — is one of the genre\'s founding emotional modes. When the revulsion is specific and earned, it converts personal feeling into cultural statement.',
    tip: 'The object of the abominatio must be specific. General declarations of disgust sound like rage without a target. The precise object — the specific act, the specific person, the specific system — makes the revulsion credible and just.',
  },

  {
    name: 'Apagoresis',
    category: 'Emotion & Tone',
    definition: 'A rhetorical prohibition — forbidding an action, stating what must not be done.',
    examples: [
      { line: 'Don\'t you dare claim this culture without claiming the sacrifice behind it' },
      { line: 'Don\'t reduce what I went through to a story — it\'s not a story, it\'s a life' },
    ],
    elevates: 'The prohibition creates a boundary — and the act of naming what must not be done highlights exactly what has been done. The forbidding is also a critique: the thing forbidden is what the speaker has watched happen. Apagoresis is the rhetorical fence built after the trespass.',
    tip: 'The most powerful prohibitions name what has already happened. "Don\'t take what isn\'t yours" is weak. "Don\'t take what you couldn\'t name, couldn\'t earn, couldn\'t defend" — naming the specific violation is the prohibition.',
  },

  {
    name: 'Apocarteresis',
    category: 'Emotion & Tone',
    definition: 'Expressing despair and giving up hope for improvement — the emotional register of permanent resignation.',
    examples: [
      { line: 'I\'ve stopped expecting anything different. This is what it is and I\'ve accepted that.' },
      { line: 'At some point you stop waiting for the system to fix itself — you just document what it is' },
    ],
    elevates: 'The controlled expression of despair — the acceptance that improvement isn\'t coming — is one of hip-hop\'s most honest emotional registers. It\'s different from depression because it\'s political: the speaker isn\'t broken, they\'re documenting. The resignation is clear-eyed.',
    tip: 'Apocarteresis works best when it follows effort — the speaker tried, waited, hoped, and finally stopped. The resignation earned through sustained effort is more powerful than resignation that comes too quickly.',
  },

  {
    name: 'Bdelygmia',
    category: 'Emotion & Tone',
    definition: 'A sustained expression of revulsion — extended, detailed description of what disgusts the speaker.',
    examples: [
      { line: 'Let me tell you exactly what I find disgusting about this — and I\'m going to take my time with it' },
      { line: 'The specific texture of the betrayal: how it moved, how it spoke, what it smelled like' },
    ],
    elevates: 'Sustained revulsion creates moral authority through specificity — the speaker has looked at the disgusting thing carefully enough to describe it in detail. That close examination signals that the disgust is principled, not reflexive.',
    tip: 'Bdelygmia requires the sustained attention of description to work. A quick declaration of disgust is just a reaction. The slow, detailed account of exactly what is revolting is an argument.',
  },

  {
    name: 'Characterismus',
    category: 'Emotion & Tone',
    definition: 'Description of a person\'s mental and spiritual qualities — the portrait of who someone is beneath their exterior.',
    examples: [
      { line: 'Let me tell you what kind of person he was — not what he said but what he did when no one was watching' },
      { line: 'You want to know her character? Watch her when she thinks the test is over.' },
    ],
    elevates: 'The portrait of character is more revealing than physical description — it describes the person in terms of what they choose, what they value, how they act under pressure. Character portraiture is one of hip-hop\'s most powerful modes because it carries both tribute and critique.',
    tip: 'Show the character through specific actions rather than labeling the qualities. "He was loyal" is a label. "He was the one who showed up at 3am without being asked" is characterismus.',
  },

  {
    name: 'Dehortatio',
    category: 'Emotion & Tone',
    definition: 'A dissuasion — advising strongly against a course of action.',
    examples: [
      { line: 'Don\'t go down that road. I\'m not telling you because I\'m trying to control you. I\'m telling you because I went down it.' },
      { line: 'Whatever you\'re considering — think about the cost before the price gets shown to you' },
    ],
    elevates: 'Dissuasion grounded in personal experience carries more weight than dissuasion based on principle. When the speaker has been there and survived and is specifically trying to spare someone else, the advice is testimony rather than lecture.',
    tip: 'The dissuasion must include the cost. "Don\'t do that" is advice. "Don\'t do that — here\'s what it cost me when I did it" is dehortatio. The cost is the argument.',
  },

  {
    name: 'Ecphonesis',
    category: 'Emotion & Tone',
    definition: 'An emotional exclamation — a cry of feeling that breaks through without the structure of a full sentence.',
    examples: [
      { line: 'God!' },
      { line: 'All those years—' },
    ],
    elevates: 'The raw exclamation creates emotional immediacy — the sound before the thought, the feeling before the formulation. It\'s the moment when language breaks down into pure expression. In a carefully crafted verse, a single ecphonesis is like a crack in a wall: what\'s behind it is more real than the wall.',
    tip: 'Use ecphonesis as a punctuation of release — the emotional pressure that built across many bars finally breaks through. One genuine cry in a controlled verse is more powerful than ten controlled verses.',
  },

  {
    name: 'Excitatio',
    category: 'Emotion & Tone',
    definition: 'Exciting or rousing the audience — deliberately creating enthusiasm, urgency, or motion in the listener.',
    examples: [
      { line: 'This is the moment. Right now. This is what everything was building toward.' },
      { line: 'I need you awake for this next part — don\'t let the verse do the work while you\'re coasting' },
    ],
    elevates: 'The direct address that activates the listener is a form of collective experience creation. In a live context, excitatio is the call that precedes the crowd\'s response. In recorded verse, it\'s the moment the speaker reaches through the track to shake the listener awake.',
    tip: 'Excitatio requires genuine urgency — if the speaker doesn\'t feel it, the listener won\'t. The rousing call must be attached to something that actually deserves the attention being demanded.',
  },

  {
    name: 'Exuscitatio',
    category: 'Emotion & Tone',
    definition: 'Deliberately creating pathos — writing that excites the emotions by design rather than accident.',
    examples: [
      { line: 'I write toward the feeling — not around it, not after it, directly toward it' },
      { line: 'The goal of this verse is to put you in the room where it happened — not to report what happened in the room' },
    ],
    elevates: 'The deliberate pursuit of emotional effect is what separates craft from accident. Exuscitatio is writing with the emotional target in mind — asking "what do I want the listener to feel?" and then writing toward that feeling with specific tools.',
    tip: 'Identify the precise emotion before you write — not "sadness" but the specific quality of sadness you want. The specificity of the emotional target produces the specificity of the language that achieves it.',
  },

  {
    name: 'Indignatio',
    category: 'Emotion & Tone',
    definition: 'A forceful expression of indignation — controlled outrage as the emotional climax of an argument.',
    examples: [
      { line: 'And after everything that was taken — after all of it — they want me to be grateful?' },
      { line: 'No. I will not accept this framing. I will not perform gratitude for my own survival.' },
    ],
    elevates: 'Righteous indignation is one of hip-hop\'s most politically potent emotional registers. It converts private grievance into public declaration. When the indignation is earned through specific, documented injustice, it becomes a form of testimony that demands response.',
    tip: 'The indignation should arrive after evidence, not before. The argument builds, the facts accumulate, and then the indignation is the inevitable conclusion. Indignation without evidence is just anger. Indignation after evidence is justice.',
  },

  {
    name: 'Mempsis',
    category: 'Emotion & Tone',
    definition: 'Complaining about one\'s situation and asking for help — the rhetorical mode of need, not just observation.',
    examples: [
      { line: 'I\'m not just telling you what happened — I\'m telling you because I need someone to hear it' },
      { line: 'I need someone to understand this. Not sympathize — understand.' },
    ],
    elevates: 'The willingness to ask for help is a profound act of vulnerability in hip-hop, where self-sufficiency is often performed as default. When a speaker drops the posture and simply asks to be heard or helped, the emotional impact is enormous.',
    tip: 'Be specific about what you need. "Help me" is a generality. "I need someone to acknowledge this happened, to say it was real, to not look away" — that\'s mempsis. The precise request creates intimacy.',
  },

  {
    name: 'Ominatio',
    category: 'Emotion & Tone',
    definition: 'A prediction of evil or catastrophe — declaring what bad outcome is coming before it arrives.',
    examples: [
      { line: 'I can see where this goes. I\'ve seen this pattern. I\'m telling you before it happens.' },
      { line: 'The warning signs are all there — the only question is who reads them in time' },
    ],
    elevates: 'The prophetic warning creates dramatic irony — the listener may already know whether the warning was heeded. Used in autobiography, ominatio gives the speaker the authority of hindsight; used in social commentary, it gives them the authority of pattern recognition.',
    tip: 'Ground the prediction in pattern — show why you know what\'s coming. The credibility of the prediction comes from the evidence of what you\'ve already seen. The prophecy backed by historical pattern is more convincing than the prophecy from nowhere.',
  },

  {
    name: 'Optatio',
    category: 'Emotion & Tone',
    definition: 'An exclamation of desire — wishing for something with intensity as a rhetorical emphasis.',
    examples: [
      { line: 'God, if I could go back — one hour, just one hour to do it differently' },
      { line: 'I wish this was a story I could change the ending of. I don\'t get that choice.' },
    ],
    elevates: 'The wish as rhetorical device creates an emotional gap between what is and what was desired. The listener feels the distance between the wish and the reality — and that gap is where the emotion lives. The unfulfillable wish is always more powerful than the complaint.',
    tip: 'The wish must be specific and unfulfillable. "I wish things were better" is nothing. "I wish I had said what I knew then instead of saying it for the first time to a grave" — that specificity is everything.',
  },

  {
    name: 'Paraenesis',
    category: 'Emotion & Tone',
    definition: 'Hortatory advice about future conduct — counsel given for the benefit of the person receiving it, not as a display of the speaker\'s wisdom.',
    examples: [
      { line: 'When it gets hard — and it will get hard — don\'t negotiate with the doubt. Work through it.' },
      { line: 'Save yourself the years I wasted: the shortcut isn\'t. There isn\'t one.' },
    ],
    elevates: 'The honest, experience-based piece of advice is one of hip-hop\'s most important social functions. When the advice is specific to a genuine choice and rooted in the speaker\'s actual experience, it earns its authority. Hip-hop is a culture of mentorship through verse.',
    tip: 'The advice must be actionable. "Believe in yourself" is not advice — it\'s an aspiration. "When you feel like stopping, add fifteen more minutes to whatever you were doing" is advice. Specificity makes it usable.',
  },

  {
    name: 'Paralipsis',
    category: 'Emotion & Tone',
    definition: 'Seeming to pass over something while actually drawing full attention to it — "I won\'t even bring up the fact that..."',
    examples: [
      { line: 'I won\'t even mention the shows you cancelled, the features you bailed on, the calls you didn\'t return' },
      { line: 'This isn\'t about the money — which I won\'t discuss, the specific amount, or who still has it' },
    ],
    elevates: 'The double move of paralipsis — claiming not to say while saying — creates maximum impact with apparent restraint. The listener hears everything the speaker claims to be withholding, which is precisely the effect. It signals: I have more than I\'m showing, and what I\'m "not showing" is already devastating.',
    tip: 'The things you "won\'t mention" should be as specific as possible. Vague paralipsis ("I won\'t mention everything that happened") is weak. Specific paralipsis ("I won\'t mention the exact date and time you disappeared") is devastating.',
  },

  {
    name: 'Paramythia',
    category: 'Emotion & Tone',
    definition: 'Consolation — words of comfort given to someone in grief or difficulty.',
    examples: [
      { line: 'I\'m not going to tell you it gets easier. I\'m going to tell you you get harder.' },
      { line: 'You didn\'t lose everything. What you lost showed you what you actually have.' },
    ],
    elevates: 'Genuine consolation in verse is rare and therefore valuable. It asks more of the listener — to be comforted rather than entertained — and more of the speaker, who must have the credibility that comes from having survived something similar. It creates a direct, intimate bond.',
    tip: 'Authentic consolation isn\'t false comfort. Don\'t promise that it will be okay if you don\'t know that. Find the true thing — the real thing the grieving person can hold onto — and offer only that.',
  },

  {
    name: 'Parathesis',
    category: 'Emotion & Tone',
    definition: 'Placing two things side by side for comparison without explicit comment — the juxtaposition that speaks for itself.',
    examples: [
      { line: 'A child in expensive sneakers whose lights have been off for three weeks. No comment needed.' },
      { line: 'The ceremony where they celebrated what they built on our labor. Applause.' },
    ],
    elevates: 'The juxtaposition without commentary trusts the listener. By placing two realities side by side without explanation, the speaker allows the listener to draw their own conclusion — which is always more convincing than a stated one. The silence between the two things is the argument.',
    tip: 'Choose the two things that, placed next to each other, produce the maximum emotional or intellectual impact. Then step back. Don\'t editorialize. Let the contrast speak.',
  },

  {
    name: 'Pathopoeia',
    category: 'Emotion & Tone',
    definition: 'Exciting emotion through vivid description — writing that creates feeling rather than describing it.',
    examples: [
      { line: 'I write toward the experience, not toward the emotion. When you\'re inside the scene, the feeling arrives on its own.' },
      { line: 'The goal isn\'t to say "this was devastating" — it\'s to recreate the moment so precisely that devastation is the natural response' },
    ],
    elevates: 'Pathopoeia is the principle behind all great emotional writing: don\'t name the feeling, create the conditions for the feeling. The scene, the image, the specific sensory detail — these create emotion directly. "She didn\'t come" creates feeling. "I was devastated" just reports it.',
    tip: 'Test your emotional writing by removing the feeling words. If "she didn\'t come" still makes you feel something after you remove "and I was devastated," the pathopoeia is working. If the feeling disappears without the label, you haven\'t yet built the scene.',
  },

  {
    name: 'Perclusio',
    category: 'Emotion & Tone',
    definition: 'A threat that cuts off options — warning of consequences while making clear there is no escape.',
    examples: [
      { line: 'You can run this direction or that one. I\'ve already been both places.' },
      { line: 'There\'s no version of this where you walk away clean — I\'m just letting you know that now.' },
    ],
    elevates: 'The threat that forecloses all exits is more frightening than a threat with a visible escape route. Perclusio creates inevitability — not just "this will happen" but "there is no way to prevent this." It\'s the most extreme form of the threat in hip-hop.',
    tip: 'Use perclusio when you have genuinely closed all the escape routes. If there\'s an obvious exit you\'ve overlooked, the threat is deflated immediately. The foreclosure of options must be airtight.',
  },

  {
    name: 'Proclees',
    category: 'Emotion & Tone',
    definition: 'Inciting to action — urging forward through challenge or taunt.',
    examples: [
      { line: 'If you believe in what you say, prove it. Show up. Actually do it.' },
      { line: 'I\'m challenging you — not to fight me, to match me. That\'s harder.' },
    ],
    elevates: 'The challenge that activates is a form of respect — you\'re not dismissing the audience but demanding their best. In hip-hop, the challenge to step up or prove yourself is one of the genre\'s core motivational modes. It works because the audience wants to be believed capable.',
    tip: 'The challenge should be specific enough to be actionable. "Do better" is not a challenge — it\'s a vague exhortation. "Write one more hour, record one more session, say the thing you\'ve been avoiding saying" — that\'s a challenge.',
  },

  {
    name: 'Thaumasmus',
    category: 'Emotion & Tone',
    definition: 'An expression of wonder — genuine exclamation at something remarkable or surprising.',
    examples: [
      { line: 'I still can\'t believe it happened. All of it. That it was real.' },
      { line: 'How? How is this the same person I was ten years ago? How does a life turn that way?' },
    ],
    elevates: 'Wonder in hip-hop creates a moment of spiritual pause — the speaker is stopped by something too large to contain in a prepared statement. In the midst of carefully crafted verse, genuine wonder lands like a breath of real air. It signals that something is beyond the speaker\'s full understanding.',
    tip: 'Express wonder at the specific thing that genuinely moves you. Generic wonder ("life is amazing") is nothing. Specific wonder — at a person, a turning point, a piece of luck, a survival — is everything.',
  },

  // ── WORDPLAY ─────────────────────────────────────────────────────────────────

  {
    name: 'Acyrologia',
    category: 'Wordplay',
    definition: 'Using a word incorrectly but close in sound or meaning to the right one — a near-miss word choice. In classical terms a fault; in hip-hop, a feature.',
    examples: [
      { line: '"Irregardless" — technically wrong, emotionally exact. The "wrong" word earns its place.' },
      { line: 'The near-miss word that lands harder than the right word because it carries the speaker\'s idiom with it' },
    ],
    elevates: 'What classical grammarians called error, hip-hop often calls authenticity. The word that isn\'t technically correct but is culturally exact — the word that sounds like your community, your block, your way of thinking — carries legitimacy that technically correct vocabulary cannot.',
    tip: 'The "wrong" word should be wrong in ways that reveal the speaker\'s authentic linguistic context. It works because it sounds real, not because it sounds like a mistake. The distinction between genuine dialect and careless error is the speaker\'s relationship to the word.',
  },

  {
    name: 'Adnominatio',
    category: 'Wordplay',
    definition: 'Wordplay involving similar-sounding names or words — a pun on proper nouns.',
    examples: [
      { line: 'The name in the bar that sounds like someone else\'s name — letting the listener catch it on the second listen' },
      { line: 'Built from a name and what the name means — the etymology as the argument' },
    ],
    elevates: 'Name-based wordplay in hip-hop has a long tradition — from aliases to double-meaning handles to names that are themselves arguments. The pun on a proper noun creates a secondary level of meaning that rewards the listener who catches it.',
    tip: 'The pun should work both ways — the literal name and the implied one should both create meaning. If only one reading makes sense, it\'s not adnominatio, just a name.',
  },

  {
    name: 'Ambiguitas',
    category: 'Wordplay',
    definition: 'Deliberate grammatical or syntactic ambiguity — a structure that can be parsed more than one way.',
    examples: [
      { line: '"I watched them leave" — who left whom? The syntax doesn\'t say.' },
      { line: '"I gave everything for nothing" — the "nothing" changes meaning with each listening' },
    ],
    elevates: 'Deliberate ambiguity creates re-listening. When a bar can be parsed two ways and both readings are true and meaningful, the listener discovers something new on each pass. The ambiguity isn\'t evasion — it\'s a formal expansion of the verse\'s semantic content.',
    tip: 'Both readings must be supported by the surrounding context. Random ambiguity just confuses. Meaningful ambiguity — where both possible meanings are true and revealing — is the goal.',
  },

  {
    name: 'Cacemphaton',
    category: 'Wordplay',
    definition: 'A phrase with an unintentional or deliberate obscene double meaning — the unsaid second meaning that creates knowing laughter.',
    examples: [
      { line: 'The line that sounds clean but carries something else underneath for those paying attention' },
      { line: 'The bar that makes the room react differently depending on who\'s in it' },
    ],
    elevates: 'Deliberate double-meaning works at multiple audience levels simultaneously — those who catch the secondary reading feel in on a secret; those who don\'t hear a clean verse. The layering creates different experiences of the same line without excluding anyone.',
    tip: 'The double meaning must be deliberate and controlled. Accidental cacemphaton is just an embarrassing accident. Intentional cacemphaton is craft — you built both meanings, you\'re responsible for both, and both serve the verse.',
  },

  {
    name: 'Catachresis',
    category: 'Wordplay',
    definition: 'Misuse or extreme extension of a word beyond its normal meaning — a creative or forced metaphor that applies a word where it technically doesn\'t belong.',
    examples: [
      { line: '"The leg of the table" — technically, tables don\'t have legs. The creative extension works.' },
      { line: 'Using a word beyond its approved range: "the mouth of the river," "the face of the cliff"' },
    ],
    elevates: 'Catachresis is creative trespass — using a word where it wasn\'t supposed to go. In hip-hop, verbal creativity often involves extending words into territories their definitions don\'t officially cover. That extension creates new meaning through metaphorical force rather than dictionary permission.',
    tip: 'The extended or misused word should land in its new context as if it belongs there. The best catachresis feels inevitable despite being technically wrong. The word should feel like it was always waiting to be used this way.',
  },

  {
    name: 'Diaphora',
    category: 'Wordplay',
    definition: 'Using the same word in two different senses in close proximity — the word slides between meanings within a single line or pair of lines.',
    examples: [
      { line: '"Free to be free" — liberation as condition, liberation as practice, two different freedoms' },
      { line: '"I moved: changed position, changed city, changed inside"' },
    ],
    elevates: 'The double deployment of a single word creates a pivot — the word first means one thing, then another, and the pivot reveals the relationship between the two meanings. The listener experiences both senses simultaneously, which creates linguistic richness.',
    tip: 'The two meanings should both be important and genuinely different. If the second meaning is just a shade of the first, the effect is muted. The greater the semantic distance between the two uses, the more powerful the diaphora.',
  },

  {
    name: 'Enigma',
    category: 'Wordplay',
    definition: 'A deliberate riddle — obscure language that requires decoding. The verse that demands work from the listener.',
    examples: [
      { line: 'Writing a verse where every line makes sense in two registers simultaneously — the surface and the meaning beneath it' },
      { line: 'The bar that sounds simple until the third listening, when everything clicks into place' },
    ],
    elevates: 'The riddle rewards engagement — the listener who works to decode the enigma feels rewarded by the discovery. This is the foundation of re-listen culture: the verse that gives more on each hearing because it was deliberately layered with meaning that takes time to reach.',
    tip: 'The enigma must have a real answer — obscurity for its own sake is not enigma, it\'s opacity. The riddle must be solvable, and the solution must be worth the effort of solving it.',
  },

  {
    name: 'Metalepsis',
    category: 'Wordplay',
    definition: 'Using a word in a figurative sense that connects back to its original, literal sense through a chain of associations.',
    examples: [
      { line: '"Root" meaning both origin and the thing plants need to survive — the metaphor leads back to the literal' },
      { line: '"Buried" — planted underground, hidden, exhausted, and dead; the figurative carries the literal and vice versa' },
    ],
    elevates: 'Metalepsis creates multi-generational meaning — the figurative use activates the literal, and the literal enriches the figurative. Words like "root," "buried," "planted," and "rise" carry metaleptic richness because they\'re simultaneously figurative and literally precise.',
    tip: 'Find words whose literal origins enrich their figurative uses. "Grounded" literally means connected to the earth; figuratively it means stable and humble. Using it allows both meanings to be active simultaneously, each reinforcing the other.',
  },

  {
    name: 'Metallage',
    category: 'Wordplay',
    definition: 'Using a word as if it were a different part of speech — turning a noun into a verb, an adjective into a noun, creating a functional shift.',
    examples: [
      { line: '"Gifted" as a verb: "they gifted me struggle, I gifted them art"' },
      { line: '"I am the quiet" — turning the adjective into a noun, a state into an identity' },
    ],
    elevates: 'Part-of-speech shifting is one of the most creative forms of verbal play — it forces a word into a grammatical position it wasn\'t designed for, which creates a slight resistance, like turning a key in a lock that doesn\'t quite fit. That resistance is audible and memorable.',
    tip: 'The shifted word should be placed in a position where its original part of speech and its new one both carry meaning. "I am the quiet" works because the noun use of "quiet" makes the state of being quiet into an identity, not just a quality.',
  },

  {
    name: 'Noema',
    category: 'Wordplay',
    definition: 'A statement requiring thought to understand — deliberately layered language where the surface conceals the real meaning.',
    examples: [
      { line: 'The bar that takes three seconds after the beat passes to land' },
      { line: 'Writing for delayed recognition — the bar makes sense immediately, then makes different sense on reflection' },
    ],
    elevates: 'Delayed comprehension is one of the most powerful effects in verse — the line that makes the listener stop, rewind, and say "wait." The noema creates a small internal delay that proves the meaning was earned, not just received. That delay is the signature of dense, layered writing.',
    tip: 'Build the noema by layering multiple meanings that are compatible on the surface but reveal complexity on examination. The listener should be able to enjoy the surface meaning and discover the deeper meaning without contradiction.',
  },

  {
    name: 'Paregmenon',
    category: 'Wordplay',
    definition: 'Using words derived from the same root in close proximity — creating etymological echo.',
    examples: [
      { line: '"Build the building on what I built" — the root "build" in three different grammatical forms' },
      { line: '"The art of the artist is the artifact" — one root generating three related words' },
    ],
    elevates: 'Root-based repetition creates a sonic density that is also etymologically honest — the words actually belong together because they share origin. It creates the effect of exhaustive exploration of a single concept through all its linguistic descendants.',
    tip: 'Use paregmenon when the root is itself meaningful and the various derivations illuminate different aspects of it. "Build/builder/building/built" all mean related things; using several in close proximity explores the concept from multiple angles simultaneously.',
  },

  {
    name: 'Prosonomasia',
    category: 'Wordplay',
    definition: 'A name that reflects or puns on the person\'s character or deeds — the name that is itself an argument.',
    examples: [
      { line: 'The rapper whose chosen name is a description of what they do — the name is the mission statement' },
      { line: 'The street name that carries everything the person is about in two syllables' },
    ],
    elevates: 'In hip-hop, the chosen name (the alias, the MC name, the street name) is prosonomasia — a self-naming that reflects or defines the speaker\'s character or ambitions. The name is the first bar. It tells you something before the verse begins.',
    tip: 'When writing about named people, find the name that carries their story. The most memorable names in hip-hop are prosonomastic — they describe, they allude, they contain the person\'s whole arc in a word or phrase.',
  },

  {
    name: 'Schematismus',
    category: 'Wordplay',
    definition: 'Veiled or allusive speech — saying one thing while meaning another through coded language.',
    examples: [
      { line: 'Speaking about one person in language that everyone present knows is about someone else' },
      { line: 'The verse that doesn\'t name names but doesn\'t need to — context does the work' },
    ],
    elevates: 'Schematismus is the rhetorical foundation of the subliminal diss — the bar that says everything without saying anything that can be held against you. The veiled speech carries all the weight of the direct statement while maintaining plausible deniability.',
    tip: 'The veil must be thin enough for the intended audience to see through while thick enough for other audiences to miss. Perfect schematismus is unmistakable to those in the know and invisible to those who aren\'t.',
  },

  {
    name: 'Skotison',
    category: 'Wordplay',
    definition: 'Deliberately obscure language — making things unclear on purpose, for effect or protection.',
    examples: [
      { line: 'The coded language of communities that needed to communicate without being understood by authorities' },
      { line: 'Verse that requires insider knowledge to decode — the language is the wall' },
    ],
    elevates: 'Deliberate obscurity creates two audiences: those who understand and those who don\'t. The in-group feels recognized; the out-group hears music without receiving the full message. In hip-hop, coded language has historical roots in cultural protection and continues as a form of community intimacy.',
    tip: 'Deliberate obscurity must have a real audience — people who actually have the code. Writing obscurely with no one holding the key isn\'t schematismus or skotison, it\'s just opacity. The code must be shareable.',
  },

  {
    name: 'Solecismus',
    category: 'Wordplay',
    definition: 'A deliberate grammatical "error" used for rhetorical or stylistic effect — breaking the rule with full knowledge of it.',
    examples: [
      { line: '"Ain\'t no way" — technically a double negative, practically the most emphatic negation available' },
      { line: '"We was out there" — the dialect form carries social and cultural information the grammatically "correct" form erases' },
    ],
    elevates: 'In hip-hop, breaking grammatical rules is often the point. The deliberate solecismus signals authenticity, cultural belonging, and refusal to submit to the standards of "correct" language that have historically been used to exclude certain communities. The rule-breaking is itself a statement.',
    tip: 'The grammatical "error" should be deliberate and consistent. Random grammatical inconsistency reads as accident. Consistent use of a specific non-standard form reads as stylistic choice and cultural identity.',
  },

  {
    name: 'Agnominatio',
    category: 'Wordplay',
    definition: 'Wordplay on similar-sounding names or words — punning between near-homophones or words with similar sounds.',
    examples: [
      { line: 'The line where two similar-sounding words collide and both meanings are active' },
      { line: '"Raise / raze / rays" — three words, three meanings, one phonetic family deployed simultaneously' },
    ],
    elevates: 'Phonetic wordplay creates a kind of sonic double vision — the listener hears one word but their brain registers multiple. When both or all phonetic resonances are activated, the line achieves a density that rewards close listening.',
    tip: 'Use the full phonetic family — write down every word that sounds like your target word and find the ones whose meanings serve the bar. The best agnominatio uses the phonetic similarity to put two meanings that have something to say to each other into collision.',
  },
];
