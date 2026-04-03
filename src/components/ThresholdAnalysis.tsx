// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { useLanguage } from '../context/LanguageContext'
import { DATASETS } from '../utils/datasets'
import { thresholdSweep, metricsAtThreshold } from '../utils/metrics'

const DS_LABELS: Record<string, string> = { balanced: '1:1', mild: '1:5', imbalanced: '1:10', extreme: '1:20' }

export default function ThresholdAnalysis() {
  const { t } = useLanguage()
  const [dsId, setDsId] = useState('balanced')
  const [threshold, setThreshold] = useState(0.5)

  const ds = DATASETS.find(d => d.id === dsId) ?? DATASETS[0]
  const yTrue = useMemo(() => ds.samples.map(s => s.label), [dsId])   // eslint-disable-line
  const yScore = useMemo(() => ds.samples.map(s => s.score), [dsId])  // eslint-disable-line

  const sweep = useMemo(() => thresholdSweep(yTrue, yScore, 80).map(m => ({
    t: +m.threshold.toFixed(3),
    precision: +(m.precision * 100).toFixed(1),
    recall: +(m.recall * 100).toFixed(1),
    f1: +(m.f1 * 100).toFixed(1),
    accuracy: +(m.accuracy * 100).toFixed(1),
  })), [yTrue, yScore])

  const optF1 = useMemo(() => {
    let best = sweep[0]; for (const s of sweep) if (s.f1 > best.f1) best = s; return best
  }, [sweep])

  const cur = useMemo(() => metricsAtThreshold(yTrue, yScore, threshold), [yTrue, yScore, threshold])

  return (
    <section id="threshold" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-3xl font-bold text-zinc-100 mb-3">{t('thrTitle')}</h2>
        <p className="text-zinc-400 mb-8 max-w-3xl">{t('thrSubtitle')}</p>

        <div className="flex flex-wrap gap-6 items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Dataset:</span>
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {DATASETS.map(d => (
                <button key={d.id} onClick={() => setDsId(d.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    dsId === d.id ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-zinc-400 hover:text-zinc-200'
                  }`}>{DS_LABELS[d.id]}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t('thrThreshold')}:</span>
            <input type="range" min={0.01} max={0.99} step={0.01} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-40 accent-rose-500" />
            <span className="text-rose-400 font-mono font-bold w-12">{threshold.toFixed(2)}</span>
          </div>
        </div>

        {/* Current metrics badges */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: t('thrPrecision'), value: cur.precision, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { label: t('thrRecall'),    value: cur.recall,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: t('thrF1'),        value: cur.f1,        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            { label: t('thrAccuracy'),  value: cur.accuracy,  color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`px-4 py-2 rounded-xl border text-sm font-medium ${color}`}>
              {label}: <span className="font-mono font-bold">{(value * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-400 italic border-l-2 border-rose-500/40 pl-4 mb-8">{t('thrHint')}</p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-medium text-zinc-300">Metrics vs. Threshold</p>
            <span className="text-xs text-zinc-500">
              {t('thrOptimalF1')}: <span className="text-rose-400 font-mono">{optF1.t.toFixed(2)}</span>
              {' '}(F1={optF1.f1.toFixed(1)}%)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sweep} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="t" tick={{ fill: '#71717a', fontSize: 10 }} label={{ value: 'Threshold', position: 'insideBottom', offset: -2, fill: '#71717a', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 11 }}
                formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
              <ReferenceLine x={threshold} stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 3" />
              <ReferenceLine x={optF1.t} stroke="#fb923c" strokeWidth={1} strokeDasharray="2 4" />
              <Line type="monotone" dataKey="precision" name={t('thrPrecision')} stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="recall"    name={t('thrRecall')}    stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="f1"        name={t('thrF1')}        stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="accuracy"  name={t('thrAccuracy')}  stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </section>
  )
}
