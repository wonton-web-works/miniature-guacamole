import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'miniature-guacamole',
  description: 'Reference documentation for miniature-guacamole — AI-powered product development team framework',
  base: '/miniature-guacamole/',
  srcExclude: ['prd-*.md', 'technical-design-*.md', 'v0-feedback-summary.md', 'security-review.md'],

  head: [
    // Favicons
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/miniature-guacamole/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/miniature-guacamole/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/miniature-guacamole/favicon-16x16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/miniature-guacamole/apple-touch-icon.png' }],

    // OpenGraph Meta Tags
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'miniature-guacamole' }],
    ['meta', { property: 'og:title', content: 'miniature-guacamole — AI-Powered Product Development Team Framework' }],
    ['meta', { property: 'og:description', content: 'Reference documentation for miniature-guacamole — AI-powered product development team framework for Claude Code.' }],
    ['meta', { property: 'og:image', content: 'https://wonton-web-works.github.io/miniature-guacamole/og-image.svg' }],
    ['meta', { property: 'og:url', content: 'https://wonton-web-works.github.io/miniature-guacamole/' }],

    // Twitter Card Meta Tags
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'miniature-guacamole — AI-Powered Product Development Team Framework' }],
    ['meta', { name: 'twitter:description', content: 'Reference documentation for miniature-guacamole — AI-powered product development team framework for Claude Code.' }],
    ['meta', { name: 'twitter:image', content: 'https://wonton-web-works.github.io/miniature-guacamole/og-image.svg' }],

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
        link: 'https://github.com/wonton-web-works/miniature-guacamole'
      },
      {
        text: 'Enterprise',
        link: 'https://theengorg.com?utm_source=mg-docs&utm_medium=nav'
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
          { text: 'Process Flows', link: '/process-flows' },
          { text: 'Agent Reference', link: '/agents' },
          { text: 'Development Workflow', link: '/workflows' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Glossary', link: '/glossary' },
          { text: 'CLI Reference', link: '/cli-reference' },
          { text: 'Audit Logging', link: '/audit-logging' },
          { text: 'Diagrams', link: '/diagrams' }
        ]
      },
      {
        text: 'Contributing',
        items: [
          { text: 'How to Contribute', link: '/contributing' }
        ]
      },
      {
        text: 'About',
        items: [
          { text: 'Built by Agents', link: '/built-by-agents' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wonton-web-works/miniature-guacamole' }
    ],

    footer: {
      message: 'Built with Claude Code | <a href="https://theengorg.com?utm_source=mg-docs&utm_medium=footer" target="_blank" rel="noopener noreferrer">Enterprise</a>',
      copyright: 'MIT Licensed'
    },

    search: {
      provider: 'local'
    }
  }
})
