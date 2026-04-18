import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PROMPTS = [
  // Flow & Rhythm
  "Where am I fighting the pocket instead of riding it?",
  "My cadence feels stiff. What's breaking the natural flow?",
  "Which bars am I rushing and why does it throw off the pocket?",
  "Show me where I'm landing on the beat when I should be falling behind it.",
  "I keep losing the syncopation after bar 4. What's happening?",
  "Where am I forcing syllables that should be gliding?",
  "My breath control is killing the delivery. Where should I be phrasing?",
  "Which lines need more space and which ones need to be tighter?",
  "I'm on beat the whole verse but something still feels robotic.",
  "Find where my rhythm is predictable and point me to it.",
  "Why does my flow sound rushed even when the syllable count is right?",
  "Where am I accenting the wrong syllable in this bar?",
  "Show me every place I'm landing flat when the beat wants a push.",
  "My off-beat moments feel accidental. Help me make them intentional.",
  "I want to ride the hi-hats differently in the second half. Show me where.",
  "My phrasing feels choppy. Where am I cutting lines too short?",
  "The pocket shifts at bar 6 and I lose it. What changes?",
  "Where am I letting the beat breathe when I should be filling it?",
  "I want more syncopation without losing clarity. Where's the balance?",
  "My delivery feels like I'm reading, not rapping. Where does it break?",

  // Rhyme Craft
  "Find every internal rhyme hiding in these bars.",
  "I want denser rhymes without it sounding forced. Where's room to add?",
  "Which end rhymes am I leaning on too hard?",
  "Show me where I'm using slant rhymes and if they're landing right.",
  "My multisyllabic rhymes feel clunky. Which ones aren't working?",
  "Find the compound rhyme chains I might be missing.",
  "I need a rhyme scheme that doesn't feel predictable by bar 2.",
  "Where am I rhyming the obvious word when a better one exists?",
  "My rhyme density drops in the third bar every verse. Why?",
  "Show me where internal rhymes could reinforce the end rhyme.",
  "I want to cross-rhyme across 4 bars. Show me where the setup is.",
  "Which of my slant rhymes are too loose to land?",
  "Find every place I'm sacrificing meaning just to land a rhyme.",
  "Show me multisyllabic options for this line I'm stuck on.",
  "My AABB scheme is boring me. What variations work with this cadence?",
  "I want the rhyme to land on an unexpected syllable. Show me how.",
  "Where am I letting the rhyme scheme force an unnatural phrase?",
  "Find rhymes in these bars that feel earned, not easy.",
  "My rhyme density is uneven across the verse. Where does it thin out?",
  "I want internal rhymes in every other bar. Is there room for that?",

  // Literary Devices
  "Am I using anaphora anywhere and is it landing the way I think?",
  "I want epistrophe in this hook. Show me where it fits.",
  "Find every place I'm using hyperbole and whether it's too much.",
  "Where could antithesis make this verse hit harder?",
  "Show me the alliteration I have and what it's doing to the sound.",
  "I want assonance to carry the melody in this verse. Where's the room?",
  "Find every simile here and tell me which ones are too obvious.",
  "I'm leaning on personification in this bridge. Is it too heavy?",
  "Show me where my extended metaphor breaks down.",
  "I want consonance to create friction in this line. Where does it fit?",
  "My metaphor changes halfway through the verse without me realizing.",
  "Find every place I'm using synecdoche and whether it's clear.",
  "I want a paradox in the hook that makes people replay it.",
  "Show me where oxymoron could make this line more memorable.",
  "I'm using litotes here but it might be too subtle. Is it landing?",
  "Find the symbolism in this verse and tell me if it's consistent.",
  "Where could zeugma add wit to this bar without losing clarity?",
  "I want polysyndeton to slow down this passage. Is this the right place?",
  "Show me where asyndeton would speed up the delivery.",
  "My chiasmus attempt feels forced. Is the structure right?",
  "Find every metonymy I'm using and whether the reference is clear.",
  "I want the metaphor to do more work without adding syllables.",
  "Where am I being literal when a figure of speech would land harder?",

  // Structure
  "My hook isn't sticking after the first verse. What's wrong with it?",
  "I want an 8-bar resolution but it feels unfinished at bar 6.",
  "Show me where my verse structure breaks from the 4-bar phrase.",
  "My bridge isn't creating contrast. What's making it feel like another verse?",
  "The bars feel bloated. Where am I using two words when one works?",
  "I want bar economy but every cut feels like I'm losing something.",
  "My hook lands emotionally but not sonically. What's missing?",
  "Show me where my verse is setting up the hook and where it's fighting it.",
  "I'm losing the 4-bar phrase container halfway through every verse.",
  "My outro feels like a copy of the hook. How do I make it feel like a close?",
  "Find where I'm wasting bars on setup that could be compressed.",
  "My second verse isn't escalating from the first. Where does it stall?",
  "I want the hook to feel inevitable after the verse. Is there a setup problem?",
  "Show me where my phrase containers are inconsistent across the verse.",
  "My 8-bar intro is too long. Where's the right cut?",
  "I want the bridge to shift the emotional key of the song. Is this doing that?",
  "My verses are too dense and the hook feels thin. How do I balance it?",
  "Show me where I'm resolving tension too early in the bar.",
  "I want each 4-bar section to feel complete but connected. Does this?",
  "My structure is technically right but the song feels shapeless.",

  // Writing Process
  "I've rewritten this bar 12 times and it keeps getting worse.",
  "I know what I want to say but the words feel like a translation.",
  "I'm blocked on the second verse. The concept feels too small now.",
  "How do I know when a verse is done and I'm just second-guessing?",
  "I started with a strong concept and lost it somewhere in the writing.",
  "My first draft was raw and honest. The rewrite sounds polished but fake.",
  "I need to trim this verse but every line feels necessary.",
  "The metaphor I built the whole song around isn't working anymore.",
  "I wrote this in 20 minutes and it's better than my careful drafts. Why?",
  "Help me reconnect with what I was actually trying to say in this.",
  "I keep editing the same three lines and avoiding the rest of the verse.",
  "The concept is strong but my execution feels beneath it.",
  "I think I'm overwriting this. Where am I saying too much?",
  "My authentic voice is in the first draft but the craft isn't there yet.",
  "I wrote myself into a corner with this metaphor. How do I get out?",
  "The idea was exciting when I started. Now I'm not sure it's enough.",
  "Help me figure out if this needs a rewrite or just an edit.",
  "I can't tell if I'm being vulnerable or just vague in this verse.",
  "I've been staring at this bar for an hour. What am I not seeing?",
  "My process breaks down when I move from concept to actual bars.",
  "This verse is good but it doesn't sound like me. Where did I lose myself?",
  "I need to know if this concept has enough depth for a full song.",
  "Help me find what this song is actually about underneath what I wrote.",

  // Self-Challenge
  "Give me an exercise to write tighter without losing complexity.",
  "I always resolve my metaphors too cleanly. How do I sit with ambiguity?",
  "I've never tried internal rhymes in every bar. Walk me through it.",
  "Show me what a version of this looks like with no filler words.",
  "I want to study a technique I'm avoiding because I'm not good at it yet.",
  "My weakness is the hook. What's an exercise to get better at it?",
  "I always write the same type of verse. How do I break that pattern?",
  "Give me a constraint that will force me to find a better line here.",
  "I want to write a bar that only works because of the sound, not the meaning.",
  "Challenge me to rewrite this with half the syllables and double the impact.",
  "I want to try asyndeton for pace but I've never done it intentionally.",
  "What's a drill for getting better at landing multisyllabic rhymes naturally?",
  "I need an exercise for writing without my usual metaphor crutches.",
  "Show me what this verse looks like if I cut every line that explains itself.",
  "I want to write something that only works in the pocket. Help me practice.",
  "Give me a structural exercise using only 4-bar phrases with hard turns.",
  "I need to push past my comfort zone with rhyme scheme. Where do I start?",
  "What's an exercise for writing a hook before I write the verse?",
  "I want to practice writing with no end rhymes and see what happens.",
  "Show me what's weak in my craft that I'm probably not noticing.",

  // More Flow
  "I'm biting someone's cadence without realizing it. Is it showing here?",
  "My flow pattern is the same across every song I've written this year.",
  "Where am I riding the snare when the lyric wants to sit on the kick?",
  "I want this bar to feel like it's leaning forward. What changes?",
  "My breath is visible in the recording. Where should I be pausing?",
  "Show me where I'm working too hard against the beat to sound interesting.",

  // More Rhyme
  "I want a rhyme family to run through all 16 bars quietly.",
  "My ABAB scheme is readable on paper but feels wrong on the beat.",
  "Find the rhyme that sounds forced and show me a replacement path.",
  "I want internal rhymes on syllables 3 and 7 of each bar. Is there room?",
  "Show me where my rhyme scheme breaks and whether that's intentional.",
  "I'm rhyming the same vowel sounds all verse. Is that a problem or a tool?",

  // More Literary
  "I want one extended metaphor to run the whole verse without being obvious.",
  "Find every cliche I'm using and show me where I can deepen it.",
  "I want this hook to use anaphora but sound natural, not preachy.",
  "Show me where the imagery is specific and where it's generic.",
  "My symbolism is too on-the-nose. Where do I need to trust the listener?",
  "I want the last line to recontextualize everything before it.",

  // More Structure
  "I want the verse to feel like it's building but it just feels like more.",
  "My pre-hook is doing the same job as the hook. How do I fix that?",
  "Show me where this verse is marking time instead of moving forward.",
  "I want a cold open with no intro bar. Does this verse support that?",
  "My song structure is verse-hook-verse-hook. How do I make it feel less flat?",

  // More Process
  "I know this isn't my best but I don't know what's wrong with it.",
  "Help me figure out if I'm writing around the real idea or through it.",
  "I lose momentum every time I try to make the verse more personal.",
  "The version in my head is better than anything I'm writing down.",
  "I want to know if this song is about what I think it's about.",
];

const TYPING_SPEED  = 38;   // ms per character
const DELETE_SPEED  = 18;   // ms per character
const PAUSE_FULL    = 2200; // ms to hold completed prompt
const PAUSE_EMPTY   = 500;  // ms before starting next prompt

export default function NewChatPage() {
  const [input, setInput]           = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [isTyping, setIsTyping]     = useState(false); // user is typing
  const navigate  = useNavigate();
  const taRef     = useRef(null);
  const shuffledPrompts = useRef(null);
  if (!shuffledPrompts.current) {
    const arr = [...PROMPTS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffledPrompts.current = arr;
  }
  const promptIdx = useRef(0);
  const charIdx   = useRef(0);
  const rafRef    = useRef(null);
  const phaseRef  = useRef('typing'); // 'typing' | 'pausing' | 'deleting' | 'waiting'
  const lastRef   = useRef(0);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 260) + 'px';
  }, [input]);

  // Typewriter loop — only runs when user hasn't typed anything
  const tick = useCallback((now) => {
    if (isTyping) return;

    const prompt   = shuffledPrompts.current[promptIdx.current];
    const elapsed  = now - lastRef.current;
    let   delay    = TYPING_SPEED;

    if (phaseRef.current === 'typing') {
      if (elapsed < delay) { rafRef.current = requestAnimationFrame(tick); return; }
      charIdx.current += 1;
      setPlaceholder(prompt.slice(0, charIdx.current));
      lastRef.current = now;
      if (charIdx.current >= prompt.length) {
        phaseRef.current = 'pausing';
        lastRef.current  = now;
      }

    } else if (phaseRef.current === 'pausing') {
      if (elapsed < PAUSE_FULL) { rafRef.current = requestAnimationFrame(tick); return; }
      phaseRef.current = 'deleting';
      lastRef.current  = now;

    } else if (phaseRef.current === 'deleting') {
      if (elapsed < DELETE_SPEED) { rafRef.current = requestAnimationFrame(tick); return; }
      charIdx.current = Math.max(0, charIdx.current - 1);
      setPlaceholder(prompt.slice(0, charIdx.current));
      lastRef.current = now;
      if (charIdx.current === 0) {
        phaseRef.current = 'waiting';
        lastRef.current  = now;
        const nextIdx = promptIdx.current + 1;
        if (nextIdx >= shuffledPrompts.current.length) {
          // reshuffle for next cycle
          const arr = [...PROMPTS];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          shuffledPrompts.current = arr;
          promptIdx.current = 0;
        } else {
          promptIdx.current = nextIdx;
        }
      }

    } else if (phaseRef.current === 'waiting') {
      if (elapsed < PAUSE_EMPTY) { rafRef.current = requestAnimationFrame(tick); return; }
      phaseRef.current = 'typing';
      lastRef.current  = now;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [isTyping]);

  useEffect(() => {
    if (!isTyping) {
      lastRef.current = performance.now();
      rafRef.current  = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isTyping, tick]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setIsTyping(val.length > 0);
    if (val.length === 0) {
      // restart typewriter
      phaseRef.current  = 'waiting';
      charIdx.current   = 0;
      setPlaceholder('');
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    navigate('/chat/new', { state: { initialMessage: input.trim() } });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px 80px',
    }}>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: -18 }}
      >
        <div style={{
          width: 140, height: 140,
          backgroundImage: 'url(/logo.png)',
          backgroundSize: '185%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 700,
          color: '#F5C518',
          letterSpacing: '0.01em',
          textAlign: 'center',
          lineHeight: 1.05,
          marginBottom: 20,
        }}
      >
        <span style={{
          background: 'linear-gradient(180deg, #FFE566 0%, #F5C518 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block',
        }}>
          Prosodic
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 16, fontWeight: 300,
          color: '#EDEDEC',
          textAlign: 'center',
          marginBottom: 48,
          maxWidth: 480,
        }}
      >
        For the artist who isn't done growing. VEIL is listening.
      </motion.p>

      {/* Input box */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 760, position: 'relative' }}
      >
        {/* Gradient border wrapper — from template */}
        <div style={{
          borderRadius: 20, padding: 2,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05), rgba(0,0,0,0.2))',
        }}>
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          background: 'rgba(15,15,20,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ position: 'relative' }}>
            {/* Animated placeholder — only visible when user hasn't typed */}
            {!isTyping && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                padding: '22px 68px 0 24px',
                fontFamily: 'DM Sans, sans-serif', fontSize: 16,
                color: '#EDEDEC', lineHeight: 1.65,
                pointerEvents: 'none', userSelect: 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {placeholder}
                {/* Blinking cursor */}
                <span style={{
                  display: 'inline-block', width: 2, height: '1.1em',
                  background: '#F5C518', marginLeft: 1, verticalAlign: 'text-bottom',
                  animation: 'blink 1s step-end infinite',
                }} />
              </div>
            )}

            <textarea
              ref={taRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={4}
              style={{
                width: '100%', background: 'transparent',
                border: 'none', outline: 'none', resize: 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: 16,
                color: '#EDEDEC', caretColor: '#F5C518',
                lineHeight: 1.65,
                padding: '22px 68px 22px 24px',
                minHeight: 130,
                boxSizing: 'border-box',
                // Hide browser placeholder; we render our own
                position: 'relative', zIndex: 1,
              }}
            />
          </div>

          {/* Send button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 16px' }}>
            <motion.button
              onClick={handleSend}
              disabled={!input.trim()}
              whileHover={input.trim() ? { scale: 1.06 } : {}}
              whileTap={input.trim() ? { scale: 0.94 } : {}}
              style={{
                width: 44, height: 44, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim()
                  ? 'linear-gradient(135deg, #F5C518, #c49a10)'
                  : 'rgba(255,255,255,0.07)',
                boxShadow: input.trim() ? '0 0 20px rgba(245,197,24,0.35)' : 'none',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                transition: 'background 200ms, box-shadow 200ms',
              }}
            >
              <ArrowUpRight size={19} color={input.trim() ? '#000' : '#9B9B9B'} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
        </div>{/* gradient border */}
      </motion.div>

      {/* Blink keyframe */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
