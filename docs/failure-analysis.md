# Failure analysis

The engine walks the directed dependency graph built from relationships. Seeds are items you mark failed (saved status) or simulate in What-if (not saved).

1. Build dependency edges from relationship types.
2. Breadth-first walk downstream (things that depend on the seeds).
3. Combine node impact with edge impact: hard + degraded = degraded; any `none` stops that hop.
4. Systems are hard-affected if any member is a seed or hard-affected; otherwise degraded if any member is degraded.
5. Alternatives: recorded `backs-up` links, `spareForId` items, additional `protects` sources, and sibling power/network endpoints in the same system that were not affected.

Custom relations with `carriesFailure` behave like depends-on.

Removed relationships and unplugged cables are treated as missing edges for that run only.

This is **not** electrical, structural, or safety engineering. It repeats only what you typed.
