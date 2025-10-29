import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  entrypointsDir: './entrypoints',
  manifest: {
    permissions: [
      'activeTab',
      'storage',
      'scripting',
      'tabs',
      'contextMenus'
    ],
    host_permissions: [
      'https://mail.google.com/*',
      'https://outlook.live.com/*',
      'https://outlook.office.com/*',
      'https://outlook.office365.com/*'
    ]
  }
});


