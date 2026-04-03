// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLanguage } from '../context/LanguageContext'
import { CLASSIFIERS } from '../utils/datasets'
import { prCurve, averagePrecision } from '../utils/metrics'

const CURVE_COLORS = ['#10b981', '#60a5fa', '#f59e0b', '#71717a']

export default function PRCurve() {
  const { t } = useLanguage()
  const [clfId, setClfId] = useState('good')

  const clf = CLASSIFIERS.find(c => c.id === clfId) ?? CLASSIFIERS[1]
  const { yTrue, yScore } = useMemo(() => clf.generate(), [clfId])  // eslint-disable-line

  const curve = useMemo(() => prCurve(yTrue, yScore), [yTrue, yScore])
  const ap = useMemo(() => averagePrecision(curve), [curve])

  // Prevalence for random baseline
  const prevalence = yTrue.filter(v => v === 1).length / yTrue.length

  const curveData = curve.map(p => ({ recall: +p.recall.toFixed(3), precision: +p.precision.toFixed(3) }))
  const baselineData = [{ recall: 0, precision: prevalence }, { recall: 1, precision: prevalence }]

  return (
    <section id="pr" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-3xl font-bold text-zinc-100 mb-3">{t('prTitle')}</h2>
        <p className="text-zinc-400 mb-4 max-w-3xl">{t('prSubtitle')}</p>
        <p className="text-sm text-zinc-400 italic border-l-2 border-rose-500/40 pl-4 mb-8">{t('prHint')}</p>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-zinc-400">{t('prClassifier')}:</span>
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-wrap">
            {CLASSIFIERS.map((c) => (
              <button key={c.id} onClick={() => setClfId(c.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  clfId === c.id ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-zinc-400 hover:text-zinc-200'
                }`}>{t(c.labelKey)}</button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-medium text-zinc-300">Precision-Recall Curve</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{t('prAP')}:</span>
                <span className="text-xl font-bold font-mono text-rose-400">{ap.toFixed(3)}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{ fill: '#71717a', fontSize: 10 }}
                  label={{ value: t('prRecall'), position: 'insideBottom', offset: -15, fill: '#71717a', fontSize: 11 }} />
                <YAxis dataKey="precision" type="number" domain={[0, 1]} tick={{ fill: '#71717a', fontSize: 10 }}
                  label={{ value: t('prPrecision'), angle: -90, position: 'insideLeft', offset: -10, fill: '#71717a', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 11 }}
                  formatter={(v: number) => v.toFixed(3)} />
                {/* Baseline */}
                <Scatter data={baselineData} fill="none"
                  line={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                  shape={() => null as unknown as React.ReactElement} />
                {/* PR curve */}
                <Scatter data={curveData} fill="none"
                  line={{ stroke: CURVE_COLORS[CLASSIFIERS.findIndex(c => c.id === clfId)], strokeWidth: 2.5 }}
                  shape={() => null as unknown as React.ReactElement} />
                <ReferenceLine y={prevalence} stroke="#52525b" strokeDasharray="4 4" strokeWidth={1} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              — — {t('prBaseline')}: {(prevalence * 100).toFixed(1)}%
            </p>
          </div>

          {/* Comparison table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-semibold text-zinc-300 mb-4">Average Precision by Classifier</p>
            <div className="space-y-3">
              {CLASSIFIERS.map((c, ci) => {
                const { yTrue: yt, yScore: ys } = c.generate()
                const cv = prCurve(yt, ys)
                const a = averagePrecision(cv)
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CURVE_COLORS[ci] }} />
                    <span className="text-xs text-zinc-400 flex-1">{t(c.labelKey)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a * 100}%`, background: CURVE_COLORS[ci] }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: CURVE_COLORS[ci] }}>{a.toFixed(3)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-6 leading-relaxed">
              AP = area under the PR curve. Higher = better at finding positives with high precision.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
