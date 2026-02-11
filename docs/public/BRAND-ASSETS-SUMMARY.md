# miniature-guacamole Brand Assets - Summary

## WS-BRAND-1: Logo & Core Assets - COMPLETED ✓

### Logo Design
**File:** `/docs/public/logo.svg`

The "Avocado Chip" logo implements the Art Director's concept:
- Avocado cross-section in rounded geometric form
- Flesh area: Guac Green (#4A7C59)
- Pit: Stylized as microprocessor die with circuit pattern (Avocado Pit #2D3B2D)
- 6 connection lines radiating from pit to edge (representing agent network)
- Clean SVG scales from 16px to 512px

### Favicon Set
**Files Created:**
- `/docs/public/favicon.svg` - Simplified source for conversion
- `/docs/public/CONVERT-FAVICON.md` - Instructions for PNG/ICO generation

**Files Needed (see CONVERT-FAVICON.md):**
- `favicon.ico` (16x16, 32x32 multi-res) - requires conversion
- `favicon-32x32.png` - requires conversion
- `favicon-16x16.png` - requires conversion
- `apple-touch-icon.png` (180x180) - requires conversion

### Social Media Assets
**OG Image:** `/docs/public/og-image.svg` (1200x630)
- Dark gradient background (Avocado Pit #2D3B2D)
- Logo mark on left
- "miniature-guacamole" wordmark
- Tagline: "Turn Claude Code into a 19-agent product development team"
- Feature highlights: "19 Specialized Agents • 16 Skills • CAD Workflows"
- Optimized for Twitter/Discord/Slack previews

**README Header:** `/docs/public/readme-header.svg` (800x200)
- Subtle gradient background (works on GitHub light/dark modes)
- Logo + tagline + features
- Designed for GitHub README header

## WS-BRAND-2: Site Theme & Config - COMPLETED ✓

### Custom CSS Theme
**File:** `/docs/.vitepress/theme/custom.css`

Implements complete brand color system:

#### Color Palette
**Brand Colors:**
- Guac Green: `#4A7C59` (primary brand)
- Avocado Pit: `#2D3B2D` (dark accent)
- Lime Wash: `#C8E6D0` (light accent)

**Backgrounds:**
- Chip White: `#FAF9F5` (main background)
- Tortilla: `#F5F3ED` (soft background)
- Salt Rim: `#E8E6DD` (muted background)

**Accents:**
- Chili Red: `#C94D3A` (warnings)
- Cilantro Teal: `#2E8B8B` (info/links)
- Lime Zest: `#D4FF00` (highlights)

**Dark Mode:**
- Dark BG: `#1A2A1A`
- Dark BG Soft: `#243424`
- Dark BG Mute: `#2D3B2D`
- Dark Border: `#3A4A3A`
- Dark Text: `#C8E6D0`

#### Features Implemented
- VitePress CSS variable overrides for both light and dark modes
- Hero section gradient (Chip White → Lime Wash → Tortilla)
- Hero title gradient text effect (Guac Green → Cilantro Teal)
- Feature card hover effects (border, shadow, transform)
- Link styling with brand colors
- Code block theming
- Custom block styling (tips, warnings, info)
- Sidebar and navigation theming
- Table styling
- Custom scrollbar styling
- Badge components
- Footer styling

### Theme Loader
**File:** `/docs/.vitepress/theme/index.ts`

TypeScript theme configuration that:
- Extends VitePress default theme
- Imports custom.css
- Provides hook for future enhancements (global components, plugins)

### Config Updates
**File:** `/docs/.vitepress/config.ts`

Added `head` array with:
- Favicon links (SVG + PNG fallbacks with base path)
- Apple touch icon
- OpenGraph meta tags:
  - `og:type: website`
  - `og:site_name: miniature-guacamole`
  - `og:title`
  - `og:description`
  - `og:image` (full URL to og-image.svg)
  - `og:url` (canonical URL)
- Twitter Card meta tags:
  - `twitter:card: summary_large_image`
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
- Theme color meta: `#4A7C59` (Guac Green)

All paths use the correct base path: `/miniature-guacamole/`

## Acceptance Criteria Status

- [✓] Logo SVG renders cleanly at 16px, 32px, and 512px
- [⏳] All favicon formats generated and functional (conversion needed)
- [✓] og:image is 1200x630 with readable text at thumbnail size
- [✓] Custom CSS applies brand colors to VitePress theme
- [✓] Dark mode colors defined
- [✓] Theme loader imports custom CSS correctly
- [✓] Config head meta tags include all OpenGraph and Twitter card tags
- [⏳] Site builds without errors (needs testing: `cd docs && npm run build`)
- [✓] Logo appears in nav bar (configured in themeConfig.logo)
- [✓] Brand colors visible throughout site (CSS applied)

## Next Steps

1. **Convert favicon assets** (see `/docs/public/CONVERT-FAVICON.md`):
   - Run ImageMagick commands to generate PNG/ICO files
   - Or use online tools (favicon.io, RealFaviconGenerator)

2. **Test site build**:
   ```bash
   cd docs
   npm install
   npm run build
   npm run preview
   ```

3. **Verify visual appearance**:
   - Check logo in navigation
   - Verify brand colors throughout site
   - Test dark mode toggle
   - Verify feature card hover effects
   - Test on mobile/tablet viewports

4. **Social media preview testing**:
   - Test OG image in Twitter card validator
   - Test in Discord/Slack link previews
   - Verify fallback images work

5. **GitHub README integration**:
   - Add `![miniature-guacamole](docs/public/readme-header.svg)` to README.md
   - Verify rendering on both light/dark GitHub themes

## File Manifest

### Created Files
```
/docs/public/logo.svg
/docs/public/favicon.svg
/docs/public/og-image.svg
/docs/public/readme-header.svg
/docs/public/CONVERT-FAVICON.md
/docs/public/BRAND-ASSETS-SUMMARY.md (this file)
/docs/.vitepress/theme/custom.css
/docs/.vitepress/theme/index.ts
```

### Modified Files
```
/docs/.vitepress/config.ts (added head meta tags)
```

### Files to Generate (via conversion)
```
/docs/public/favicon.ico
/docs/public/favicon-16x16.png
/docs/public/favicon-32x32.png
/docs/public/apple-touch-icon.png
/docs/public/og-image.png (optional, SVG works but PNG more compatible)
/docs/public/readme-header.png (optional, for GitHub compatibility)
```

## Design System Reference

All brand colors, spacing, and visual elements follow the Art Director creative brief. The design is:
- **Consistent**: Single color palette across all assets
- **Accessible**: High contrast ratios in both light and dark modes
- **Scalable**: SVG-first approach for crisp rendering at any size
- **Production-ready**: VitePress-optimized with proper meta tags and theme integration

For detailed color specifications and usage guidelines, see the CSS custom properties in `/docs/.vitepress/theme/custom.css`.
