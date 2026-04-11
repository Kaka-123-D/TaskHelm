# Post-Turn Code Review

After completing each implementation turn (writing or modifying code):

1. Run `code-review` agent or `/code-review` skill on all changed files
2. Check for:
   - Immutability violations (no mutations)
   - TypeScript type safety
   - Error handling completeness
   - Security issues (no hardcoded secrets, input validation)
   - File size limits (<800 lines)
3. Fix any CRITICAL or HIGH issues before moving on
4. Report review summary to user

This is mandatory for every turn that produces code changes, not just final commits.
