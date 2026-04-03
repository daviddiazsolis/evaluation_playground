// SPDX-License-Identifier: Apache-2.0
// Canonical evaluation metrics — copy this file to all supervised learning sites

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfusionMatrix {
  tp: number; fp: number; fn: number; tn: number
}

export interface ClassificationMetrics {
  cm: ConfusionMatrix
  accuracy: number
  precision: number
  recall: number
  f1: number
  specificity: number
  fpr: number   // false positive rate (1 - specificity)
}

export interface ROCPoint { fpr: number; tpr: number; threshold: number }
export interface PRPoint  { precision: number; recall: number; threshold: number }

// ── Confusion matrix ──────────────────────────────────────────────────────────

export function confusionMatrix(yTrue: number[], yPred: number[]): ConfusionMatrix {
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (let i = 0; i < yTrue.length; i++) {
    const t = yTrue[i], p = yPred[i]
    if (t === 1 && p === 1) tp++
    else if (t === 0 && p === 1) fp++
    else if (t === 1 && p === 0) fn++
    else tn++
  }
  return { tp, fp, fn, tn }
}

// ── Derived metrics ───────────────────────────────────────────────────────────

export function metricsFromCM(cm: ConfusionMatrix): ClassificationMetrics {
  const { tp, fp, fn, tn } = cm
  const total = tp + fp + fn + tn
  const accuracy    = total > 0 ? (tp + tn) / total : 0
  const precision   = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall      = tp + fn > 0 ? tp / (tp + fn) : 0   // = TPR = sensitivity
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0
  const fpr         = 1 - specificity
  const f1          = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0
  return { cm, accuracy, precision, recall, f1, specificity, fpr }
}

export function metricsFromPredictions(yTrue: number[], yPred: number[]): ClassificationMetrics {
  return metricsFromCM(confusionMatrix(yTrue, yPred))
}

// ── ROC curve ─────────────────────────────────────────────────────────────────

/**
 * Compute ROC curve points by sweeping thresholds.
 * yScore: continuous classifier score (higher → predicts positive).
 */
export function rocCurve(yTrue: number[], yScore: number[]): ROCPoint[] {
  // Sort by descending score
  const pairs = yTrue.map((t, i) => ({ t, s: yScore[i] }))
    .sort((a, b) => b.s - a.s)

  const P = yTrue.filter(v => v === 1).length
  const N = yTrue.length - P

  const points: ROCPoint[] = [{ fpr: 0, tpr: 0, threshold: Infinity }]
  let tp = 0, fp = 0

  for (const { t, s } of pairs) {
    if (t === 1) tp++; else fp++
    points.push({
      fpr: N > 0 ? fp / N : 0,
      tpr: P > 0 ? tp / P : 0,
      threshold: s,
    })
  }
  // Deduplicate consecutive equal (fpr, tpr) pairs (same threshold ties)
  return points.filter((p, i) =>
    i === 0 || p.fpr !== points[i - 1].fpr || p.tpr !== points[i - 1].tpr,
  )
}

/** AUC via trapezoidal rule */
export function aucROC(points: ROCPoint[]): number {
  let area = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].fpr - points[i - 1].fpr
    const avgY = (points[i].tpr + points[i - 1].tpr) / 2
    area += dx * avgY
  }
  return Math.max(0, Math.min(1, area))
}

// ── Precision-Recall curve ────────────────────────────────────────────────────

export function prCurve(yTrue: number[], yScore: number[]): PRPoint[] {
  const pairs = yTrue.map((t, i) => ({ t, s: yScore[i] }))
    .sort((a, b) => b.s - a.s)

  const P = yTrue.filter(v => v === 1).length
  const points: PRPoint[] = []
  let tp = 0, fp = 0

  for (const { t, s } of pairs) {
    if (t === 1) tp++; else fp++
    const prec = tp + fp > 0 ? tp / (tp + fp) : 1
    const rec  = P > 0 ? tp / P : 0
    points.push({ precision: prec, recall: rec, threshold: s })
  }
  return points
}

/** Average Precision (area under PR curve via trapezoidal rule) */
export function averagePrecision(curve: PRPoint[]): number {
  let ap = 0
  for (let i = 1; i < curve.length; i++) {
    const dr = curve[i].recall - curve[i - 1].recall
    const avgP = (curve[i].precision + curve[i - 1].precision) / 2
    ap += dr * avgP
  }
  return Math.abs(ap)
}

// ── Threshold sweep ───────────────────────────────────────────────────────────

/** Compute all classification metrics at a given threshold on continuous scores */
export function metricsAtThreshold(
  yTrue: number[], yScore: number[], threshold: number,
): ClassificationMetrics {
  const yPred = yScore.map(s => (s >= threshold ? 1 : 0))
  return metricsFromPredictions(yTrue, yPred)
}

/** Sweep thresholds and return metrics at each */
export function thresholdSweep(
  yTrue: number[], yScore: number[], nSteps = 100,
): (ClassificationMetrics & { threshold: number })[] {
  const min = Math.min(...yScore)
  const max = Math.max(...yScore)
  return Array.from({ length: nSteps + 1 }, (_, i) => {
    const t = min + (i / nSteps) * (max - min)
    return { ...metricsAtThreshold(yTrue, yScore, t), threshold: t }
  })
}

// ── SMOTE (2D / n-D) ──────────────────────────────────────────────────────────

/** LCG-seeded random number generator */
function lcg(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** Euclidean distance */
function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0))
}

/**
 * SMOTE: Synthetic Minority Over-sampling Technique.
 * Generates `n` synthetic samples for the minority class.
 * Uses k=5 nearest neighbors and linear interpolation.
 */
export function smote(
  minoritySamples: number[][],
  n: number,
  k = 5,
  seed = 42,
): number[][] {
  const rand = lcg(seed)
  const synthetic: number[][] = []
  const needed = n

  if (minoritySamples.length < 2) return synthetic

  for (let i = 0; i < needed; i++) {
    const idx = Math.floor(rand() * minoritySamples.length)
    const sample = minoritySamples[idx]

    // Find k nearest neighbors
    const distances = minoritySamples
      .map((s, j) => ({ j, d: j === idx ? Infinity : euclidean(sample, s) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k)

    // Pick a random neighbor and interpolate
    const nnIdx = distances[Math.floor(rand() * k)].j
    const nn = minoritySamples[nnIdx]
    const λ = rand()
    synthetic.push(sample.map((v, f) => v + λ * (nn[f] - v)))
  }
  return synthetic
}

/** Random oversampling with replacement */
export function randomOversample(samples: number[][], n: number, seed = 42): number[][] {
  const rand = lcg(seed)
  return Array.from({ length: n }, () => samples[Math.floor(rand() * samples.length)])
}

/** Random undersampling */
export function randomUndersample(samples: number[][], n: number, seed = 42): number[][] {
  const rand = lcg(seed)
  const shuffled = [...samples].sort(() => rand() - 0.5)
  return shuffled.slice(0, n)
}
