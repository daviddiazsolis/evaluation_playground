// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useLanguage } from '../context/LanguageContext'
import { DATASETS } from '../utils/datasets'
import { metricsAtThreshold } from '../utils/metrics'

const DS_LABELS: Record<string, string> = {
  balanced: '1:1', mild: '1:5', imbalanced: '1:10', extreme: '1:20',
}

function MetricCard({ label, value, desc, color }: { label: string; value: string; desc: string; color: string }) {
  return (
    <div className={`rounded-xl border ${color} p-4`}>
      <div className="text-2xl font-bold font-mono mb-1">{value}</div>
      <div className="text-sm font-semibold text-zinc-200 mb-1">{label}</div>
      <div className="text-xs text-zinc-500 leading-relaxed">{desc}</div>
    </div>
  )
}

export default function ConfusionMatrix() {
  const { t } = useLanguage()
  const [dsId, setDsId] = useState('balanced')
  const [threshold, setThreshold] = useState(0.5)

  const ds = DATASETS.find(d => d.id === dsId) ?? DATASETS[0]
  const yTrue = useMemo(() => ds.samples.map(s => s.label), [dsId])        // eslint-disable-line
  const yScore = useMemo(() => ds.samples.map(s => s.score), [dsId])       // eslint-disable-line

  const m = useMemo(() => metricsAtThreshold(yTrue, yScore, threshold), [yTrue, yScore, threshold])
  const { cm: { tp, fp, fn, tn }, accuracy, precision, recall, f1, specificity } = m

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  const cmCells = [
    { label: t('cmTP'), value: tp, desc: t('cmTPDesc'), bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-300' },
    { label: t('cmFP'), value: fp, desc: t('cmFPDesc'), bg: 'bg-orange-500/20 border-orange-500/30', text: 'text-orange-300' },
    { label: t('cmFN'), value: fn, desc: t('cmFNDesc'), bg: 'bg-red-500/20 border-red-500/30',    text: 'text-red-300' },
    { label: t('cmTN'), value: tn, desc: t('cmTNDesc'), bg: 'bg-blue-500/20 border-blue-500/30',  text: 'text-blue-300' },
  ]

  return (
    <section id="matrix" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-3xl font-bold text-zinc-100 mb-3">{t('cmTitle')}</h2>
        <p className="text-zinc-400 mb-8 max-w-3xl">{t('cmSubtitle')}</p>

        {/* Controls */}
        <div className="flex flex-wrap gap-6 items-center mb-8">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t('cmDataset')}:</span>
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {DATASETS.map(d => (
                <button key={d.id} onClick={() => setDsId(d.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    dsId === d.id ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-zinc-400 hover:text-zinc-200'
                  }`}>
                  {DS_LABELS[d.id]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t('cmThreshold')}:</span>
            <input type="range" min={0.01} max={0.99} step={0.01} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-40 accent-rose-500" />
            <span className="text-rose-400 font-mono font-bold w-12">{threshold.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-sm text-rose-300/80 italic border-l-2 border-rose-500/40 pl-4 mb-8">{t('cmHint')}</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* The matrix */}
          <div>
            <div className="mb-3 text-center">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">← Predicted →</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cmCells.map(cell => (
                <div key={cell.label} className={`rounded-xl border ${cell.bg} p-5 text-center`}>
                  <div className={`text-4xl font-bold font-mono ${cell.text} mb-2`}>{cell.value}</div>
                  <div className="text-sm font-semibold text-zinc-200">{cell.label}</div>
                  <div className="text-xs text-zinc-500 mt-1">{cell.desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center text-xs text-zinc-500">
              Total: {tp + fp + fn + tn} samples
            </div>
          </div>

          {/* Derived metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label={t('cmAccuracy')}    value={pct(accuracy)}    desc={t('cmAccuracyDesc')}    color="border-zinc-700 bg-zinc-900/40" />
            <MetricCard label={t('cmPrecision')}   value={pct(precision)}   desc={t('cmPrecisionDesc')}   color="border-blue-500/30 bg-blue-900/20" />
            <MetricCard label={t('cmRecall')}      value={pct(recall)}      desc={t('cmRecallDesc')}      color="border-emerald-500/30 bg-emerald-900/20" />
            <MetricCard label={t('cmF1')}          value={pct(f1)}          desc={t('cmF1Desc')}          color="border-rose-500/30 bg-rose-900/20" />
            <MetricCard label={t('cmSpecificity')} value={pct(specificity)} desc={t('cmSpecificityDesc')} color="border-violet-500/30 bg-violet-900/20" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
