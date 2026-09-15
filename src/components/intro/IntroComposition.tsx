import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { PROSODIC_TEXT_BASE64, PROSODIC_YELLOW_BARS_BASE64 } from './logoBase64';

/**
 * IntroComposition.tsx
 *
 * Ultra-Fluid, Heroic-Scale Motion Intro for Prosodic.
 * 60 FPS Bouncy Physics & Exact Brand Identity on Clean White Canvas (#FFFFFF).
 *
 * Narrative Flow:
 * Phase 1 (Frames 0 - 150): The Heroic Cadence Grid (90 BPM)
 *   - Pure, immaculate white studio canvas (#FFFFFF)
 *   - 3 dashed musical cadence guidelines with crisp metric lines
 *   - Top lane: Large yellow phrase blocks bouncing up on the beat
 *   - Middle lane: 8 large cyan pulse nodes popping dynamically with expanding ripple rings
 *   - Bottom lane: Deep blue percussion blocks punching with 16th-note double kicks
 *   - Paced, musical scanning playhead
 *
 * Phase 2 (Frames 140 - 185): Harmonic Energy Convergence
 *   - Rhythmic elements collapse and whip gracefully toward center
 *   - Yellow phrase blocks rotate and fuse into vertical alignment
 *   - Center ambient sunlight bloom
 *
 * Phase 3 (Frames 175 - 325): The Prosodic Logo Slam & Elastic Bounce
 *   - Heroic-scale signature yellow bars drop from above with heavy gravity and double-bounce
 *   - Squash & stretch impact physics
 *   - Authentic wordmark "Prosodic" (from exact uploaded reference) springs up right beneath
 *   - Absolutely NO extra words or subtitles
 *   - Golden light sheen sweeps across the brand lockup
 *
 * Phase 4 (Frames 330 - 360): Seamless App Dissolve
 *   - Smooth exit transition flowing directly into the Forensic Dissection Lab
 */

export const IntroComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---------------------------------------------------------------------------
  // Phase 1: Dynamic Cadence Grid (Frames 0 - 155)
  // ---------------------------------------------------------------------------
  const gridOpacity = interpolate(frame, [0, 24, 140, 165], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Relaxed, groove-locked 90 BPM playhead (loops every 40 frames at 60 FPS)
  const loopFrames = 40;
  const playheadProgress = (frame % loopFrames) / loopFrames;
  const playheadX = playheadProgress * 100;

  // ---------------------------------------------------------------------------
  // Phase 2: Fluid Convergence (Frames 140 - 185)
  // ---------------------------------------------------------------------------
  const convergence = spring({
    frame: frame - 140,
    fps,
    config: { damping: 11, stiffness: 95, mass: 0.8 },
  });

  const flashOpacity = interpolate(frame, [168, 175, 190], [0, 0.35, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ---------------------------------------------------------------------------
  // Phase 3: The Yellow Bars Drop & Heavy Bounce (Frames 175 - 325)
  // ---------------------------------------------------------------------------
  const barsDropSpring = spring({
    frame: frame - 175,
    fps,
    config: { damping: 8, stiffness: 110, mass: 0.65 },
  });

  const barsY = interpolate(barsDropSpring, [0, 1], [-160, 0]);
  const barsOpacity = interpolate(frame, [175, 186], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Squash & Stretch on impact (around frame 190 - 225)
  const squashX = interpolate(frame, [190, 196, 208, 225], [1.0, 1.18, 0.94, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const squashY = interpolate(frame, [190, 196, 208, 225], [1.0, 0.85, 1.08, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Prosodic wordmark spring pop (emerges at frame 200)
  const wordmarkSpring = spring({
    frame: frame - 200,
    fps,
    config: { damping: 9, stiffness: 125, mass: 0.6 },
  });

  const wordmarkOpacity = interpolate(frame, [200, 215], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wordmarkY = interpolate(wordmarkSpring, [0, 1], [36, 0]);

  // Golden diagonal light sheen (frames 235 - 280)
  const sheenProgress = interpolate(frame, [235, 280], [-120, 220], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ---------------------------------------------------------------------------
  // Phase 4: Smooth App Exit (Frames 330 - 360)
  // ---------------------------------------------------------------------------
  const exitOpacity = interpolate(frame, [330, 360], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitScale = interpolate(frame, [330, 360], [1, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 8 Cyan beat subdivisions (1 & 2 & 3 & 4 &)
  const cyanNodes = [0, 1, 2, 3, 4, 5, 6, 7];

  // Blue percussion blocks (1 block, 2 blocks, 1 block, 2 blocks)
  const blueBlocks = [
    { beat: 0, count: 1 },
    { beat: 2, count: 2 },
    { beat: 4, count: 1 },
    { beat: 6, count: 2 },
  ];

  // Yellow phrase blocks along top (heroic large dimensions)
  const yellowTopBars = [
    { startBeat: 0.15, width: 48 },
    { startBeat: 2.1, width: 86 },
    { startBeat: 4.25, width: 86 },
    { startBeat: 6.35, width: 86 },
  ];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      {/* Soft warm golden ambient radial glow on pure white */}
      <div
        style={{
          position: 'absolute',
          width: '680px',
          height: '680px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(254, 240, 138, 0.32) 0%, rgba(255, 255, 255, 0) 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Central kinetic convergence flash */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: '#FEF08A',
          opacity: flashOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* -------------------------------------------------------------------- */}
      {/* SCENE 1 & 2: THE HEROIC CADENCE GRID (White Canvas, Crisp UI)        */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          width: '94%',
          maxWidth: '680px',
          height: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: gridOpacity,
          transform: `scale(${1 - convergence * 0.2}) translateY(${convergence * -32}px)`,
        }}
      >
        {/* 3 Dashed Measurement Guidelines with Interstitial Lanes */}
        <div
          style={{
            width: '100%',
            position: 'relative',
            height: '180px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top Dashed Line */}
          <div
            style={{
              width: '100%',
              height: '1px',
              borderTop: '2px dashed #CBD5E1',
            }}
          />

          {/* Middle Dashed Line */}
          <div
            style={{
              width: '100%',
              height: '1px',
              borderTop: '2px dashed #CBD5E1',
            }}
          />

          {/* Bottom Dashed Line */}
          <div
            style={{
              width: '100%',
              height: '1px',
              borderTop: '2px dashed #CBD5E1',
            }}
          />

          {/* TOP LANE: Yellow Phrase Blocks (Large & Bouncing Up on Hit) */}
          <div
            style={{
              position: 'absolute',
              top: '-32px',
              left: '4%',
              right: '4%',
              height: '30px',
            }}
          >
            {yellowTopBars.map((bar, i) => {
              const barLeftPct = (bar.startBeat / 7.5) * 100;
              const dist = Math.abs(playheadX - barLeftPct);
              const isHit = dist < 14;
              const hitPower = isHit ? Math.max(0, 1 - dist / 14) : 0;
              const bounceY = hitPower * -14;
              const bounceScale = 1.0 + hitPower * 0.22;

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${barLeftPct}%`,
                    width: `${bar.width}px`,
                    height: '26px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #FDE047 0%, #EAB308 100%)',
                    boxShadow: isHit
                      ? '0 0 28px rgba(234, 179, 8, 0.85), 0 0 10px rgba(253, 224, 71, 0.9)'
                      : '0 3px 8px rgba(0, 0, 0, 0.08)',
                    transform: `translateY(${bounceY}px) scaleY(${bounceScale})`,
                    transformOrigin: 'bottom',
                    transition: 'transform 0.06s ease-out',
                  }}
                />
              );
            })}
          </div>

          {/* MIDDLE LANE: 8 Large Cyan Pulse Nodes with Shockwave Rings */}
          <div
            style={{
              position: 'absolute',
              top: '72px',
              left: '4%',
              right: '4%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {cyanNodes.map((beatIdx) => {
              const nodePct = (beatIdx / 7) * 100;
              const dist = Math.abs(playheadX - nodePct);
              const isHit = dist < 11;
              const hitPower = isHit ? Math.max(0, 1 - dist / 11) : 0;
              const nodeScale = 1.0 + hitPower * 0.55;

              return (
                <div
                  key={beatIdx}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Expanding Cyan Ripple Shockwave */}
                  {isHit && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        border: '2px solid rgba(6, 182, 212, 0.75)',
                        transform: `scale(${1 + hitPower * 0.9})`,
                        opacity: 1 - hitPower * 0.4,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Core Cyan Pulse Circle */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#06B6D4',
                      boxShadow: isHit
                        ? '0 0 26px rgba(6, 182, 212, 0.95), 0 0 45px rgba(6, 182, 212, 0.5)'
                        : '0 2px 6px rgba(0, 0, 0, 0.1)',
                      transform: `scale(${nodeScale})`,
                      transition: 'transform 0.06s ease-out',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* BOTTOM LANE: Blue Percussion Punch Blocks (Large & Bouncy) */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '4%',
              right: '4%',
              height: '46px',
            }}
          >
            {blueBlocks.map((blk, i) => {
              const blkPct = (blk.beat / 7) * 100;
              const dist = Math.abs(playheadX - blkPct);
              const isHit = dist < 12;
              const hitPower = isHit ? Math.max(0, 1 - dist / 12) : 0;
              const punchY = hitPower * -12;
              const punchScale = 1.0 + hitPower * 0.3;

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${blkPct}%`,
                    display: 'flex',
                    gap: '6px',
                  }}
                >
                  {Array.from({ length: blk.count }).map((_, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        width: '22px',
                        height: '42px',
                        borderRadius: '4px',
                        background: 'linear-gradient(180deg, #38BDF8 0%, #2563EB 100%)',
                        boxShadow: isHit
                          ? '0 0 24px rgba(37, 99, 235, 0.85), 0 0 10px rgba(56, 189, 248, 0.8)'
                          : '0 2px 5px rgba(0, 0, 0, 0.08)',
                        transform: `translateY(${punchY}px) scaleY(${punchScale})`,
                        transformOrigin: 'bottom',
                        transition: 'transform 0.06s ease-out',
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Scanning Playhead Laser */}
          <div
            style={{
              position: 'absolute',
              top: '-38px',
              bottom: '-14px',
              left: `calc(4% + ${playheadX * 0.92}%)`,
              width: '3px',
              background: 'linear-gradient(180deg, transparent 0%, #06B6D4 25%, #3B82F6 75%, transparent 100%)',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.9), 0 0 28px rgba(59, 130, 246, 0.6)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SCENE 3: HEROIC PROSODIC BRAND LOCKUP (Large, Bouncy, Authentic)     */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: barsOpacity,
          transform: `translateY(${barsY}px) scaleX(${squashX}) scaleY(${squashY})`,
        }}
      >
        {/* Large Signature Yellow Bars Logo */}
        <div
          style={{
            position: 'relative',
            width: '165px',
            height: '285px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            filter: 'drop-shadow(0 18px 36px rgba(202, 138, 4, 0.38))',
            overflow: 'hidden',
          }}
        >
          <img
            src={PROSODIC_YELLOW_BARS_BASE64}
            alt="Prosodic Yellow Bars"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />

          {/* Golden Light Sheen Flare across Bars */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: `${sheenProgress}%`,
              width: '50px',
              height: '200%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)',
              transform: 'rotate(25deg)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* The Exact Brand Wordmark "Prosodic" (Cutout from Uploaded Reference) */}
        <div
          style={{
            position: 'relative',
            opacity: wordmarkOpacity,
            transform: `translateY(${wordmarkY}px) scale(${wordmarkSpring})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            width: '290px',
            height: '62px',
            filter: 'drop-shadow(0 4px 16px rgba(202, 138, 4, 0.4))',
          }}
        >
          <img
            src={PROSODIC_TEXT_BASE64}
            alt="Prosodic"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />

          {/* Golden Sheen Flare across Wordmark */}
          <div
            style={{
              position: 'absolute',
              top: '-30%',
              left: `${sheenProgress}%`,
              width: '35px',
              height: '160%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%)',
              transform: 'rotate(25deg)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};


