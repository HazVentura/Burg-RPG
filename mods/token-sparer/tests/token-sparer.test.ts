import { expect, test } from 'claude-code/testing'

// A successful `npm test` run as Vitest prints it (shortened to 20 files).
const files = Array.from({ length: 20 }, (_, i) => ` ✓ tests/file${i}.test.ts (12 tests) 8ms`)
const PASS = [
  '',
  '> burg-rpg@0.1.0 test',
  '> vitest run',
  '',
  ' RUN  v5.0.5 /home/hassanventura/projects/burg-rpg',
  '',
  ...files,
  '',
  ' Test Files  20 passed (20)',
  '      Tests  375 passed (375)',
  '   Start at  10:00:00',
  '   Duration  2.31s',
].join('\n')

const FAIL = PASS.replace(' ✓ tests/file3.test.ts (12 tests) 8ms', ' ❯ tests/file3.test.ts (12 tests | 1 failed) 9ms')
  .replace('Tests  375 passed (375)', 'Tests  1 failed | 374 passed (375)')

const PLAYTEST = PASS.replace(' ✓ tests/file0.test.ts', 'stdout | tests/_playtest.test.ts\nTag 30: Brot 12, Wasser 40\n ✓ tests/file0.test.ts')

const bash = (stdout: string) => () => ({ result: { stdout, stderr: '', interrupted: false } })

test('a successful test run is shortened to its summary', async ($, on) => {
  on('tool.call', bash(PASS))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  if (!('result' in ran) || ran.isError) throw new Error('expected a result')
  const out = (ran.result as { stdout: string }).stdout
  expect(out).toContain('token-sparer: erfolgreicher Lauf gekürzt')
  expect(out).toContain('Tests  375 passed (375)')
  expect(out).not.toContain('file7.test.ts')
})

test('the gate command (test and build chained) is shortened too', async ($, on) => {
  on('tool.call', bash(PASS + '\n\n> burg-rpg@0.1.0 build\nvite v8.3.4 building\n✓ built in 812ms'))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test && npm run build' })
  const out = (ran.result as { stdout: string }).stdout
  expect(out).toContain('gekürzt')
  expect(out).toContain('✓ built in 812ms')
})

test('a failing run stays complete', async ($, on) => {
  on('tool.call', bash(FAIL))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect((ran.result as { stdout: string }).stdout).toBe(FAIL)
})

test('console output of the playtester stays complete', async ($, on) => {
  on('tool.call', bash(PLAYTEST))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npx vitest run' })
  expect((ran.result as { stdout: string }).stdout).toBe(PLAYTEST)
})

test('a single named test file stays complete', async ($, on) => {
  on('tool.call', bash(PASS))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npx vitest run tests/_playtest.test.ts' })
  expect((ran.result as { stdout: string }).stdout).toBe(PASS)
})

test('VOLL=1 and other commands stay complete', async ($, on) => {
  on('tool.call', bash(PASS))
  const voll = await $.tool.call({ tool: 'Bash', command: 'VOLL=1 npm test' })
  expect((voll.result as { stdout: string }).stdout).toBe(PASS)
  const diff = await $.tool.call({ tool: 'Bash', command: 'git diff main...factory/015-x' })
  expect((diff.result as { stdout: string }).stdout).toBe(PASS)
})

test('/tokens sums usage per agent type', async ($, on) => {
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))

  await $.agent.spawn({
    prompt: 'Build job 015', subagentType: 'builder', description: 'build', tool_use_id: 'u1',
    provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: false, fork: false,
  })
  const usage = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 20000, cache_creation_input_tokens: 3000, model: 'claude-opus-5-5' }
  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' as const, usage }
  await $.turn.complete({ ...turn, turnId: 't1', agentId: 'a1' })
  await $.turn.complete({ ...turn, turnId: 't2', agentId: 'a1' })
  await $.turn.complete({ ...turn, turnId: 't3' })

  const shown = await $.command.run({
    command: 'tokens', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 },
  })
  expect(shown.text).toContain('builder')
  expect(shown.text).toContain('hauptsitzung')
  // builder: 2 turns x (1000 + 3000 + 500) new tokens = 9k; cache reads listed apart
  expect(shown.text).toMatch(/builder\s+2k\s+6k\s+40k\s+1k\s+9k\s+2/)
})

test('a run that exits non-zero (isError) is passed on untouched', async ($, on) => {
  on('tool.call', () => ({ isError: true, result: FAIL, text: FAIL }))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(ran.isError).toBe(true)
  expect(ran.text).toBe(FAIL)
})

test('a chained git diff keeps the whole output', async ($, on) => {
  on('tool.call', bash(PASS))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test && git diff main...factory/015-x' })
  expect((ran.result as { stdout: string }).stdout).toBe(PASS)
})

test('cd into the worktree before npm test is still shortened', async ($, on) => {
  on('tool.call', bash(PASS))
  const ran = await $.tool.call({ tool: 'Bash', command: 'cd .worktrees/015-x && npm test' })
  expect((ran.result as { stdout: string }).stdout).toContain('gekürzt')
})

test('build warnings survive the shortening', async ($, on) => {
  on('tool.call', bash(PASS + '\n(!) Some chunks are larger than 500 kB after minification\n✓ built in 900ms'))
  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test && npm run build' })
  expect((ran.result as { stdout: string }).stdout).toContain('(!) Some chunks are larger')
})
