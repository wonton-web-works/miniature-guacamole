# Favicon Conversion Instructions

The logo assets are currently in SVG format. To generate the required PNG and ICO favicon files, use one of these methods:

## Method 1: Using ImageMagick (recommended)

```bash
cd docs/public

# Generate PNG favicons
convert -density 300 -background transparent favicon.svg -resize 16x16 favicon-16x16.png
convert -density 300 -background transparent favicon.svg -resize 32x32 favicon-32x32.png
convert -density 300 -background transparent favicon.svg -resize 180x180 apple-touch-icon.png

# Generate multi-resolution ICO file
convert favicon-16x16.png favicon-32x32.png favicon.ico

# Generate OG image as PNG (1200x630)
convert -density 150 og-image.svg -resize 1200x630 og-image.png

# Generate README header as PNG
convert -density 150 readme-header.svg -resize 800x200 readme-header.png
```

## Method 2: Using online tools

1. **favicon.io** - https://favicon.io/favicon-converter/
   - Upload `favicon.svg`
   - Download all formats

2. **RealFaviconGenerator** - https://realfavicongenerator.net/
   - Upload `favicon.svg`
   - Comprehensive favicon package generation

## Method 3: Using sharp (Node.js)

```bash
npm install -g sharp-cli

# Generate PNGs
sharp -i favicon.svg -o favicon-16x16.png resize 16 16
sharp -i favicon.svg -o favicon-32x32.png resize 32 32
sharp -i favicon.svg -o apple-touch-icon.png resize 180 180

# For ICO, use imagemagick or online tool
```

## Current Status

- ✅ `logo.svg` - Main logo (created)
- ✅ `favicon.svg` - Simplified favicon source (created)
- ⏳ `favicon.ico` - Needs conversion
- ⏳ `favicon-16x16.png` - Needs conversion
- ⏳ `favicon-32x32.png` - Needs conversion
- ⏳ `apple-touch-icon.png` - Needs conversion
- ✅ `og-image.svg` - Social media preview source (created)
- ⏳ `og-image.png` - Needs conversion for better compatibility
- ✅ `readme-header.svg` - GitHub header source (created)
- ⏳ `readme-header.png` - Needs conversion for GitHub

Note: VitePress supports SVG favicons natively, but PNG fallbacks ensure broader browser compatibility.
