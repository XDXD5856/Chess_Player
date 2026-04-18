# site_bridge rules

This directory is an isolated subproject for the test website bridge.

Rules:
- Work only inside site_bridge/ unless explicitly told otherwise.
- Do not modify app/, scripts/, or tests/ in the main chess app.
- Keep this subproject merge-friendly:
  - separate README
  - clear module boundaries
  - minimal dependencies
- Expose clean integration points so this can later be merged into the main chess project.
- Do not implement any third-party site automation.
- This subproject is only for the user's own test website and local learning.
