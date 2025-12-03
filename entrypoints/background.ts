/**
 * Background 脚本
 * 处理定时任务和消息传递
 */

export default defineBackground(() => {
  console.log("掘金自动签到 Background 脚本已加载")

  // 监听安装事件，初始化设置
  chrome.runtime.onInstalled.addListener(async () => {
    console.log("插件已安装，初始化设置")
    await initializeSettings()
  })

  // 监听消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse)
    return true // 保持消息通道开放
  })

  // 监听定时任务
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "juejinCheckin") {
      console.log("定时任务触发，开始执行签到")
      executeCheckin()
    }
  })

  // 初始化时加载设置并设置定时任务
  initializeSettings().then(() => {
    loadAndSchedule()
  })
})

/**
 * 初始化默认设置
 */
async function initializeSettings() {
  const result = await chrome.storage.sync.get([
    "checkinTime",
    "checkinEnabled",
  ])

  if (!result.checkinTime) {
    await chrome.storage.sync.set({
      checkinTime: "09:00",
      checkinEnabled: false,
    })
  }
}

/**
 * 处理消息
 */
async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  if (message.action === "updateSchedule") {
    // 更新定时任务
    await updateSchedule(message.time, message.enabled)
    sendResponse({ success: true })
  } else if (message.action === "executeNow") {
    // 立即执行
    const result = await executeCheckin()
    sendResponse({ success: result })
  }
}

/**
 * 更新定时任务
 */
async function updateSchedule(time?: string, enabled?: boolean) {
  // 清除现有定时任务
  await chrome.alarms.clear("juejinCheckin")

  // 获取当前设置
  const settings = await chrome.storage.sync.get([
    "checkinTime",
    "checkinEnabled",
  ])
  const checkinTime = time || settings.checkinTime || "09:00"
  const checkinEnabled =
    enabled !== undefined ? enabled : settings.checkinEnabled ?? false

  if (!checkinEnabled) {
    console.log("自动签到已禁用")
    return
  }

  // 解析时间
  const [hours, minutes] = checkinTime.split(":").map(Number)

  // 计算下次执行时间
  // 用户选择的时间 + 随机时间（0-30分钟）
  const now = new Date()
  const baseTime = new Date()
  baseTime.setHours(hours, minutes, 0, 0)

  // 如果今天的基础时间已过，设置为明天
  if (baseTime <= now) {
    baseTime.setDate(baseTime.getDate() + 1)
  }

  // 加上随机时间（0-30分钟）
  const randomMinutes = Math.floor(Math.random() * 31) // 0-30分钟
  const nextTime = new Date(baseTime)
  nextTime.setMinutes(nextTime.getMinutes() + randomMinutes)

  // 设置定时任务（每天重复）
  const alarmInfo: chrome.alarms.AlarmCreateInfo = {
    when: nextTime.getTime(),
    periodInMinutes: 24 * 60, // 每24小时重复一次
  }

  await chrome.alarms.create("juejinCheckin", alarmInfo)
  console.log(
    `定时任务已设置，将在 ${nextTime.toLocaleString(
      "zh-CN"
    )} 执行（基础时间：${checkinTime} + ${randomMinutes}分钟随机）`
  )
}

/**
 * 加载设置并安排定时任务
 */
async function loadAndSchedule() {
  const settings = await chrome.storage.sync.get([
    "checkinTime",
    "checkinEnabled",
  ])
  if (settings.checkinEnabled) {
    await updateSchedule(settings.checkinTime, settings.checkinEnabled)
  }
}

/**
 * 执行签到操作
 * 打开掘金首页并发送消息给 content script
 */
async function executeCheckin(): Promise<boolean> {
  try {
    // 查找是否已有掘金标签页
    const tabs = await chrome.tabs.query({ url: "https://juejin.cn/*" })

    let tabId: number

    if (tabs.length > 0) {
      // 使用现有标签页，但强制跳转到首页
      tabId = tabs[0].id!
      // 激活标签页并跳转到首页
      await chrome.tabs.update(tabId, {
        url: "https://juejin.cn/",
        active: true,
      })
    } else {
      // 创建新标签页
      const tab = await chrome.tabs.create({
        url: "https://juejin.cn/",
        active: true,
      })
      tabId = tab.id!
    }

    // 等待页面加载完成（content script 会再等待3-5秒）
    await sleep(3000)

    // 发送消息给 content script 执行签到
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: "executeCheckin",
      })
      console.log("已发送执行消息给 content script")
      return true
    } catch (error) {
      console.error("发送消息失败，可能 content script 未加载:", error)
      // 如果 content script 未加载，等待更长时间后重试
      await sleep(2000)
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "executeCheckin",
        })
        console.log("重试发送消息成功")
        return true
      } catch (retryError) {
        console.error("重试发送消息失败:", retryError)
        return false
      }
    }
  } catch (error) {
    console.error("执行签到失败:", error)
    return false
  }
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
