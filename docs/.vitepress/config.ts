import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'miniature-guacamole',
  description: 'A complete AI-powered product development organization for Claude Code',
  base: '/miniature-guacamole/',

  head: [
    // Favicons
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/miniature-guacamole/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/miniature-guacamole/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/miniature-guacamole/favicon-16x16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/miniature-guacamole/apple-touch-icon.png' }],

    // OpenGraph Meta Tags
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'miniature-guacamole' }],
    ['meta', { property: 'og:title', content: 'miniature-guacamole - AI Product Development Team' }],
    ['meta', { property: 'og:description', content: 'Turn Claude Code into a 19-agent product development team with specialized roles, collaborative skills, and CAD workflows.' }],
    ['meta', { property: 'og:image', content: 'https://rivermark-research.github.io/miniature-guacamole/og-image.svg' }],
    ['meta', { property: 'og:url', content: 'https://rivermark-research.github.io/miniature-guacamole/' }],

    // Twitter Card Meta Tags
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'miniature-guacamole - AI Product Development Team' }],
    ['meta', { name: 'twitter:description', content: 'Turn Claude Code into a 19-agent product development team with specialized roles, collaborative skills, and CAD workflows.' }],
    ['meta', { name: 'twitter:image', content: 'https://rivermark-research.github.io/miniature-guacamole/og-image.svg' }],

    // Additional Meta
    ['meta', { name: 'theme-color', content: '#4A7C59' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Agents', link: '/agents' },
      { text: 'Workflows', link: '/workflows' },
      {
        text: 'GitHub',
        link: 'https://github.com/rivermark-research/miniature-guacamole'
      }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is This?', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Installation Methods', link: '/getting-started#installation-methods' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Agent Reference', link: '/agents' },
          { text: 'Development Workflow', link: '/workflows' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Audit Logging', link: '/audit-logging' }
        ]
      },
      {
        text: 'Contributing',
        items: [
          { text: 'How to Contribute', link: '/contributing' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rivermark-research/miniature-guacamole' }
    ],

    footer: {
      message: 'Built with Claude Code',
      copyright: 'MIT Licensed'
    },

    search: {
      provider: 'local'
    }
  }
})
