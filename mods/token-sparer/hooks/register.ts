import type { Register, TurnUsage } from 'claude-code'

// =====================================================================
// token-sparer: two parts in one mod
//   Part 1: token meter. Sums the token usage of every turn, per agent
//           (main session, builder, code-reviewer, ...). /tokens shows it.
//   Part 2: output shortener. Shortens SUCCESSFUL test/build runs before
//           an agent reads them. Failures always stay complete.
// =====================================================================

// ---------- Part 1: token meter ----------

type Usage = {
  input: number // new input tokens (not from the cache)
  cacheWrite: number // input tokens written to the prompt cache
  cacheRead: number // input tokens served by the cache (much cheaper)
  output: number // tokens the model generated
  turns: number
}

type SessionRecord = {
  startedAt: string
  totals: Record<string, Usage>
  savedChars: number
  shortenedRuns: number
}

const MAIN = 'hauptsitzung'
const HISTORY_KEY = 'history'
const MAX_HISTORY = 10

// Module variables start over on a reload of the mod (not on a normal turn).
let totals: Record<string, Usage> = {}
let savedChars = 0
let shortenedRuns = 0
let startedAt = new Date().toISOString()
// agentId -> agent type ("builder", "code-reviewer", ...), learned at spawn
const agentTypes: Record<string, string> = {}

const emptyUsage = (): Usage => ({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0, turns: 0 })

// "Neu" leaves out cache reads: they are billed at a fraction of normal input,
// so counting them in full would overstate the real cost many times over.
const sum = (u: Usage) => u.input + u.cacheWrite + u.output

function addUsage(label: string, usage: TurnUsage) {
  const u = totals[label] ?? emptyUsage()
  u.input += usage.input_tokens
  u.cacheWrite += usage.cache_creation_input_tokens
  u.cacheRead += usage.cache_read_input_tokens
  u.output += usage.output_tokens
  u.turns += 1
  totals[label] = u
}

// 1234567 -> "1.2M", 45210 -> "45k"
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'k'
  return String(n)
}

function grandTotal(t: Record<string, Usage>): number {
  return Object.values(t).reduce((acc, u) => acc + sum(u), 0)
}

function statusLine(): string {
  const entries = Object.entries(totals).sort((a, b) => sum(b[1]) - sum(a[1]))
  const top = entries[0]
  if (!top) return 'Tokens: 0'
  const cached = Object.values(totals).reduce((acc, u) => acc + u.cacheRead, 0)
  return `Tokens neu ${fmt(grandTotal(totals))} (+${fmt(cached)} aus Cache) · am meisten: ${top[0]} ${fmt(sum(top[1]))}`
}

function table(t: Record<string, Usage>): string {
  const rows = Object.entries(t).sort((a, b) => sum(b[1]) - sum(a[1]))
  if (rows.length === 0) return 'Noch keine Token-Daten in dieser Sitzung.'
  const pad = (s: string, n: number) => s.padEnd(n)
  const num = (n: number) => fmt(n).padStart(7)
  const lines = [
    pad('Agent', 20) + '   Input  Cache+  Cache→  Output     Neu  Turns',
    ...rows.map(
      ([name, u]) =>
        pad(name, 20) +
        num(u.input) + ' ' + num(u.cacheWrite) + ' ' + num(u.cacheRead) + ' ' +
        num(u.output) + ' ' + num(sum(u)) + String(u.turns).padStart(7),
    ),
    pad('GESAMT', 20) + ' '.repeat(32) + num(grandTotal(t)),
  ]
  return lines.join('\n')
}

const LEGEND =
  'Input = neue Input-Tokens · Cache+ = in den Cache geschrieben · ' +
  'Cache→ = aus dem Cache gelesen (deutlich günstiger) · Output = erzeugte Tokens · ' +
  'Neu = Input + Cache+ + Output'

async function readHistory($: { store: { get: (k: string) => Promise<unknown> } }) {
  const raw = await $.store.get(HISTORY_KEY)
  return Array.isArray(raw) ? (raw as SessionRecord[]) : []
}

// ---------- Part 2: output shortener ----------

// Commands whose successful output is boilerplate for an agent.
const TEST_OR_BUILD =
  /\b(npm\s+(run\s+)?(test|build|typecheck)|npx\s+(vitest|tsc|vite\s+build)|vitest\s+run|tsc\s)/

// Segments of a chained command that change nothing about the output.
const NEUTRAL_SEGMENT = /^\s*cd\s/

// Every segment of `a && b; c | d` must be a test/build command (or a cd),
// so `npm test && git diff ...` keeps the diff complete.
function onlyTestOrBuild(command: string): boolean {
  return command
    .split(/&&|\|\||;|\|/)
    .filter(part => part.trim() !== '')
    .every(part => TEST_OR_BUILD.test(part) || NEUTRAL_SEGMENT.test(part))
}

// Never shorten when the agent clearly wants the details:
// - VOLL=1 in the command is a manual escape hatch,
// - a single test file is named (the playtester logs economy data that way),
// - --reporter or --verbose was chosen on purpose.
const KEEP_WHOLE = /\bVOLL=1\b|\.test\.ts\b|--reporter|--verbose/

// Anything that looks like a failure keeps the output complete.
const FAILURE = /\bfailed\b|\bFAIL\b|error TS\d+|\bError:|✗|×|ERR!/

// Lines worth keeping from a successful run.
// Warnings of a successful build ((!) chunk size, deprecations) are kept too.
const SUMMARY = /Test Files|^\s*Tests\s|Duration|✓ built in|built in \d|^> |\(!\)|warn/i

// Vitest prints console.log output as "stdout | file": that is data, keep it.
const HAS_CONSOLE_OUTPUT = /^(stdout|stderr) \| /m

const ANSI = /\u001b\[[0-9;]*m/g

const MIN_LINES = 15 // shorter output is not worth touching

// Returns the shortened text, or null when the output should stay as it is.
export function summarize(command: string, stdout: string): string | null {
  if (!TEST_OR_BUILD.test(command) || !onlyTestOrBuild(command) || KEEP_WHOLE.test(command)) return null
  const clean = stdout.replace(ANSI, '')
  if (FAILURE.test(clean) || HAS_CONSOLE_OUTPUT.test(clean)) return null
  const lines = clean.split('\n')
  if (lines.length < MIN_LINES) return null
  const kept = lines.filter(line => SUMMARY.test(line))
  // No recognisable summary: we do not understand this output, so keep it.
  if (!kept.some(line => /Test Files|^\s*Tests\s|built in/.test(line))) return null
  return [
    `[token-sparer: erfolgreicher Lauf gekürzt, ${lines.length} → ${kept.length} Zeilen. ` +
      'Fehler werden nie gekürzt. Volle Ausgabe: Befehl mit VOLL=1 davor erneut ausführen.]',
    ...kept,
  ].join('\n')
}

// ---------- hooks ----------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokens',
      description: 'Token-Verbrauch pro Agent anzeigen (verlauf | reset)',
      argumentHint: '[verlauf|reset]',
      immediate: true,
    })
    return next(e)
  })

  // Remember which agent type each subagent id belongs to.
  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.agentId) agentTypes[started.agentId] = e.subagentType
    return started
  }).catch(($, e, next) => next(e)) // if this hook breaks, the spawn still happens

  // Part 1: add up the usage of every finished turn.
  on('turn.complete', async ($, e, next) => {
    // Let the turn finish first; counting must never hold it up or break it.
    const done = await next(e)
    if (!e.usage) return done
    try {
      let label = MAIN
      if (e.agentId) {
        if (!agentTypes[e.agentId]) {
          // Spawned before the mod loaded: ask the engine once, then remember.
          const found = (await $.agent.list()).find(a => a.id === e.agentId)
          agentTypes[e.agentId] = found?.type ?? 'subagent'
        }
        label = agentTypes[e.agentId] ?? 'subagent'
      }
      addUsage(label, e.usage)
      $.ui.status(statusLine())

      // Keep this session in the history so runs can be compared later.
      const record: SessionRecord = { startedAt, totals, savedChars, shortenedRuns }
      const history = (await readHistory($)).filter(r => r.startedAt !== startedAt)
      await $.store.set(HISTORY_KEY, [...history, record].slice(-MAX_HISTORY))
    } catch {
      // A failed count only loses this one entry.
    }
    return done
  })

  // Part 2: shorten successful test and build output, in every agent.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    // Refused or failed calls are passed on untouched.
    if (ran.deny !== undefined || ran.isError) return ran
    const short = summarize(e.command, ran.result.stdout)
    if (short === null) return ran
    savedChars += ran.result.stdout.length - short.length
    shortenedRuns += 1
    return { result: { ...ran.result, stdout: short } }
  }).catch(($, e, next) => next(e)) // if shortening breaks, the agent gets the full output

  on('command.run', { command: 'tokens' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'reset') {
      totals = {}
      savedChars = 0
      shortenedRuns = 0
      startedAt = new Date().toISOString()
      $.ui.status(undefined)
      return { text: 'Token-Zähler zurückgesetzt.' }
    }

    if (arg === 'verlauf') {
      const history = await readHistory($)
      if (history.length === 0) return { text: 'Noch kein Verlauf gespeichert.' }
      const blocks = history.map(
        r =>
          `── Sitzung ab ${r.startedAt.slice(0, 16).replace('T', ' ')} UTC · ` +
          `${r.shortenedRuns} Läufe gekürzt (~${fmt(Math.round(r.savedChars / 4))} Tokens gespart)\n` +
          table(r.totals),
      )
      return { text: blocks.join('\n\n') }
    }

    // Rough rule of thumb: about 4 characters per token.
    const saved = `Gekürzt: ${shortenedRuns} Läufe, ca. ${fmt(Math.round(savedChars / 4))} Tokens pro Lesen gespart.`
    return { text: `${table(totals)}\n\n${LEGEND}\n${saved}` }
  })
}
