// SPDX-License-Identifier: Apache-2.0
// Synthetic datasets for Model Evaluation Playground

export interface ScoredSample {
  score: number       // classifier confidence score [0,1]
  label: number       // true label: 0 or 1
  features: number[]  // 2D features for scatter visualization
}

export interface ImbalancedDataset {
  id: string
  ratio: string          // display label e.g. "1:1", "1:10"
  majorityN: number
  minorityN: number
  samples: ScoredSample[]
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

function lcg(seed: number) {
  let s = seed
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff }
}

function normal(rand: () => number) {
  return () => {
    const u = rand() || 1e-10
    const v = rand() || 1e-10
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}

// ── Realistic classifier scores ──────────────────────────────────────────────
// Minority class (label=1): scores from Beta-like distribution centred at 0.7
// Majority class (label=0): scores centred at 0.3
// This gives an S-shaped ROC curve that looks realistic

function generateScores(
  majorityN: number,
  minorityN: number,
  seed: number,
): ScoredSample[] {
  const rand = lcg(seed)
  const n = normal(rand)
  const samples: ScoredSample[] = []

  // Majority class (label=0) — cluster near (−2, 0) in feature space
  for (let i = 0; i < majorityN; i++) {
    const x1 = -2 + n() * 1.2
    const x2 = n() * 1.2
    // Score: sigmoid-like transformation of linear combination
    const logit = 0.8 * x1 + 0.4 * x2 + 0.5
    const score = 1 / (1 + Math.exp(-logit * 0.5))
    samples.push({ score: Math.max(0.01, Math.min(0.99, score)), label: 0, features: [x1, x2] })
  }
  // Minority class (label=1) — cluster near (2, 0.5) in feature space
  for (let i = 0; i < minorityN; i++) {
    const x1 = 2 + n() * 1.0
    const x2 = 0.5 + n() * 1.0
    const logit = 0.8 * x1 + 0.4 * x2 + 0.5
    const score = 1 / (1 + Math.exp(-logit * 0.5))
    samples.push({ score: Math.max(0.01, Math.min(0.99, score)), label: 1, features: [x1, x2] })
  }
  // Shuffle
  return samples.sort(() => lcg(seed + 1)() - 0.5)
}

// ── Dataset generation ───────────────────────────────────────────────────────

function makeDataset(id: string, ratio: string, majorityN: number, minorityN: number, seed: number): ImbalancedDataset {
  return { id, ratio, majorityN, minorityN, samples: generateScores(majorityN, minorityN, seed) }
}

export const DATASETS: ImbalancedDataset[] = [
  makeDataset('balanced',     '1:1',  150, 150, 42),
  makeDataset('mild',         '1:5',  250,  50, 77),
  makeDataset('imbalanced',   '1:10', 300,  30, 99),
  makeDataset('extreme',      '1:20', 400,  20, 123),
]

export const DATASET_MAP: Record<string, ImbalancedDataset> = Object.fromEntries(
  DATASETS.map(d => [d.id, d]),
)

// ── Classifier archetypes for ROC/PR demo ────────────────────────────────────

export interface ClassifierArchetype {
  id: string
  labelKey: string
  /** AUC value (approximate, for reference) */
  auc: number
  /** Score generator: returns [yTrue, yScore] */
  generate: () => { yTrue: number[]; yScore: number[] }
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const r = lcg(seed)
  return [...arr].sort(() => r() - 0.5)
}

export const CLASSIFIERS: ClassifierArchetype[] = [
  {
    id: 'perfect',
    labelKey: 'rocPerfect',
    auc: 1.0,
    generate: () => {
      const n = 200
      const yTrue = [...Array(n / 2).fill(1), ...Array(n / 2).fill(0)]
      const yScore = yTrue.map(t => t === 1 ? 0.85 + lcg(1)() * 0.14 : 0.01 + lcg(2)() * 0.14)
      return { yTrue: shuffleWithSeed(yTrue, 10), yScore: shuffleWithSeed(yScore, 10) }
    },
  },
  {
    id: 'good',
    labelKey: 'rocGood',
    auc: 0.85,
    generate: () => {
      const ds = DATASET_MAP['balanced']
      return { yTrue: ds.samples.map(s => s.label), yScore: ds.samples.map(s => s.score) }
    },
  },
  {
    id: 'mediocre',
    labelKey: 'rocMediocre',
    auc: 0.65,
    generate: () => {
      const r = lcg(55)
      const n = 200
      const yTrue = [...Array(n / 2).fill(1), ...Array(n / 2).fill(0)]
      const nn = (seed: number) => { const g = normal(lcg(seed)); return g() }
      const yScore = yTrue.map((t, i) => {
        const base = t === 1 ? 0.6 : 0.4
        return Math.max(0.01, Math.min(0.99, base + nn(i) * 0.35))
      })
      void r
      return { yTrue: shuffleWithSeed(yTrue, 20), yScore: shuffleWithSeed(yScore, 20) }
    },
  },
  {
    id: 'random',
    labelKey: 'rocRandom',
    auc: 0.5,
    generate: () => {
      const r = lcg(33)
      const n = 200
      const yTrue = [...Array(n / 2).fill(1), ...Array(n / 2).fill(0)]
      const yScore = Array.from({ length: n }, () => r())
      return { yTrue: shuffleWithSeed(yTrue, 30), yScore: shuffleWithSeed(yScore, 30) }
    },
  },
]
