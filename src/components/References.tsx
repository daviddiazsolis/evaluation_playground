// SPDX-License-Identifier: Apache-2.0
import { motion } from 'motion/react'
import { BookOpen, ExternalLink } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const REF_LINKS = [
  'https://scikit-learn.org/stable/modules/model_evaluation.html',
  'https://arxiv.org/abs/1106.1813',
  'https://dl.acm.org/doi/10.1145/1143844.1143874',
  'https://developers.google.com/machine-learning/crash-course/classification',
]

export default function References() {
  const { t } = useLanguage()
  return (
    <section className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-rose-400" />
          {t('refTitle')}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Books</h3>
            {(['refBook1', 'refBook2'] as const).map(key => (
              <p key={key} className="text-sm text-zinc-400 leading-relaxed pl-3 border-l-2 border-zinc-700">
                {t(key)}
              </p>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Papers & Docs</h3>
            {(['refLink1', 'refLink2', 'refLink3', 'refLink4'] as const).map((key, i) => (
              <a key={key} href={REF_LINKS[i]} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-zinc-400 hover:text-rose-400 transition-colors leading-relaxed group">
                <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-rose-500/50 group-hover:text-rose-400" />
                {t(key)}
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
