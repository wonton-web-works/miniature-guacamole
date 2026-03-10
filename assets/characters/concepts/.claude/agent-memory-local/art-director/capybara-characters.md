# Capybara Character Design Notes

## Round 1 Concepts (Flux Dev on Replicate)

### Characters & Colors
- Engineering Manager — Guac Green #4A7C59 — wide/grounded, desk, deadpan
- CTO — Slate Blue #2E6E8E — round, zip hoodie, arms crossed, eyebrow raised
- Product Owner — Burnt Sienna #8B4A2E — standing, hands in pockets, warm
- QA — Muted Plum #7A5C8B — compact, vest, "actually" index finger pose
- Staff Engineer — Deep Slate #3D5A6B — hunched, dark zip hoodie, downward gaze
- CEO — Charcoal #2D2D2D — turtleneck, composed, knowing smile

### Round 1 Findings

#### What works
- EM, PO, QA, CEO color distinctness: strong
- QA asymmetric pose reads well at small sizes
- CEO charcoal as visual anchor is correct

#### Blockers (must fix before production)
1. CTO (#2E6E8E) and Staff Engineer (#3D5A6B) are too close in hue and value — will merge at thumbnail
   - Fix: push Staff Engineer toward darker navy or near-black desaturated slate
2. CTO and Staff Engineer silhouettes too similar — both hoodie-wearing, similar mass/hunch
   - Fix: CTO needs genuinely wider, more assertive posture to separate from Staff Engineer's tight hunch
3. Style consistency needs in-person verification — Flux Dev drifts in line weight between generations
   - Test: render all 6 side by side, check for background complexity drift (EM desk detail vs others)
4. Pre-puppet check: validate mouth/eye placement consistency across all 6 before CA rigging

#### Pre-production checklist
- [ ] Separate CTO/Staff Engineer colors (blocker)
- [ ] Silhouette test: all 6 at 512px as solid black fill — must read immediately
- [ ] Background complexity audit — all should have equivalent environmental detail
- [ ] Facial anchor point consistency check for Character Animator puppet prep
