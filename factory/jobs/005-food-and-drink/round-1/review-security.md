VERDICT: PASS

## Findings
- [minor] src/sim/needs.ts:58: `needs[good] - NEED_DROP_PER_DAY_WITHOUT` is clamped only at the bottom, and a fed need is set to NEED_MAX, so need values cannot become NaN or go out of range from a valid state. A non-numeric `needs` value in a future imported save would still produce NaN, and NaN breaks the serving-order comparator. No loader exists yet. When save import arrives (step 7), validate `needs.bread`/`needs.water` as finite numbers within NEED_MIN..NEED_MAX. Not a blocker now.

## Checked
- Untrusted input: the change reads no external data (no localStorage, file import, URL params or JSON.parse in src/).
- Output escaping: no changes in src/ui/, src/main.ts or src/text/de.ts, so no new HTML rendering.
- Links/URLs: none built or changed.
- Resource use: consumption runs once per 24 ticks, O(n log n) over residents, with no growing in-memory state. Storage cannot go below 0 (a ration is taken only if `storage >= ration`), and needs are clamped at NEED_MIN.
- Shared state: inputs are copied (storage spread, needs spread per resident), not mutated. Single-threaded, so no races.
- Import cycle residents.ts <-> needs.ts: needs.ts imports only the `Resident` type, so there is no runtime cycle.
- Secrets/debug output: none (no console or debugger statements in src/). `npm test` passes, 150/150.
