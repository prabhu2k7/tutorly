import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

const PHASES = [
  { at: 0, label: 'Reading video info from YouTube', sub: 'Looking up the video title via YouTube oEmbed.' },
  { at: 3, label: 'Pulling the transcript', sub: 'Fetching captions from YouTube — this is usually the bottleneck.' },
  { at: 8, label: 'Embedding text into your tutor’s brain', sub: 'Sending chunks to OpenAI for vector embeddings.' },
  { at: 20, label: 'Almost there', sub: 'Storing chunks in the vector database.' },
]

function ImportProgress({ subject, compact = false }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setElapsed((performance.now() - start) / 1000), 250)
    return () => clearInterval(id)
  }, [])

  let phaseIdx = 0
  for (let i = 0; i < PHASES.length; i++) if (elapsed >= PHASES[i].at) phaseIdx = i
  const phase = PHASES[phaseIdx]

  return (
    <div className={compact ? 'p-4' : 'p-2'}>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-500 p-2 rounded-xl shadow-lg">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-violet-600 font-semibold">
            Importing — {Math.round(elapsed)}s elapsed
          </div>
          <div className="text-base font-bold text-gray-900 truncate">{phase.label}…</div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">{phase.sub}</p>
      <ol className="space-y-2">
        {PHASES.map((p, i) => {
          const done = i < phaseIdx
          const active = i === phaseIdx
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className={
                'flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ' +
                (done ? 'bg-emerald-500 text-white'
                  : active ? 'bg-violet-100 text-violet-700'
                  : 'bg-gray-100 text-gray-400')
              }>
                {done ? <CheckCircle2 className="w-4 h-4" />
                  : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <span className="text-[10px] font-semibold">{i + 1}</span>}
              </span>
              <span className={done ? 'text-gray-500 line-through decoration-emerald-300' : active ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                {p.label}
              </span>
            </li>
          )
        })}
      </ol>
      {subject && (
        <p className="mt-3 text-xs text-gray-500 truncate">
          {subject}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        Typical time: <span className="font-semibold">10–25 seconds</span>.
      </p>
    </div>
  )
}

export default ImportProgress
