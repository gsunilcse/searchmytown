import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const alt = 'SearchMyTown open graph image';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'radial-gradient(circle at top left, rgba(148, 163, 184, 0.45), transparent 28%), linear-gradient(135deg, #020617 0%, #1e293b 52%, #334155 100%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '64px',
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '9999px',
            display: 'flex',
            fontSize: 24,
            letterSpacing: '0.28em',
            padding: '14px 22px',
            textTransform: 'uppercase',
          }}
        >
          Town-first local discovery
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '860px' }}>
          <div style={{ display: 'flex', fontSize: 86, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1 }}>
            {SITE_NAME}
          </div>
          <div style={{ display: 'flex', fontSize: 34, lineHeight: 1.4, color: 'rgba(248, 250, 252, 0.84)' }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px' }}>
          {['Restaurants', 'Businesses', 'Services', 'Events'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                display: 'flex',
                fontSize: 24,
                padding: '14px 22px',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}