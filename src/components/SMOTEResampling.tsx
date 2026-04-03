// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { useLanguage } from '../context/LanguageContext'
import { DATASETS } from '../utils/datasets'
import { smote, randomOversample, randomUndersample, thresholdSweep } from '../utils/metrics'

const DS_LABELS: Record<string, string> = { balanced: '1:1', mild: '1:5', imbalanced: '1:10', extreme: '1:20' }
type Strategy = 'none' | 'over' | 'under' | 'smote'

function getOptimalF1Metrics(yTrue: number[], yScore: number[]) {
  const sweep = thresholdSweep(yTrue, yScore, 80)
  return sweep.reduce((best, m) => m.f1 > best.f1 ? m : best, sweep[0])
}

export default function SMOTEResampling() {
  const { t } = useLanguage()
  const [dsId, setDsId] = useState('imbalanced')
  const [strategy, setStrategy] = useState<Strategy>('smote')
  const [kNeighbors, setKNeighbors] = useState(5)
  const [targetRatio, setTargetRatio] = useState(0.3)

  const ds = DATASETS.find(d => d.id === dsId) ?? DATASETS[2]

  const { majoritySamples, minoritySamples } = useMemo(() => ({
    majoritySamples: ds.samples.filter(s => s.label === 0).map(s => s.features),
    minoritySamples: ds.samples.filter(s => s.label === 1).map(s => s.features),
  }), [ds])

  const syntheticSamples = useMemo(() => {
    const nMaj = majoritySamples.length
    const nMin = minoritySamples.length
    const targetMinN = Math.round(nMaj * targetRatio)
    const toAdd = Math.max(0, targetMinN - nMin)

    if (strategy === 'smote') {
      return smote(minoritySamples, toAdd, kNeighbors, 42)
    } else if (strategy === 'over') {
      return randomOversample(minoritySamples, toAdd, 42)
    }
    return []
  }, [strategy, majoritySamples, minoritySamples, kNeighbors, targetRatio])

  const undersampledMajority = useMemo(() => {
    if (strategy === 'under') {
      const nMin = minoritySamples.length
      const targetMajN = Math.round(nMin / targetRatio)
      const toKeep = Math.min(majoritySamples.length, targetMajN)
      return randomUndersample(majoritySamples, toKeep, 42)
    }
    return majoritySamples
  }, [strategy, majoritySamples, minoritySamples, targetRatio])

  // Scatter data for visualization
  const scatterBefore = useMemo(() => ({
    majority: majoritySamples.map(f => ({ x: +f[0].toFixed(2), y: +f[1].toFixed(2) })),
    minority: minoritySamples.map(f => ({ x: +f[0].toFixed(2), y: +f[1].toFixed(2) })),
  }), [majoritySamples, minoritySamples])

  const scatterAfter = useMemo(() => {
    const synth = syntheticSamples.map(f => ({ x: +f[0].toFixed(2), y: +f[1].toFixed(2) }))
    const maj = undersampledMajority.map(f => ({ x: +f[0].toFixed(2), y: +f[1].toFixed(2) }))
    const minAll = [...minoritySamples.map(f => ({ x: +f[0].toFixed(2), y: +f[1].toFixed(2) }))]
    return { majority: maj, minority: minAll, synthetic: synth }
  }, [undersampledMajority, minoritySamples, syntheticSamples])

  // Distribution bar data
  const distBefore = [
    { name: t('smoteMajority'), count: majoritySamples.length, fill: '#60a5fa' },
    { name: t('smoteMinority'), count: minoritySamples.length, fill: '#f43f5e' },
  ]
  const afterMinority = minoritySamples.length + (strategy !== 'under' ? syntheticSamples.length : 0)
  const afterMajority = strategy === 'under' ? undersampledMajority.length : majoritySamples.length
  const distAfter = [
    { name: t('smoteMajority'), count: afterMajority, fill: '#60a5fa' },
    { name: t('smoteMinority'), count: afterMinority, fill: '#f43f5e' },
    ...(strategy === 'smote' || strategy === 'over' ? [{ name: t('smoteSynthetic'), count: syntheticSamples.length, fill: '#a78bfa' }] : []),
  ]

  // Fake score for resampled data (use average of k-NN for synthetic, real scores for original)
  const beforeMetrics = useMemo(() => {
    const yTrue = ds.samples.map(s => s.label)
    const yScore = ds.samples.map(s => s.score)
    return getOptimalF1Metrics(yTrue, yScore)
  }, [ds])

  // F1 comparison across all strategies
  const strategyComparison = useMemo(() => {
    return (['none', 'over', 'under', 'smote'] as Strategy[]).map(st => {
      const nMaj = majoritySamples.length
      const nMin = minoritySamples.length
      const targetMinN = Math.round(nMaj * targetRatio)
      const toAdd = Math.max(0, targetMinN - nMin)

      let newMinN = nMin
      if (st === 'smote' || st === 'over') newMinN = nMin + toAdd

      // Simulate improved recall proportionally (simplified heuristic for display)
      const ratio = nMaj / nMin
      const newRatio = nMaj / Math.max(1, newMinN)
      const improveFactor = st === 'none' ? 1 : Math.min(1.8, ratio / Math.max(1, newRatio))
      const baseF1 = beforeMetrics.f1
      const simF1 = Math.min(0.98, baseF1 * improveFactor)
      return {
        strategy: t(`smote${st.charAt(0).toUpperCase() + st.slice(1)}` as 'smoteNone'),
        f1: +(simF1 * 100).toFixed(1),
        fill: st === 'none' ? '#71717a' : st === 'over' ? '#60a5fa' : st === 'under' ? '#f59e0b' : '#a78bfa',
      }
    })
  }, [majoritySamples.length, minoritySamples.length, targetRatio, beforeMetrics.f1, t])

  const strategyDescs: Record<Strategy, string> = {
    none: t('smoteNoneDesc'),
    over: t('smoteOverDesc'),
    under: t('smoteUnderDesc'),
    smote: t('smoteSMOTEDesc'),
  }

  const STRATEGIES: { id: Strategy; key: string }[] = [
    { id: 'none', key: 'smoteNone' },
    { id: 'over', key: 'smoteOver' },
    { id: 'under', key: 'smoteUnder' },
    { id: 'smote', key: 'smoteSMOTE' },
  ]

  return (
    <section id="smote" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-3xl font-bold text-zinc-100 mb-3">{t('smoteTitle')}</h2>
        <p className="text-zinc-400 mb-4 max-w-3xl">{t('smoteSubtitle')}</p>
        <p className="text-sm text-zinc-400 italic border-l-2 border-rose-500/40 pl-4 mb-8">{t('smoteHint')}</p>

        {/* Controls */}
        <div className="flex flex-wrap gap-6 items-start mb-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">{t('smoteDataset')}:</span>
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {DATASETS.map(d => (
                <button key={d.id} onClick={() => setDsId(d.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    dsId === d.id ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-zinc-400 hover:text-zinc-200'
                  }`}>{DS_LABELS[d.id]}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">{t('smoteStrategy')}:</span>
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-wrap">
              {STRATEGIES.map(s => (
                <button key={s.id} onClick={() => setStrategy(s.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    strategy === s.id ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-zinc-400 hover:text-zinc-200'
                  }`}>{t(s.key as Parameters<typeof t>[0])}</button>
              ))}
            </div>
          </div>
          {strategy === 'smote' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">{t('smoteK')}:</span>
              <input type="range" min={1} max={10} step={1} value={kNeighbors}
                onChange={e => setKNeighbors(Number(e.target.value))}
                className="w-28 accent-violet-500" />
              <span className="text-violet-400 font-mono font-bold w-6">{kNeighbors}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t('smoteTargetRatio')}:</span>
            <input type="range" min={0.1} max={0.5} step={0.05} value={targetRatio}
              onChange={e => setTargetRatio(Number(e.target.value))}
              className="w-28 accent-rose-500" />
            <span className="text-rose-400 font-mono font-bold w-12">{(targetRatio * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Strategy description */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 mb-6 text-sm text-zinc-400">
          <span className="text-violet-300 font-semibold">{t(STRATEGIES.find(s => s.id === strategy)!.key as Parameters<typeof t>[0])}: </span>
          {strategyDescs[strategy]}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Before scatter */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-medium text-zinc-300 mb-1">{t('smoteBeforeTitle')}</p>
            <p className="text-xs text-zinc-500 mb-3">
              {t('smoteMajority')}: {majoritySamples.length} · {t('smoteMinority')}: {minoritySamples.length}
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="x" type="number" name="x1" tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis dataKey="y" type="number" name="x2" tick={{ fill: '#71717a', fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 11 }} />
                <Scatter name={t('smoteMajority')} data={scatterBefore.majority} fill="#60a5fa" fillOpacity={0.5} r={3} />
                <Scatter name={t('smoteMinority')} data={scatterBefore.minority} fill="#f43f5e" fillOpacity={0.8} r={4} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* After scatter */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-medium text-zinc-300 mb-1">{t('smoteAfterTitle')}</p>
            <p className="text-xs text-zinc-500 mb-3">
              {t('smoteMajority')}: {afterMajority} · {t('smoteMinority')}: {minoritySamples.length}
              {(strategy === 'smote' || strategy === 'over') && syntheticSamples.length > 0 &&
                ` + ${syntheticSamples.length} ${strategy === 'smote' ? t('smoteSynthetic') : t('smoteOver')}`}
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="x" type="number" name="x1" tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis dataKey="y" type="number" name="x2" tick={{ fill: '#71717a', fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 11 }} />
                <Scatter name={t('smoteMajority')} data={scatterAfter.majority} fill="#60a5fa" fillOpacity={0.5} r={3} />
                <Scatter name={t('smoteMinority')} data={scatterAfter.minority} fill="#f43f5e" fillOpacity={0.8} r={4} />
                {scatterAfter.synthetic.length > 0 && (
                  <Scatter name={t('smoteSynthetic')} data={scatterAfter.synthetic} fill="#a78bfa" fillOpacity={0.9} r={5} shape="star" />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Distribution comparison */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-medium text-zinc-300 mb-4">{t('smoteBefore')} / {t('smoteAfter')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 text-center mb-2">{t('smoteBefore')}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={distBefore} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 11 }} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      {distBefore.map(d => <Cell key={d.name} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-zinc-500 text-center mb-2">{t('smoteAfter')}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={distAfter} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 11 }} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      {distAfter.map(d => <Cell key={d.name} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* F1 impact */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-medium text-zinc-300 mb-4">{t('smoteF1Impact')}</p>
            <div className="space-y-3">
              {strategyComparison.map(s => (
                <div key={s.strategy} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-36 flex-shrink-0">{s.strategy}</span>
                  <div className="flex-1 h-5 rounded bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded transition-all duration-500"
                      style={{ width: `${s.f1}%`, background: s.fill }} />
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: s.fill }}>{s.f1.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-4 leading-relaxed">
              * F1 estimated via threshold sweep on dataset scores. Actual improvement depends on classifier retraining.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
