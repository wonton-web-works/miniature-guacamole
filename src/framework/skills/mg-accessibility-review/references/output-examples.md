# mg-accessibility-review Output Format Examples

## Full Accessibility Review Template

```
## Accessibility Review: {Feature/Component}

### WCAG Compliance: {AA | AAA}
**Status:** {Compliant | Non-Compliant | Partial}

### Critical Violations (Block Merge)
- **[1.4.3] Contrast (Minimum)** - Button text fails 4.5:1 ratio (3.2:1 actual)
  Location: src/components/Button.tsx:42
  Fix: Change text color from #767676 to #595959

- **[2.1.1] Keyboard** - Modal cannot be closed with keyboard
  Location: src/components/Modal.tsx:18
  Fix: Add Escape key handler

### Warnings (Should Fix)
- **[2.4.7] Focus Visible** - Focus outline too subtle (1px)
  Location: global.css:15
  Fix: Increase to 2px outline

### Recommendations
- Add skip link for navigation (2.4.1)
- Increase touch target sizes to 48x48px for mobile
- Add aria-live region for status updates

### Summary
- Critical Issues: {count}
- Warnings: {count}
- Passed Checks: {count}
- Overall: {PASS | FAIL | NEEDS WORK}

### Next Action
{Block merge | Approve with warnings | Approved}
```
