/**
 * miniature-guacamole VitePress Theme
 *
 * Extends the default VitePress theme with custom brand styling and hero network animation
 */

import { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './custom.css';
import HomeLayout from './components/HomeLayout.vue';

const theme: Theme = {
  extends: DefaultTheme,
  Layout: HomeLayout,
  enhanceApp({ app, router, siteData }) {
    // Custom app enhancements can be added here if needed
  }
};

export default theme;
