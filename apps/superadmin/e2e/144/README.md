# E2E Tests — Row 144 People DB Dataset Tree

See [tdd-people-db-dataset-tree-20260417.md](../../../project-process/features/tdd-people-db-dataset-tree-20260417.md) for full test plan.

## Planned Specs

- `dataset-tree-navigation.spec.ts` — expand, select, scope hint verification
- `dataset-admin-rename.spec.ts` — rename propagates to search tree
- `person-detail-properties.spec.ts` — reverse lookup of properties by id_number
- `person-detail-relations.spec.ts` — relationship graph rendering

## Required Env

```
PLAYWRIGHT_SUPERADMIN_EMAIL=...
PLAYWRIGHT_SUPERADMIN_PASSWORD=...
```

## Prerequisites

1. Run `tools/people-db/seed-hierarchy-sample.sh` to populate 3-level dataset fixture.
2. Backend services running via `./start.sh all`.
