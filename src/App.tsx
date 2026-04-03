// SPDX-License-Identifier: Apache-2.0
import { useEffect, useState } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import { useLanguage } from './context/LanguageContext'
import TranslationWidget from './components/TranslationWidget'
import Hero from './components/Hero'
import ConfusionMatrix from './components/ConfusionMatrix'
import ThresholdAnalysis from './components/ThresholdAnalysis'
import ROCCurve from './components/ROCCurve'
import PRCurve from './components/PRCurve'
import ClassImbalance from './components/ClassImbalance'
import SMOTEResampling from './components/SMOTEResampling'
import References from './components/References'
import Footer from './components/Footer'

const SECTIONS = [
  { id: 'matrix',    navKey: 'navMatrix'    },
  { id: 'threshold', navKey: 'navThreshold' },
  { id: 'roc',       navKey: 'navROC'       },
  { id: 'pr',        navKey: 'navPR'        },
  { id: 'imbalance', navKey: 'navImbalance' },
  { id: 'smote',     navKey: 'navSMOTE'     },
] as const

function SectionNav() {
  const { t } = useLanguage()
  const [active, setActive] = useState('matrix')

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id) },
        { rootMargin: '-30% 0px -60% 0px' },
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <nav className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto scrollbar-hide py-2 pl-28">
        {SECTIONS.map(({ id, navKey }) => (
          <a key={id} href={`#${id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              active === id
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}>
            {t(navKey)}
          </a>
        ))}
      </div>
    </nav>
  )
}

function AppInner() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <TranslationWidget />
      <Hero />
      <SectionNav />
      <main>
        <ConfusionMatrix />
        <ThresholdAnalysis />
        <ROCCurve />
        <PRCurve />
        <ClassImbalance />
        <SMOTEResampling />
        <References />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </ThemeProvider>
  )
}
