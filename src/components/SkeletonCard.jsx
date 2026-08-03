import React from 'react'

const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.skeleton-block {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 0%,
    rgba(255,255,255,0.10) 50%,
    rgba(255,255,255,0.04) 100%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 8px;
}
`

let injected = false
function injectCSS() {
  if (injected || typeof document === 'undefined') return
  const s = document.createElement('style')
  s.textContent = SHIMMER_CSS
  document.head.appendChild(s)
  injected = true
}

export function WardrobeSkeletonCard() {
  injectCSS()
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {}
      <div className="skeleton-block" style={{ width: '100%', paddingBottom: '100%' }} />
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-block" style={{ height: 13, width: '60%' }} />
        <div className="skeleton-block" style={{ height: 11, width: '40%' }} />
      </div>
    </div>
  )
}

export function OutfitSkeletonCard() {
  injectCSS()
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16, padding: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton-block"
            style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} />
        ))}
      </div>
      <div className="skeleton-block" style={{ height: 13, width: '70%' }} />
      <div className="skeleton-block" style={{ height: 11, width: '90%' }} />
      {}
      <div className="skeleton-block" style={{ height: 6, width: '100%', borderRadius: 3 }} />
    </div>
  )
}

export function WardrobeSkeletonGrid({ count = 6 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: 12, padding: '0 16px',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <WardrobeSkeletonCard key={i} />
      ))}
    </div>
  )
}

export function OutfitSkeletonList({ count = 3 }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, padding: '0 16px',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <OutfitSkeletonCard key={i} />
      ))}
    </div>
  )
}

export function ListRowSkeleton() {
  injectCSS()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="skeleton-block" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton-block" style={{ height: 13, width: '65%' }} />
        <div className="skeleton-block" style={{ height: 11, width: '40%' }} />
      </div>
    </div>
  )
}

export function ListRowSkeletonGroup({ count = 5 }) {
  return (
    <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  injectCSS()
  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header"><h2>Phong cách của bạn</h2></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
            }}>
              <div className="skeleton-block" style={{ width: 28, height: 28, borderRadius: 8 }} />
              <div className="skeleton-block" style={{ height: 10, width: '70%' }} />
            </div>
          ))}
        </div>
        {}
        <div className="skeleton-block" style={{ height: 200, width: '100%', borderRadius: 16 }} />
        {}
        <div className="skeleton-block" style={{ height: 140, width: '100%', borderRadius: 16 }} />
      </div>
    </div>
  )
}
