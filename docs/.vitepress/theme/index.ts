/**
 * miniature-guacamole VitePress Theme
 *
 * Extends the default VitePress theme with custom brand styling
 */

import { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './custom.css';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // Custom app enhancements can be added here if needed
    // For example: registering global components, adding plugins, etc.
  }
};

export default theme;
