// SPDX-License-Identifier: Apache-2.0
import { useMemo } from 'react'
import { motion } from 'motion/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { useLanguage } from '../context/LanguageContext'
import { DATASETS } from '../utils/datasets'
import { thresholdSweep, rocCurve, aucROC } from '../utils/metrics'

const DS_LABELS: Record<string, string> = { balanced: '1:1', mild: '1:5', imbalanced: '1:10', extreme: '1:20' }

export default function ClassImbalance() {
  const { t } = useLanguage()

  // Compute summary metrics for all datasets at their optimal F1 threshold
  const summary = useMemo(() => DATASETS.map(ds => {
    const yTrue = ds.samples.map(s => s.label)
    const yScore = ds.samples.map(s => s.score)
    const sweep = thresholdSweep(yTrue, yScore, 80)
    const optF1 = sweep.reduce((best, m) => m.f1 > best.f1 ? m : best, sweep[0])
    const roc = rocCurve(yTrue, yScore)
    const auc = aucROC(roc)
    const naiveAccuracy = ds.majorityN / (ds.majorityN + ds.minorityN)
    return {
      label: DS_LABELS[ds.id],
      accuracy: +(optF1.accuracy * 100).toFixed(1),
      f1: +(optF1.f1 * 100).toFixed(1),
      recall: +(optF1.recall * 100).toFixed(1),
      precision: +(optF1.precision * 100).toFixed(1),
      auc: +auc.toFixed(3),
      naiveAccuracy: +(naiveAccuracy * 100).toFixed(1),
      majorityN: ds.majorityN,
      minorityN: ds.minorityN,
      total: ds.majorityN + ds.minorityN,
      ratio: DS_LABELS[ds.id],
    }
  }), [])

  const paradoxData = summary.map(d => ({
    ratio: d.label,
    'Naive accuracy': d.naiveAccuracy,
    'Classifier accuracy': d.accuracy,
    'F1 Score': d.f1,
    'Recall': d.recall,
  }))

  const distData = summary.map(d => ({
    ratio: d.label,
    [t('imbalanceMajority')]: d.majorityN,
    [t('imbalanceMinority')]: d.minorityN,
  }))

  return (
    <section id="imbalance" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-3xl font-bold text-zinc-100 mb-3">{t('imbalanceTitle')}</h2>
        <p className="text-zinc-400 mb-4 max-w-3xl">{t('imbalanceSubtitle')}</p>
        <p className="text-sm text-zinc-400 italic border-l-2 border-rose-500/40 pl-4 mb-8">{t('imbalanceHint')}</p>

        {/* Accuracy paradox callouts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {summary.map(d => {
            const paradox = d.naiveAccuracy
            const desc = t('imbalanceParadoxDesc')
              .replace('{acc}', paradox.toFixed(1))
              .replace('{ratio}', d.ratio)
            return (
              <div key={d.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{t('imbalanceRatio')}: <span className="text-rose-400 font-mono font-bold">{d.ratio}</span></div>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-2xl font-bold font-mono text-orange-400">{paradox.toFixed(1)}%</span>
                  <span className="text-xs text-zinc-500 mb-1">{t('imbalanceAccuracyParadox')}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Class distribution */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-medium text-zinc-300 mb-4">{t('imbalanceDist')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="ratio" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                <Bar dataKey={t('imbalanceMajority')} fill="#60a5fa" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey={t('imbalanceMinority')} fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics comparison */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-sm font-medium text-zinc-300 mb-4">{t('imbalanceMetrics')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={paradoxData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="ratio" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', color: '#e4e4e7', fontSize: 11 }}
                  formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                <ReferenceLine y={50} stroke="#52525b" strokeDasharray="4 4" strokeWidth={1} />
                <Line type="monotone" dataKey="Naive accuracy" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: '#f59e0b', r: 4 }} />
                <Line type="monotone" dataKey="Classifier accuracy" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 4 }} />
                <Line type="monotone" dataKey="F1 Score" stroke="#f43f5e" strokeWidth={2.5} dot={{ fill: '#f43f5e', r: 4 }} />
                <Line type="monotone" dataKey="Recall" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metrics table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 overflow-x-auto">
          <p className="text-sm font-semibold text-zinc-300 mb-4">{t('imbalanceMetrics')}</p>
          <table className="w-full text-xs text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Ratio</th>
                <th className="text-right py-2 px-3 text-orange-400">Naive Acc.</th>
                <th className="text-right py-2 px-3 text-violet-400">Accuracy</th>
                <th className="text-right py-2 px-3 text-blue-400">Precision</th>
                <th className="text-right py-2 px-3 text-emerald-400">Recall</th>
                <th className="text-right py-2 px-3 text-rose-400">F1</th>
                <th className="text-right py-2 pl-3 text-yellow-400">AUC</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(d => (
                <tr key={d.label} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="py-2 pr-4 font-mono font-bold text-zinc-300">{d.label}</td>
                  <td className="text-right py-2 px-3 font-mono text-orange-400">{d.naiveAccuracy}%</td>
                  <td className="text-right py-2 px-3 font-mono text-violet-400">{d.accuracy}%</td>
                  <td className="text-right py-2 px-3 font-mono text-blue-400">{d.precision}%</td>
                  <td className="text-right py-2 px-3 font-mono text-emerald-400">{d.recall}%</td>
                  <td className="text-right py-2 px-3 font-mono text-rose-400">{d.f1}%</td>
                  <td className="text-right py-2 pl-3 font-mono text-yellow-400">{d.auc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  )
}
