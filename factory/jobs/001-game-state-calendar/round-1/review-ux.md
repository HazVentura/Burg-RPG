VERDICT: PASS

## Findings
- [minor] src/sim/calendar.ts: getCalendar throws a RangeError for an invalid state (unreachable for valid states). No player-facing impact now. Fix: when saving/loading arrives, validate input at that boundary and show a German error with role="alert".

## Checked
- Scope: the job is sim-core only. src/ui/ and src/text/de.ts are unchanged, as the spec requires. There is no player-visible flow, error state or accessibility surface to regress.
- The existing page (title and tagline) is untouched.
- Calendar values (year, season, day, hour) are exposed in the shape the later clock UI needs. Season names are English keys, and German names are explicitly out of scope.
