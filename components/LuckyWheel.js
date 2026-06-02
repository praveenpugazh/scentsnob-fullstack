'use client'
import { useState, useEffect, useRef } from 'react'

// Weights by category — ME wins most, designer middle, niche rare
const CATEGORY_WEIGHTS = { dupe: 60, designer: 34, niche: 6 }
const WHEEL_SIZE = 10 // total segments: 4 ME + 4 designer + 2 niche

function pickWeightedProducts(products) {
  const me = products.filter((p) => p.category === 'dupe' && !p.sold_out)
  const designer = products.filter(
    (p) => p.category === 'designer' && !p.sold_out
  )
  const niche = products.filter((p) => p.category === 'niche' && !p.sold_out)

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

  const picks = [
    ...shuffle(me).slice(0, 4),
    ...shuffle(designer).slice(0, 4),
    ...shuffle(niche).slice(0, 2)
  ]

  // Shuffle the wheel segments so categories aren't grouped
  return shuffle(picks)
}

function pickWinner(segments) {
  // Weighted random: ME=60%, designer=34%, niche=6%
  const rand = Math.random() * 100
  let targetCat
  if (rand < 60) targetCat = 'dupe'
  else if (rand < 94) targetCat = 'designer'
  else targetCat = 'niche'

  // Find segments of that category
  const candidates = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.category === targetCat)
  if (candidates.length === 0) return { prize: segments[0], index: 0 }

  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  return { prize: picked.s, index: picked.i }
}

const COLORS = [
  '#b09060',
  '#8b6e44',
  '#c4a882',
  '#6b5030',
  '#9b7a52',
  '#d4b896',
  '#7a5f3a',
  '#b89060',
  '#5a4428',
  '#e0c8a0'
]

export default function LuckyWheel({ products, onClose, onWin }) {
  const canvasRef = useRef(null)
  const [segments, setSegments] = useState([])
  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState(null)
  const [angle, setAngle] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    if (products.length === 0) return
    setSegments(pickWeightedProducts(products))
  }, [products])

  useEffect(() => {
    if (segments.length === 0) return
    drawWheel(angle)
  }, [segments, angle])

  function drawWheel(currentAngle) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = cx - 10
    const n = segments.length
    const arc = (2 * Math.PI) / n

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    segments.forEach((seg, i) => {
      const startAngle = currentAngle + i * arc
      const endAngle = startAngle + arc

      // Slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + arc / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${seg.category === 'niche' ? 10 : 9}px sans-serif`
      // Brand on top line, name on second
      const label =
        seg.name.length > 12 ? seg.name.slice(0, 12) + '…' : seg.name
      ctx.fillText(seg.brand, r - 8, -4)
      ctx.font = `9px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillText(label, r - 8, 8)
      ctx.restore()
    })

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI)
    ctx.fillStyle = '#0a0908'
    ctx.fill()
    ctx.strokeStyle = '#b09060'
    ctx.lineWidth = 2
    ctx.stroke()

    // Center text
    ctx.fillStyle = '#b09060'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SPIN', cx, cy + 4)

    // Pointer triangle at top
    ctx.beginPath()
    ctx.moveTo(cx - 10, 4)
    ctx.lineTo(cx + 10, 4)
    ctx.lineTo(cx, 22)
    ctx.closePath()
    ctx.fillStyle = '#fff'
    ctx.fill()
  }

  const spin = () => {
    if (spinning || prize) return
    setSpinning(true)

    const { prize: winner, index } = pickWinner(segments)
    const n = segments.length
    const arc = (2 * Math.PI) / n

    // Target angle: winner segment points to top (pointer at top = 270deg = -Math.PI/2)
    const targetSegCenter = index * arc + arc / 2
    const targetAngle = -Math.PI / 2 - targetSegCenter

    // Spin 8-12 full rotations + land on winner
    const fullRotations = (8 + Math.floor(Math.random() * 4)) * 2 * Math.PI
    const finalAngle = targetAngle + fullRotations

    let start = null
    const duration = 5000
    const from = angle

    const easeOut = (t) => 1 - Math.pow(1 - t, 4)

    function step(ts) {
      if (!start) start = ts
      const elapsed = ts - start
      const t = Math.min(elapsed / duration, 1)
      const current = from + (finalAngle - from) * easeOut(t)
      setAngle(current)
      drawWheel(current)

      if (t < 1) {
        animRef.current = requestAnimationFrame(step)
      } else {
        setSpinning(false)
        setPrize(winner)
        onWin && onWin(winner)
      }
    }

    animRef.current = requestAnimationFrame(step)
  }

  useEffect(
    () => () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    },
    []
  )

  const catLabel = { niche: '🌟 Niche', designer: '✦ Designer', dupe: '🌙 ME' }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          background: '#0e0c0a',
          border: '0.5px solid rgba(176,144,96,0.3)',
          borderRadius: 16,
          padding: '2rem',
          width: '100%',
          maxWidth: 440,
          textAlign: 'center'
        }}
      >
        {!prize ? (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                marginBottom: 8
              }}
            >
              🎁 You qualify for a free 2ml sample!
            </div>
            <h2
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.6rem',
                color: 'var(--t1)',
                marginBottom: 4
              }}
            >
              Spin to Win
            </h2>
            <p
              style={{
                fontSize: 12,
                color: 'var(--t3)',
                marginBottom: 24,
                lineHeight: 1.7
              }}
            >
              Your order is above ₹5,000 — spin the wheel to choose your
              complimentary 2ml luxury sample.
            </p>

            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                marginBottom: 24
              }}
            >
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onClick={!spinning ? spin : undefined}
                style={{
                  cursor: spinning ? 'default' : 'pointer',
                  borderRadius: '50%',
                  display: 'block'
                }}
              />
            </div>

            <button
              onClick={spin}
              disabled={spinning || segments.length === 0}
              style={{
                padding: '12px 36px',
                borderRadius: 8,
                background: spinning ? 'rgba(176,144,96,0.4)' : '#b09060',
                border: 'none',
                color: '#fff',
                fontFamily: 'var(--ff-sans)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: spinning ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {spinning ? 'Spinning...' : 'Spin the Wheel!'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 10 }}>
              Click the wheel or button to spin
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                marginBottom: 8
              }}
            >
              You won!
            </div>
            <h2
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.8rem',
                color: 'var(--t1)',
                marginBottom: 6
              }}
            >
              {prize.brand}
            </h2>
            <h3
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.2rem',
                color: 'var(--gold)',
                fontWeight: 400,
                marginBottom: 8
              }}
            >
              {prize.name}
            </h3>
            <div
              style={{
                display: 'inline-block',
                fontSize: 11,
                padding: '3px 12px',
                borderRadius: 20,
                background: 'rgba(176,144,96,0.12)',
                color: 'var(--gold)',
                border: '0.5px solid rgba(176,144,96,0.3)',
                marginBottom: 20
              }}
            >
              {catLabel[prize.category] || prize.category} · 2ml complimentary
              sample
            </div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--t3)',
                lineHeight: 1.7,
                marginBottom: 24
              }}
            >
              We'll include a 2ml sample of {prize.brand} {prize.name} with your
              order. No action needed — we've noted it!
            </p>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 8,
                background: '#b09060',
                border: 'none',
                color: '#fff',
                fontFamily: 'var(--ff-sans)',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  )
}
