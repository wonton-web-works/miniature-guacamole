import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'miniature-guacamole',
  description: 'A complete AI-powered product development organization for Claude Code',
  base: '/miniature-guacamole/',

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
        link: 'https://github.com/YOUR_ORG/miniature-guacamole'
      }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is This?', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Quick Start Examples', link: '/getting-started#quick-start-examples' }
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
        text: 'Contributing',
        items: [
          { text: 'How to Contribute', link: '/contributing' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/YOUR_ORG/miniature-guacamole' }
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
