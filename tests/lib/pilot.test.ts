import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  corpusHash,
  evaluatePilot,
  loadCorpus,
  modelInputs,
  reportMarkdown,
  runHash,
  sha256,
  validateCorpus,
  type Corpus,
  type FactReview,
  type Observation,
  type PilotCase,
  type PilotRun,
  type ReviewFile,
} from '@/lib/evaluation/pilot'

// These are accounting and integrity controls, not captured model responses.
const referenceText = 'Artículo 1. Debe presentarse una declaración.\nArtículo 2. El plazo es de veinte días.'

function pilotCase(id: string, expectedOutcome: PilotCase['expectedOutcome']): PilotCase {
  return {
    id,
    title: `Documento sintético ${id}`,
    source: 'BOE',
    sourceUrl: `https://www.boe.es/ejemplo/${id}`,
    publicationDate: '2024-01-01',
    retrievedAt: '2026-09-30',
    textPath: `eval/pilot/sources/${id}.txt`,
    sha256: sha256(referenceText),
    inputKind: expectedOutcome === 'needs_review' ? 'summary_only' : 'full_text',
    cohort: 'calibration',
    expectedOutcome,
    reason: 'Referencia sintética reservada al evaluador.',
    reference: { status: 'proposed', reviewer: null, reviewedAt: null },
    checks: [{
      id: 'declaracion',
      question: '¿Qué trámite se exige?',
      expectedAnswer: 'Debe presentarse una declaración.',
      locator: 'Artículo 1',
      quote: 'Debe presentarse una declaración.',
    }, {
      id: 'plazo',
      question: '¿Cuál es el plazo?',
      expectedAnswer: 'Veinte días.',
      locator: 'Artículo 2',
      quote: 'El plazo es de veinte días.',
    }],
  }
}

function fixture(): Corpus {
  return {
    version: 'regtrack-pilot-1',
    scope: 'Corpus sintético para probar el evaluador, sin medir un modelo.',
    cases: [
      pilotCase('relevante-a', 'alert'),
      pilotCase('relevante-b', 'alert'),
      pilotCase('relevante-c', 'alert'),
      pilotCase('irrelevante', 'discard'),
      pilotCase('insuficiente', 'needs_review'),
    ],
  }
}

function observation(caseId: string, outcome: Observation['outcome']): Observation {
  return {
    caseId,
    outcome,
    classification: { es_relevante: outcome === 'alert' },
    impact: outcome === 'alert' ? { resumen: 'Debe presentarse una declaración.' } : null,
    ...(outcome === 'error' ? { error: 'Fallo simulado de proveedor' } : {}),
    elapsedMs: 25,
  }
}

function simulatedRun(corpus: Corpus, observations: Observation[]): PilotRun {
  return {
    schemaVersion: 1,
    mode: 'simulated',
    corpusHash: corpusHash(corpus),
    startedAt: '2026-09-30T12:00:00.000Z',
    finishedAt: '2026-09-30T12:00:01.000Z',
    provenance: { purpose: 'unit_test_only' },
    observations,
  }
}

function review(overrides: Partial<FactReview> = {}): FactReview {
  return {
    caseId: 'relevante-a',
    checkId: 'declaracion',
    verdict: 'pass',
    reviewer: 'Revisor de prueba',
    reviewedAt: '2026-09-30T12:05:00.000Z',
    note: 'Juicio sintético para comprobar la contabilidad de revisiones.',
    outputQuote: 'Debe presentarse una declaración.',
    ...overrides,
  }
}

function reviewsFor(corpus: Corpus, run: PilotRun, reviews: FactReview[]): ReviewFile {
  return { corpusHash: corpusHash(corpus), runHash: runHash(run), reviews }
}

describe('pilot evaluation accounting', () => {
  it('reports no measured quality without observations, with every factual check still pending', () => {
    const report = evaluatePilot(fixture())

    expect(report.status).toBe('not_run')
    expect(report.mode).toBe('not_run')
    expect(report.observedCases).toBe(0)
    expect(report.metrics.alertRecall).toBeNull()
    expect(report.metrics.alertPrecision).toBeNull()
    expect(report.metrics.insufficientTextHandling).toBeNull()
    expect(report.metrics.factualAccuracy.value).toBeNull()
    expect(report.metrics.factualReviewCoverage).toEqual({ numerator: 0, denominator: 10, value: 0 })
    expect(report.factualChecks).toEqual({ total: 10, passed: 0, failed: 0, pending: 10 })
    expect(report.latencyMs).toBeNull()
    expect(report.actualCost).toBeNull()
    expect(reportMarkdown(report)).toContain('No medido')
    expect(reportMarkdown(report)).not.toContain('100.0%')
  })

  it('retains a provider error and an absent relevant case in the recall denominator', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [
      observation('relevante-a', 'alert'),
      observation('relevante-b', 'error'),
      observation('irrelevante', 'discard'),
      observation('insuficiente', 'needs_review'),
    ])
    const report = evaluatePilot(corpus, run)

    expect(report.status).toBe('incomplete')
    expect(report.metrics.alertRecall).toEqual({ numerator: 1, denominator: 3, value: 1 / 3 })
    expect(report.missing).toEqual(['relevante-c'])
    expect(report.errors).toEqual(['relevante-b'])
    expect(report.relevantWithoutAlert).toEqual(['relevante-b', 'relevante-c'])
    expect(report.metrics.factualAccuracy.value).toBeNull()
    expect(report.factualChecks.pending).toBe(10)
  })

  it('leaves precision undefined when the run produces no alerts', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, corpus.cases.map(item => observation(item.id, 'discard')))
    const report = evaluatePilot(corpus, run)

    expect(report.metrics.alertPrecision).toEqual({ numerator: 0, denominator: 0, value: null })
    expect(report.metrics.alertRecall).toEqual({ numerator: 0, denominator: 3, value: 0 })
    expect(report.metrics.insufficientTextHandling).toEqual({ numerator: 0, denominator: 1, value: 0 })
    expect(report.cases.find(item => item.caseId === 'insuficiente')).toMatchObject({
      expected: 'needs_review', actual: 'discard',
    })
  })

  it('counts unsupported alerts against precision, including an alert on insufficient text', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [
      observation('relevante-a', 'alert'),
      observation('irrelevante', 'alert'),
      observation('insuficiente', 'alert'),
    ])
    const report = evaluatePilot(corpus, run)

    expect(report.metrics.alertPrecision).toEqual({ numerator: 1, denominator: 3, value: 1 / 3 })
    expect(report.falseAlerts).toEqual(['irrelevante', 'insuficiente'])
    expect(report.metrics.insufficientTextHandling?.value).toBe(0)
  })

  it('keeps a perfect synthetic run visibly simulated and subject to factual and reference review', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, corpus.cases.map(item => observation(item.id, item.expectedOutcome)))
    const report = evaluatePilot(corpus, run)

    expect(report.mode).toBe('simulated')
    expect(report.status).toBe('requires_review')
    expect(report.referencesPending).toBe(5)
    expect(report.metrics.alertRecall?.value).toBe(1)
    expect(report.metrics.factualAccuracy.value).toBeNull()
    expect(report.factualChecks.pending).toBe(10)
    expect(report.actualCost).toBeNull()
    expect(reportMarkdown(report)).toContain('**simulated**')
  })

  it('does not interpret an empty captured run as measured zero accuracy', () => {
    const corpus = fixture()
    const report = evaluatePilot(corpus, simulatedRun(corpus, []))
    expect(report.status).toBe('not_run')
    expect(report.mode).toBe('simulated')
    expect(report.metrics.alertRecall).toBeNull()
  })

  it('counts only explicit reviewed checks, preserving failed omissions and all pending checks', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [observation('relevante-a', 'alert')])
    const reviews = reviewsFor(corpus, run, [
      review(),
      review({ checkId: 'plazo', verdict: 'fail', outputQuote: null, note: 'El resultado omite el plazo.' }),
    ])
    const report = evaluatePilot(corpus, run, reviews)

    expect(report.metrics.factualAccuracy).toEqual({ numerator: 1, denominator: 2, value: 0.5 })
    expect(report.metrics.factualReviewCoverage).toEqual({ numerator: 2, denominator: 10, value: 0.2 })
    expect(report.factualChecks).toEqual({ total: 10, passed: 1, failed: 1, pending: 8 })
    expect(report.referencesPending).toBe(5)
  })
})

describe('pilot run and review integrity', () => {
  it('keeps existing runs usable when reference approval metadata changes without changing answers', () => {
    const corpus = fixture()
    const originalHash = corpusHash(corpus)
    const run = simulatedRun(corpus, [observation('relevante-a', 'alert')])
    const reviews = reviewsFor(corpus, run, [review()])
    corpus.cases[0].reference = {
      status: 'approved', reviewer: 'Revisor identificado', reviewedAt: '2026-10-01T09:00:00.000Z',
    }

    expect(corpusHash(corpus)).toBe(originalHash)
    expect(evaluatePilot(corpus, run, reviews).referencesPending).toBe(4)
  })

  it('rejects results tied to a different or subsequently edited corpus', () => {
    const corpus = fixture()
    const originalHash = corpusHash(corpus)
    const run = simulatedRun(corpus, [observation('relevante-a', 'alert')])
    corpus.cases[0].checks[0].expectedAnswer = 'Referencia corregida tras capturar los resultados.'
    expect(corpusHash(corpus)).not.toBe(originalHash)
    expect(() => evaluatePilot(corpus, run)).toThrow(/corpus/)
  })

  it.each(['unknown', 'duplicate'] as const)('rejects %s case results rather than inflating sample size', kind => {
    const corpus = fixture()
    const first = observation('relevante-a', 'alert')
    const run = simulatedRun(corpus, [first, kind === 'unknown' ? observation('ajeno', 'alert') : first])
    expect(() => evaluatePilot(corpus, run)).toThrow(/ajeno o duplicado/)
  })

  it.each([
    { outcome: 'success' as Observation['outcome'] },
    { elapsedMs: -1 },
    { elapsedMs: Number.NaN },
  ])('rejects malformed result metadata: %j', metadata => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [{ ...observation('relevante-a', 'alert'), ...metadata }])
    expect(() => evaluatePilot(corpus, run)).toThrow(/Resultado inválido/)
  })

  it('requires reviews to refer to the exact captured run as well as the corpus', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [observation('relevante-a', 'alert')])
    const reviews = reviewsFor(corpus, run, [review()])
    const changed = structuredClone(run)
    changed.observations[0].impact = { resumen: 'Una respuesta diferente.' }

    expect(() => evaluatePilot(corpus, changed, reviews)).toThrow(/otra ejecución o corpus/)
    expect(() => evaluatePilot(corpus, undefined, reviews)).toThrow(/otra ejecución o corpus/)
    expect(() => evaluatePilot(corpus, run, { ...reviews, corpusHash: 'different' })).toThrow(/otra ejecución o corpus/)
  })

  it.each([
    { checkId: 'inexistente' },
    { caseId: 'relevante-b' },
    { reviewer: ' ' },
    { reviewedAt: '' },
    { note: ' ' },
    { verdict: 'pending' as FactReview['verdict'] },
    { outputQuote: 'Una obligación que no aparece en la respuesta.' },
  ])('rejects an unverifiable or incomplete factual review: %j', overrides => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [observation('relevante-a', 'alert')])
    expect(() => evaluatePilot(corpus, run, reviewsFor(corpus, run, [review(overrides)]))).toThrow()
  })

  it('rejects double counting the same factual review', () => {
    const corpus = fixture()
    const run = simulatedRun(corpus, [observation('relevante-a', 'alert')])
    expect(() => evaluatePilot(corpus, run, reviewsFor(corpus, run, [review(), review()]))).toThrow(/duplicada/)
  })

  it('accepts a quoted numeric field from the output even when the prose omits that value', () => {
    const corpus = fixture()
    const result = observation('relevante-a', 'alert')
    result.impact = { resumen: 'Debe presentarse una declaración.', plazo_adaptacion: 20 }
    const run = simulatedRun(corpus, [result])
    const reviews = reviewsFor(corpus, run, [review({
      checkId: 'plazo', outputQuote: '20', note: 'La salida expresa el plazo en su campo numérico.',
    })])

    const report = evaluatePilot(corpus, run, reviews)
    expect(report.factualChecks.passed).toBe(1)
    expect(report.cases[0].checks.find(check => check.id === 'plazo')?.verdict).toBe('pass')
  })
})

describe('pilot input integrity and blinding', () => {
  it('validates all pinned real inputs and their literal evidence offline', () => {
    const { corpus, texts } = loadCorpus()
    expect(corpus.cases).toHaveLength(8)
    expect(corpus.cases.reduce((total, item) => total + item.checks.length, 0)).toBe(27)
    expect(texts.size).toBe(corpus.cases.length)
    expect(corpus.cases.filter(item => item.expectedOutcome === 'alert')).toHaveLength(4)
    expect(corpus.cases.filter(item => item.expectedOutcome === 'discard')).toHaveLength(3)
    expect(corpus.cases.filter(item => item.expectedOutcome === 'needs_review')).toHaveLength(1)
  })

  it('normalizes checkout CRLF before verifying pinned text and exporting model input', () => {
    const corpus = fixture()
    const texts = validateCorpus(corpus, () => referenceText.replace(/\n/g, '\r\n'))
    expect(texts.get('relevante-a')).toBe(referenceText)
  })

  it('rejects changed source content even when the reference quote still appears', () => {
    expect(() => validateCorpus(fixture(), () => referenceText + '\nContenido cambiado.')).toThrow(/SHA/)
  })

  it('rejects a reference quote absent from the exact model input', () => {
    const corpus = fixture()
    corpus.cases[0].checks[0].quote = 'No aparece en el documento.'
    expect(() => validateCorpus(corpus, () => referenceText)).toThrow(/Cita ausente/)
  })

  it('rejects approval without an identified reviewer and review date', () => {
    const corpus = fixture()
    corpus.cases[0].reference.status = 'approved'
    expect(() => validateCorpus(corpus, () => referenceText)).toThrow(/Aprobación sin/)
  })

  it('exports document inputs without answers, decisions, review metadata or evaluation reasons', () => {
    const corpus = fixture()
    const texts = validateCorpus(corpus, () => referenceText)
    const inputs = modelInputs(corpus, texts)

    expect(inputs).toHaveLength(corpus.cases.length)
    expect(inputs[0]).toEqual({
      caseId: 'relevante-a', titulo: 'Documento sintético relevante-a', fuente: 'BOE', texto: referenceText,
    })
    for (const input of inputs) {
      expect(Object.keys(input).sort()).toEqual(['caseId', 'fuente', 'texto', 'titulo'])
    }
    expect(JSON.stringify(inputs)).not.toContain('Referencia sintética reservada al evaluador.')
    expect(JSON.stringify(inputs)).not.toContain('expectedOutcome')
    expect(JSON.stringify(inputs)).not.toContain('expectedAnswer')
  })
})

describe('pilot offline CLI', () => {
  it('preserves a completed review template when importing it back into its own output directory', () => {
    const temporaryRoot = realpathSync(tmpdir())
    const directory = mkdtempSync(join(temporaryRoot, 'regtrack-pilot-cli-'))
    const invoke = (...args: string[]) => execFileSync(process.execPath, [
      '--import', 'tsx', 'actions/evaluate-pilot.ts', '--out', directory, ...args,
    ], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 20_000,
      env: { ...process.env, ANTHROPIC_API_KEY: '' },
    })

    try {
      invoke()
      const initial = JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8'))
      expect(initial.mode).toBe('not_run')
      expect(initial.observedCases).toBe(0)

      const { corpus } = loadCorpus()
      const item = corpus.cases[0]
      const outputQuote = 'Una salida simulada para comprobar que la revisión se conserva.'
      const result = observation(item.id, item.expectedOutcome)
      result.impact = { resumen: outputQuote }
      const run = simulatedRun(corpus, [result])
      const resultsPath = join(directory, 'imported-run.json')
      writeFileSync(resultsPath, JSON.stringify(run, null, 2) + '\n')
      invoke('--results', resultsPath)

      const reviewsPath = join(directory, `reviews-template-${runHash(run).slice(0, 12)}.json`)
      const template = JSON.parse(readFileSync(reviewsPath, 'utf8')) as ReviewFile
      expect(template.reviews).toEqual([])
      template.reviews.push(review({
        caseId: item.id,
        checkId: item.checks[0].id,
        note: 'Revisión sintética del flujo de archivos; no mide un modelo ni valida la ley.',
        outputQuote,
      }))
      const savedReview = JSON.stringify(template, null, 2) + '\n'
      writeFileSync(reviewsPath, savedReview)

      invoke('--results', resultsPath, '--reviews', reviewsPath)

      expect(readFileSync(reviewsPath, 'utf8')).toBe(savedReview)
      const report = JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8'))
      expect(report.mode).toBe('simulated')
      expect(report.observedCases).toBe(1)
      expect(report.factualChecks.passed).toBe(1)
      expect(report.factualChecks.pending).toBe(26)
    } finally {
      // Only delete the specific immediate child created by this test, after resolving it.
      const target = realpathSync(directory)
      const child = relative(temporaryRoot, target)
      if (target !== resolve(directory) || isAbsolute(child) || child.includes(sep) || !child.startsWith('regtrack-pilot-cli-')) {
        throw new Error(`Refusing to remove an unexpected temporary directory: ${target}`)
      }
      rmSync(target, { recursive: true, force: true })
    }
  }, 30_000)
})
