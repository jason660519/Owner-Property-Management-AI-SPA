# Access Matrix Design - File Naming & Organization Guidelines

## 1. File Location
All documentation related to Access Matrix, Permissions, and Roles must be stored in:
`docs/access-matrix-design-guidelines-and-process/`

## 2. File Naming Convention
Files must follow this format:
`YYYYMMDD_v{Version}_{Type}_{Description}.{Ext}`

### Components:
- **YYYYMMDD**: Creation or major update date (e.g., 20260202).
- **v{Version}**: Version number (e.g., v1.0, v1.1).
- **{Type}**:
  - `Guide`: Design guidelines or principles.
  - `Flow`: Process flows or diagrams.
  - `Spec`: Technical specifications.
  - `Matrix`: The actual permission matrix table.
  - `Policy`: Security or business policies.
- **{Description}**: Short, kebab-case description (e.g., landlord-permissions, rbac-schema).

### Examples:
- `20260202_v1.0_Matrix_Super-Admin-Roles.md`
- `20260215_v2.1_Flow_User-Registration-Permissions.pdf`

## 3. Directory Structure
- **design_guidelines/**: High-level principles, innovative ideas, UI/UX guidelines for permission management.
- **process_flows/**: Visual diagrams of how permissions are checked, assigned, or inherited.
- **templates/**: Standard templates for creating new permission specs.
- **examples/**: Reference implementations or case studies.
