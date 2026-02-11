<template>
  <Layout>
    <template #home-hero-info-before>
      <HeroGuacamole />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HeroGuacamole from './HeroGuacamole.vue';

const { Layout } = DefaultTheme;
</script>
