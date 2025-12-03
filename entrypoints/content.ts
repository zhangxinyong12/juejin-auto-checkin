/**
 * 掘金自动签到和抽奖内容脚本
 * 此脚本会在掘金网站页面加载时自动执行签到和抽奖操作
 */

import { sendFeishuMessage, formatCheckinMessage } from "./utils/feishu"

// WXT 会自动提供 defineContentScript 全局函数
// 防止重复执行的标志
let isLotteryExecuting = false

export default defineContentScript({
  matches: ["https://juejin.cn/*"],
  main() {
    console.log("掘金自动签到脚本已加载")
    console.log("当前页面URL:", window.location.href)

    // 检查是否在签到页面，如果是则自动执行签到
    if (window.location.href.includes("/user/center/signin")) {
      console.log("检测到在签到页面，自动执行签到")
      // 等待页面加载完成
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => {
            performActualSignin()
          }, 2000)
        })
      } else {
        setTimeout(() => {
          performActualSignin()
        }, 2000)
      }
    }

    // 检查是否在抽奖页面，如果是则自动执行抽奖
    if (
      window.location.href.includes("/user/center/lottery") &&
      !isLotteryExecuting
    ) {
      console.log("检测到在抽奖页面，自动执行抽奖")
      // 等待页面加载完成，抽奖页面可能需要更长时间加载动态内容
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => {
            performActualLottery()
          }, 5000)
        })
      } else {
        setTimeout(() => {
          performActualLottery()
        }, 5000)
      }
    }

    // 监听 SPA 路由变化（hashchange 和 popstate）
    let lastUrl = window.location.href
    const checkUrlChange = () => {
      const currentUrl = window.location.href
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl
        console.log("检测到 URL 变化:", currentUrl)

        // 如果跳转到抽奖页面，执行抽奖
        if (
          currentUrl.includes("/user/center/lottery") &&
          !isLotteryExecuting
        ) {
          console.log("URL 变化检测到抽奖页面，自动执行抽奖")
          setTimeout(() => {
            performActualLottery()
          }, 5000)
        }
      }
    }

    // 监听 hash 变化（用于 hash 路由）
    window.addEventListener("hashchange", checkUrlChange)

    // 监听 popstate（用于 history 路由）
    window.addEventListener("popstate", checkUrlChange)

    // 定期检查 URL 变化（作为备用方案）
    setInterval(checkUrlChange, 1000)

    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener(
      (
        message: { action: string },
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
      ) => {
        if (message.action === "executeCheckin") {
          console.log("收到执行签到指令")
          // 等待页面加载完成后执行
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
              initAutoCheckin()
            })
          } else {
            initAutoCheckin()
          }
          sendResponse({ success: true })
        }
        return true
      }
    )
  },
})

/**
 * 初始化自动签到流程
 */
async function initAutoCheckin() {
  console.log("开始执行自动签到流程")

  // 等待页面加载完成，然后等待3-5秒再去找签到按钮
  const waitDelay = getRandomDelay(3000, 5000)
  console.log(`等待页面加载完成，${waitDelay}ms 后开始查找签到按钮`)
  await sleep(waitDelay)

  // 执行签到操作
  const checkinResult = await performCheckin()

  // 如果签到失败，直接发送通知并返回
  if (!checkinResult.success) {
    await sendFeishuNotification(checkinResult, undefined)
    return
  }

  // 等待5-10秒后执行抽奖
  const lotteryDelay = getRandomDelay(5000, 10000)
  console.log(`等待 ${lotteryDelay}ms 后开始抽奖`)
  await sleep(lotteryDelay)

  // 执行抽奖操作
  const lotteryResult = await performLottery()

  // 如果抽奖失败，发送通知
  if (!lotteryResult.success) {
    await sendFeishuNotification(checkinResult, lotteryResult)
    return
  }

  // 发送飞书通知
  await sendFeishuNotification(checkinResult, lotteryResult)
}

/**
 * 执行签到操作
 * 查找并点击签到按钮（在首页）
 * @returns 签到结果（包含步骤信息和失败原因）
 */
async function performCheckin(): Promise<{
  success: boolean
  message: string
  step?: string
  errorReason?: string
}> {
  const step = "步骤1: 在首页查找签到按钮"
  console.log("开始执行签到操作（首页）")
  console.log("当前页面URL:", window.location.href)

  try {
    // 检查是否已经在签到页面
    if (window.location.href.includes("/user/center/signin")) {
      console.log("已在签到页面，查找真正的签到按钮")
      return await performActualSignin()
    }

    // 在首页查找签到按钮
    // 1. 未签到按钮：<button class="btn signin-btn" data-v-dd4bc01e="">
    // 2. 已签到按钮：<button class="btn signedin-btn" data-v-dd4bc01e="">
    // 按钮位于 <div class="signin-tip sidebar-block signin"> 容器内
    let checkinButton = document.querySelector(
      "button.btn.signin-btn"
    ) as HTMLButtonElement

    // 如果找不到未签到按钮，尝试找已签到按钮
    if (!checkinButton) {
      checkinButton = document.querySelector(
        "button.btn.signedin-btn"
      ) as HTMLButtonElement
    }

    if (checkinButton) {
      console.log("找到首页签到按钮，准备点击")
      console.log("按钮文本:", checkinButton.textContent)
      console.log("按钮class:", checkinButton.className)

      // 确保按钮可见且可点击
      if (checkinButton.offsetParent === null) {
        console.log("按钮不可见，尝试滚动到按钮位置")
        checkinButton.scrollIntoView({ behavior: "smooth", block: "center" })
        await sleep(500)
      }

      checkinButton.click()
      console.log("首页签到按钮已点击，页面将跳转到签到页面")
      console.log(
        "注意：页面跳转后 content script 会重新加载，将在签到页面自动执行签到"
      )

      // 点击后页面会跳转，content script 会重新加载
      // 在签到页面的 content script 会自动执行签到
      return {
        success: true,
        message: "已点击首页签到按钮，等待跳转到签到页面",
        step: step,
      }
    } else {
      console.log("未找到首页签到按钮")
      const errorReason =
        "在首页未找到签到按钮（button.btn.signin-btn 或 button.btn.signedin-btn）"
      return {
        success: false,
        message: "未找到首页签到按钮",
        step: step,
        errorReason: errorReason,
      }
    }
  } catch (error) {
    console.error("执行签到操作时出错:", error)
    return {
      success: false,
      message: `执行签到操作时出错: ${
        error instanceof Error ? error.message : String(error)
      }`,
      step: step,
      errorReason: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 在签到页面执行真正的签到操作
 * @returns 签到结果
 */
async function performActualSignin(): Promise<{
  success: boolean
  message: string
}> {
  console.log("在签到页面，等待10秒后判断签到状态")

  // 等待10秒，确保页面完全加载
  await sleep(10000)

  console.log("开始判断签到状态")

  // 首先检查是否已经签到：<button class="signedin btn" data-v-5c13335b="">
  const signedinButton = document.querySelector(
    "button.signedin.btn"
  ) as HTMLButtonElement

  if (signedinButton) {
    const buttonText = signedinButton.textContent || ""
    console.log("找到已签到按钮，按钮文本:", buttonText)

    if (buttonText.includes("今日已签到") || buttonText.includes("已签到")) {
      console.log("今日已签到，查找幸运抽奖按钮")
      // 已签到，查找并点击幸运抽奖
      await performLottery()
      return {
        success: true,
        message: "今日已签到，已执行抽奖",
      }
    }
  }

  // 如果未签到，查找签到按钮：<button class="signin btn" data-v-5c13335b="">
  const actualSigninButton = document.querySelector(
    "button.signin.btn"
  ) as HTMLButtonElement

  if (actualSigninButton) {
    console.log("找到签到按钮，准备点击")
    console.log("按钮文本:", actualSigninButton.textContent)

    // 确保按钮可见且可点击
    if (actualSigninButton.offsetParent === null) {
      console.log("按钮不可见，尝试滚动到按钮位置")
      actualSigninButton.scrollIntoView({ behavior: "smooth", block: "center" })
      await sleep(500)
    }

    actualSigninButton.click()
    console.log("签到按钮已点击，等待签到完成")

    // 等待签到完成
    await sleep(2000)

    // 刷新页面
    console.log("刷新页面以更新签到状态")
    window.location.reload()

    // 等待页面重新加载（content script 会重新执行）
    // 重新加载后会再次调用 performActualSignin，此时应该检测到已签到状态
    return {
      success: true,
      message: "已点击签到按钮，页面将刷新",
    }
  } else {
    console.log("未找到签到按钮，可能已经签到过了")
    // 如果找不到签到按钮，也尝试查找抽奖按钮
    await performLottery()
    return {
      success: true,
      message: "未找到签到按钮，已尝试执行抽奖",
    }
  }
}

/**
 * 执行抽奖操作
 * 查找并点击抽奖按钮（幸运抽奖）
 * @returns 抽奖结果（包含步骤信息和失败原因）
 */
async function performLottery(): Promise<{
  success: boolean
  message: string
  step?: string
  errorReason?: string
}> {
  const step = "步骤3: 查找并点击幸运抽奖链接"
  console.log("开始执行抽奖操作")

  try {
    // 检查是否已经在抽奖页面
    if (window.location.href.includes("/user/center/lottery")) {
      console.log("已在抽奖页面，直接执行抽奖")
      return await performActualLottery()
    }

    // 等待3-5秒后判断是否已签到
    const waitDelay = getRandomDelay(3000, 5000)
    console.log(`等待 ${waitDelay}ms 后查找幸运抽奖`)
    await sleep(waitDelay)

    // 检查是否已经在抽奖页面
    if (window.location.href.includes("/user/center/lottery")) {
      console.log("已在抽奖页面，直接执行抽奖")
      return await performActualLottery()
    }

    // 查找幸运抽奖链接
    // 方式1: 通过 href 查找链接（最准确）
    let lotteryLink = document.querySelector(
      'a[href*="/user/center/lottery"]'
    ) as HTMLAnchorElement

    // 方式2: 如果找不到，通过包含"幸运抽奖"文本的 .title 元素向上查找链接
    if (!lotteryLink) {
      const lotteryElements = document.querySelectorAll(".title")
      for (const element of lotteryElements) {
        const text = element.textContent || ""
        if (text.includes("幸运抽奖")) {
          // 向上查找链接元素
          let parent = element.parentElement
          while (parent && !lotteryLink) {
            if (parent.tagName === "A") {
              lotteryLink = parent as HTMLAnchorElement
              console.log("通过父元素找到幸运抽奖链接")
              break
            }
            parent = parent.parentElement
          }
          if (lotteryLink) break
        }
      }
    }

    // 方式3: 如果还是找不到，遍历所有链接通过文本查找
    if (!lotteryLink) {
      const allLinks = document.querySelectorAll("a")
      for (const link of allLinks) {
        const text = link.textContent || ""
        if (text.includes("幸运抽奖")) {
          lotteryLink = link as HTMLAnchorElement
          console.log("通过文本找到幸运抽奖链接")
          break
        }
      }
    }

    if (lotteryLink) {
      console.log("找到幸运抽奖链接，准备点击")
      console.log("链接文本:", lotteryLink.textContent)
      console.log("链接href:", lotteryLink.href)

      // 确保链接可见
      if (lotteryLink.offsetParent === null) {
        console.log("链接不可见，尝试滚动到链接位置")
        lotteryLink.scrollIntoView({ behavior: "smooth", block: "center" })
        await sleep(500)
      }

      const currentUrl = window.location.href
      lotteryLink.click()
      console.log("幸运抽奖链接已点击，等待页面跳转")

      // 等待 URL 变化（SPA 可能不会重新加载 content script）
      let urlChanged = false
      for (let i = 0; i < 20; i++) {
        await sleep(500)
        if (window.location.href !== currentUrl) {
          urlChanged = true
          console.log("检测到 URL 已变化:", window.location.href)
          break
        }
      }

      if (urlChanged && window.location.href.includes("/user/center/lottery")) {
        console.log("已跳转到抽奖页面，开始执行抽奖")
        // 直接执行抽奖逻辑
        return await performActualLottery()
      } else if (window.location.href.includes("/user/center/lottery")) {
        console.log("已在抽奖页面，开始执行抽奖")
        // 即使 URL 没变化，也尝试执行抽奖（可能是 SPA 路由）
        return await performActualLottery()
      } else {
        const errorReason = "点击幸运抽奖链接后，页面未跳转到抽奖页面"
        return {
          success: false,
          message: "未跳转到抽奖页面",
          step: step,
          errorReason: errorReason,
        }
      }
    } else {
      console.log("未找到幸运抽奖链接")
      const errorReason =
        "未找到幸运抽奖链接（尝试了通过 href、.title 元素和文本查找）"
      return {
        success: false,
        message: "未找到幸运抽奖链接",
        step: step,
        errorReason: errorReason,
      }
    }
  } catch (error) {
    console.error("执行抽奖操作时出错:", error)
    return {
      success: false,
      message: `执行抽奖操作时出错: ${
        error instanceof Error ? error.message : String(error)
      }`,
      step: step,
      errorReason: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 在抽奖页面执行真正的抽奖操作
 * 直接根据 id 查找并点击 turntable-item-0 元素
 * @returns 抽奖结果
 */
async function performActualLottery(): Promise<{
  success: boolean
  message: string
  step?: string
  errorReason?: string
  signinData?: {
    consecutiveDays?: number
    totalDays?: number
    currentOre?: number
  } | null
}> {
  const step = "步骤4: 在抽奖页面点击抽奖按钮"

  // 防止重复执行
  if (isLotteryExecuting) {
    console.log("抽奖正在执行中，跳过重复执行")
    return {
      success: false,
      message: "抽奖正在执行中",
      step: step,
      errorReason: "抽奖正在执行中，跳过重复执行",
    }
  }

  isLotteryExecuting = true
  console.log("在抽奖页面查找抽奖按钮")

  try {
    // 等待页面完全加载
    await sleep(5000)

    // 直接根据 id 查找元素
    const lotteryButton = document.querySelector(
      "#turntable-item-0"
    ) as HTMLElement

    if (lotteryButton) {
      console.log("找到抽奖按钮，准备点击")
      console.log("元素文本:", lotteryButton.textContent)
      console.log("元素class:", lotteryButton.className)
      console.log("元素id:", lotteryButton.id)

      // 确保元素可见
      if (lotteryButton.offsetParent === null) {
        console.log("元素不可见，尝试滚动到元素位置")
        lotteryButton.scrollIntoView({ behavior: "smooth", block: "center" })
        await sleep(500)
      }

      // 直接点击
      lotteryButton.click()
      console.log("抽奖按钮已点击")

      // 等待弹窗出现（如果有的话）
      await sleep(1000)

      // 检查是否有弹窗，如果有则关闭
      await closeLotteryModalIfExists()

      // 等待抽奖完成
      await sleep(2000)

      // 抽奖完成后，跳转到签到页面并读取数据
      const signinData = await navigateToSigninAndReadData()

      // 发送飞书通知（包含签到数据）
      if (signinData) {
        await sendFeishuNotification(
          { success: true, message: "签到完成" },
          {
            success: true,
            message: "抽奖完成",
            step: step,
            signinData: signinData,
          }
        )
      } else {
        await sendFeishuNotification(
          { success: true, message: "签到完成" },
          { success: true, message: "抽奖完成", step: step }
        )
      }

      return {
        success: true,
        message: "抽奖完成",
        step: step,
        signinData: signinData, // 包含签到数据
      }
    } else {
      console.log("未找到抽奖按钮 (#turntable-item-0)")
      console.log("当前页面URL:", window.location.href)
      const errorReason = "在抽奖页面未找到抽奖按钮（#turntable-item-0）"
      return {
        success: false,
        message: "未找到抽奖按钮",
        step: step,
        errorReason: errorReason,
      }
    }
  } catch (error) {
    console.error("执行抽奖操作时出错:", error)
    return {
      success: false,
      message: `执行抽奖操作时出错: ${
        error instanceof Error ? error.message : String(error)
      }`,
      step: step,
      errorReason: error instanceof Error ? error.message : String(error),
    }
  } finally {
    // 重置标志，允许下次执行
    setTimeout(() => {
      isLotteryExecuting = false
    }, 10000) // 10秒后重置，防止短时间内重复执行
  }
}

/**
 * 抽奖完成后，跳转到签到页面并读取签到数据
 * @returns 签到数据
 */
async function navigateToSigninAndReadData(): Promise<{
  consecutiveDays?: number
  totalDays?: number
  currentOre?: number
} | null> {
  try {
    console.log("抽奖完成，准备跳转到签到页面")

    // 等待3-5秒
    const waitDelay = getRandomDelay(3000, 5000)
    console.log(`等待 ${waitDelay}ms 后点击每日签到链接`)
    await sleep(waitDelay)

    // 查找"每日签到"链接
    // 方式1: 通过 href 查找
    let signinLink = document.querySelector(
      'a[href*="/user/center/signin"]'
    ) as HTMLAnchorElement

    // 方式2: 通过 class 和文本查找
    if (!signinLink) {
      const menuItems = document.querySelectorAll(".byte-menu-item")
      for (const item of menuItems) {
        const text = item.textContent || ""
        if (text.includes("每日签到")) {
          signinLink = item as HTMLAnchorElement
          console.log("通过文本找到每日签到链接")
          break
        }
      }
    }

    if (signinLink) {
      console.log("找到每日签到链接，准备点击")
      console.log("链接href:", signinLink.href)

      // 确保链接可见
      if (signinLink.offsetParent === null) {
        console.log("链接不可见，尝试滚动到链接位置")
        signinLink.scrollIntoView({ behavior: "smooth", block: "center" })
        await sleep(500)
      }

      const currentUrl = window.location.href
      signinLink.click()
      console.log("每日签到链接已点击，等待页面跳转")

      // 等待 URL 变化
      let urlChanged = false
      for (let i = 0; i < 20; i++) {
        await sleep(500)
        if (window.location.href !== currentUrl) {
          urlChanged = true
          console.log("检测到 URL 已变化:", window.location.href)
          break
        }
      }

      // 等待5-10秒后读取数据
      const readDelay = getRandomDelay(5000, 10000)
      console.log(`等待 ${readDelay}ms 后读取签到数据`)
      await sleep(readDelay)

      // 读取签到数据
      return await readSigninData()
    } else {
      console.log("未找到每日签到链接")
      return null
    }
  } catch (error) {
    console.error("跳转到签到页面时出错:", error)
    return null
  }
}

/**
 * 读取签到页面的数据
 * @returns 签到数据
 */
async function readSigninData(): Promise<{
  consecutiveDays?: number
  totalDays?: number
  currentOre?: number
} | null> {
  try {
    console.log("开始读取签到数据")

    // 查找 figures 容器
    const figuresContainer = document.querySelector(".figures")
    if (!figuresContainer) {
      console.log("未找到签到数据容器")
      return null
    }

    // 读取连续签到天数（第一个 figure-card）
    const consecutiveDaysElement = figuresContainer.querySelector(
      ".figure-card.mini-card .figure"
    )
    const consecutiveDays = consecutiveDaysElement
      ? parseInt(consecutiveDaysElement.textContent?.trim() || "0", 10)
      : undefined

    // 读取累计签到天数（第二个 figure-card）
    const totalDaysElement = figuresContainer.querySelector(
      ".figure-card.mid-card .figure"
    )
    const totalDays = totalDaysElement
      ? parseInt(totalDaysElement.textContent?.trim() || "0", 10)
      : undefined

    // 读取当前矿石数（第三个 figure-card）
    const currentOreElement = figuresContainer.querySelector(
      ".figure-card.large-card .figure"
    )
    const currentOre = currentOreElement
      ? parseInt(currentOreElement.textContent?.trim() || "0", 10)
      : undefined

    console.log("签到数据读取完成:", {
      consecutiveDays,
      totalDays,
      currentOre,
    })

    return {
      consecutiveDays,
      totalDays,
      currentOre,
    }
  } catch (error) {
    console.error("读取签到数据时出错:", error)
    return null
  }
}

/**
 * 关闭抽奖弹窗（如果存在）
 * 弹窗可能包含"当前矿石不足"等提示信息
 */
async function closeLotteryModalIfExists(): Promise<void> {
  try {
    // 查找弹窗容器
    const modal = document.querySelector(
      ".lottery-modal.byte-modal"
    ) as HTMLElement
    if (!modal) {
      console.log("未找到抽奖弹窗")
      return
    }

    console.log("检测到抽奖弹窗，准备关闭")

    // 方式1: 查找并点击"我知道了"按钮（优先）
    const submitButton = modal.querySelector(
      "button.submit"
    ) as HTMLButtonElement
    if (submitButton) {
      console.log("找到'我知道了'按钮，准备点击")
      submitButton.click()
      console.log("'我知道了'按钮已点击")
      await sleep(500)
      return
    }

    // 方式2: 查找并点击关闭图标
    const closeIcon = modal.querySelector(".close-icon") as HTMLElement
    if (closeIcon) {
      console.log("找到关闭图标，准备点击")
      closeIcon.click()
      console.log("关闭图标已点击")
      await sleep(500)
      return
    }

    // 方式3: 查找并点击模态框的关闭按钮（通过SVG路径查找）
    const closeSvg = modal.querySelector("svg.close-icon") as HTMLElement
    if (closeSvg) {
      console.log("找到关闭SVG图标，准备点击")
      closeSvg.click()
      console.log("关闭SVG图标已点击")
      await sleep(500)
      return
    }

    // 方式4: 点击遮罩层关闭（如果支持）
    const mask = modal.querySelector(".byte-modal__mask") as HTMLElement
    if (mask) {
      console.log("尝试点击遮罩层关闭弹窗")
      mask.click()
      await sleep(500)
    }

    console.log("未找到弹窗关闭按钮")
  } catch (error) {
    console.error("关闭弹窗时出错:", error)
  }
}

/**
 * 发送飞书通知
 * @param checkinResult 签到结果
 * @param lotteryResult 抽奖结果（可能包含签到数据）
 */
async function sendFeishuNotification(
  checkinResult: {
    success: boolean
    message: string
    step?: string
    errorReason?: string
  },
  lotteryResult?: {
    success: boolean
    message: string
    step?: string
    errorReason?: string
    signinData?: {
      consecutiveDays?: number
      totalDays?: number
      currentOre?: number
    } | null
  }
) {
  try {
    // 获取飞书设置
    const result = await chrome.storage.sync.get([
      "feishuEnabled",
      "feishuWebhook",
    ])

    if (!result.feishuEnabled || !result.feishuWebhook) {
      console.log("飞书通知未启用或未配置")
      return
    }

    // 格式化消息
    const message = formatCheckinMessage(
      checkinResult,
      lotteryResult,
      lotteryResult?.signinData
    )

    // 发送消息
    const success = await sendFeishuMessage(result.feishuWebhook, message)

    if (success) {
      console.log("飞书通知发送成功")
    } else {
      console.error("飞书通知发送失败")
    }
  } catch (error) {
    console.error("发送飞书通知时出错:", error)
  }
}

/**
 * 生成指定范围内的随机延迟时间（毫秒）
 * @param min 最小延迟时间（毫秒）
 * @param max 最大延迟时间（毫秒）
 * @returns 随机延迟时间
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 延迟指定时间
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
