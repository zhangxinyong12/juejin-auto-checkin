import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "掘金自动签到&抽奖",
    description: "自动在掘金网站进行签到和抽奖",
    permissions: ["activeTab", "tabs", "storage", "alarms"],
    host_permissions: ["https://juejin.cn/*"],
  },
  vite: () => ({
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
  }),
})
