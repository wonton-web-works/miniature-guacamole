<template>
  <Layout>
    <template #home-hero-info-before>
      <HeroNetwork />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HeroNetwork from './HeroNetwork.vue';

const { Layout } = DefaultTheme;
</script>
