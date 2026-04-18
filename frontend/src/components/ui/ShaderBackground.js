import HeroWaveBackground from './HeroWaveBackground';

export default function ShaderBackground({ children }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', background: '#000' }}>

      {/* Hero Wave — fixed so it covers full viewport */}
      <div data-hero-wave style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <HeroWaveBackground style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
