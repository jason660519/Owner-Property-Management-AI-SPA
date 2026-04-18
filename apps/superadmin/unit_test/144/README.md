# Unit Tests — Row 144 People DB Dataset Tree

See [tdd-people-db-dataset-tree-20260417.md](../../../project-process/features/tdd-people-db-dataset-tree-20260417.md) for full test plan.

## Scope

- `DatasetTreePanel.test.tsx` — tree render + checkbox cascade
- `DatasetTreePanel.scope-hint.test.tsx` — scope hint warning banner
- `SourcesAdminPage.test.tsx` — dataset rename / merge confirmation modal

## Related Backend Tests

Backend unit tests live in `backend/ocr_service/tests/unit/`:
- `test_people_db_dataset_tree.py`
- `test_address_normalizer.py`
- `test_dataset_admin.py`

## Seed Scripts

- `tools/people-db/seed-es-sample.sh` — single sample (existing)
- `tools/people-db/seed-hierarchy-sample.sh` — 3-level hierarchy fixture (to be added in Sprint 1)
