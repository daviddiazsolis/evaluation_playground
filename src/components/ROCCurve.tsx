// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLanguage } from '../context/LanguageContext'
import { CLASSIFIERS } from '../utils/datasets'
import { rocCurve, aucROC, metricsAtThreshold } from '../utils/metrics'

const CURVE_COLORS = ['#10b981', '#60a5fa', '#f59e0b', '#71717a']

export default function ROCCurve() {
  const { t } = useLanguage()
  const [clfId, setClfId] = useState('good')
  const [threshold, setThreshold] = useState(0.5)

  const clf = CLASSIFIERS.find(c => c.id === clfId) ?? CLASSIFIERS[1]
  const { yTrue, yScore } = useMemo(() => clf.generate(), [clfId])  // eslint-disable-line

  const roc = useMemo(() => rocCurve(yTrue, yScore), [yTrue, yScore])
  const auc = useMemo(() => aucROC(roc), [roc])

  const cur = useMemo(() => metricsAtThreshold(yTrue, yScore, threshold), [yTrue, yScore, threshold])

  const rocData = roc.map(p => ({ fpr: +p.fpr.toFixed(3), tpr: +p.tpr.toFixed(3) }))
  const diagonalData = [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]
  const operatingPoint = [{ fpr: cur.fpr, tpr: cur.recall }]

  const AUC_LEVELS = [
    { key: 'rocI1', range: [0.9, 1.0], color: 'text-emerald-400' },
    { key: 'rocI2', range: [0.8, 0.9], color: 'text-blue-400' },
    { key: 'rocI3', range: [0.7, 0.8], color: 'text-yellow-400' },
    { key: 'rocI4', range: [0.6, 0.7], color: 'text-orange-400' },
    { key: 'rocI5', range: [0.5, 0.6], color: 'text-red-400' },
  ]
  const aucLevel = AUC_LEVELS.find(l => auc >= l.range[0] && auc <= l.range[1]) ?? AUC_LEVELS[4]

  return (
    <section id="roc" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-3xl font-bold text-zinc-100 mb-3">{t('rocTitle')}</h2>
        <p className="text-zinc-400 mb-8 max-w-3xl">{t('rocSubtitle')}</p>

        <p className="text-sm text-zinc-400 italic border-l-2 border-rose-500/40 pl-4 mb-8">{t('rocHint')}</p>

        <div className="flex flex-wrap gap-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t('rocClassifier')}:</span>
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-wrap">
              {CLASSIFIERS.map((c, ci) => (
                <button key={c.id} onClick={() => setClfId(c.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    clfId === c.id ? `text-${['emerald','blue','yellow','zinc'][ci]}-300 bg-${['emerald','blue','yellow','zinc'][ci]}-500/20 border border-${['emerald','blue','yellow','zinc'][ci]}-500/40` : 'text-zinc-400 hover:text-zinc-200'
                  }`}>{t(c.labelKey)}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t('rocThreshold')}:</span>
            <input type="range" min={0.01} max={0.99} step={0.01} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-32 accent-rose-500" />
            <span className="text-rose-400 font-mono w-10">{threshold.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ROC Plot */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-medium text-zinc-300">ROC Curve</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{t('rocAUC')}:</span>
                <span className={`text-xl font-bold font-mono ${aucLevel.color}`}>{auc.toFixed(3)}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fill: '#71717a', fontSize: 10 }}
                  label={{ value: t('rocFPR'), position: 'insideBottom', offset: -15, fill: '#71717a', fontSize: 11 }} />
                <YAxis dataKey="tpr" type="number" domain={[0, 1]} tick={{ fill: '#71717a', fontSize: 10 }}
                  label={{ value: t('rocTPR'), angle: -90, position: 'insideLeft', offset: -10, fill: '#71717a', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 11 }}
                  formatter={(v: number) => v.toFixed(3)} />
                {/* Diagonal */}
                <Scatter data={diagonalData} fill="none" line={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} shape={() => null as unknown as React.ReactElement} />
                {/* ROC curve as connected scatter */}
                <Scatter data={rocData} fill="none"
                  line={{ stroke: CURVE_COLORS[CLASSIFIERS.findIndex(c => c.id === clfId)], strokeWidth: 2.5 }}
                  shape={() => null as unknown as React.ReactElement} />
                {/* Operating point */}
                <Scatter data={operatingPoint} fill="#f43f5e" r={6} />
                <ReferenceLine x={cur.fpr} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={cur.recall} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              ● {t('rocThreshold')} = {threshold.toFixed(2)} — TPR: {cur.recall.toFixed(3)}, FPR: {cur.fpr.toFixed(3)}
            </p>
          </div>

          {/* Interpretation panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{t('rocInterpretation')}</p>
              {AUC_LEVELS.map(l => (
                <div key={l.key} className={`flex justify-between items-center py-1.5 text-xs ${auc >= l.range[0] && auc <= l.range[1] ? 'font-bold ' + l.color : 'text-zinc-600'}`}>
                  <span>{t(l.key)}</span>
                  {auc >= l.range[0] && auc <= l.range[1] && <span className="text-xs">← you are here</span>}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-xs">
              <p className="font-semibold text-zinc-300 mb-2">At threshold {threshold.toFixed(2)}:</p>
              {[
                ['Precision', cur.precision],
                ['Recall (TPR)', cur.recall],
                ['Specificity', cur.specificity],
                ['F1 Score', cur.f1],
                ['Accuracy', cur.accuracy],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-zinc-400">{label as string}</span>
                  <span className="font-mono text-zinc-200">{((value as number) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
