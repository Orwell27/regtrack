import { ImageResponse } from 'next/og'
export const alt = 'RegTrack: entiende qué cambia y decide con más contexto'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f5f2e9',
          color: '#153f38',
          width: '100%',
          height: '100%',
          padding: '72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 30 }}>RegTrack · Comunidad de propietarios</div>
        <div
          style={{
            fontSize: 72,
            letterSpacing: '-3px',
            lineHeight: 1.1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Entiende qué cambia.</span>
          <span>Decide con más contexto.</span>
        </div>
        <div style={{ fontSize: 26 }}>
          Fuentes · Territorio · Experiencias compartidas
        </div>
      </div>
    ),
    size,
  )
}
