/**
 * 飞书消息推送工具函数
 */

/**
 * 发送消息到飞书机器人
 * @param webhook 飞书机器人 Webhook URL
 * @param message 要发送的消息内容
 * @returns 是否发送成功
 */
export async function sendFeishuMessage(
  webhook: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: message,
        },
      }),
    })

    const result = await response.json()
    
    // 飞书 API 返回 code 为 0 表示成功
    if (result.code === 0) {
      console.log('飞书消息发送成功:', result)
      return true
    } else {
      console.error('飞书消息发送失败:', result)
      return false
    }
  } catch (error) {
    console.error('发送飞书消息时出错:', error)
    return false
  }
}

/**
 * 格式化签到结果消息
 * @param checkinResult 签到结果（可能包含步骤信息和失败原因）
 * @param lotteryResult 抽奖结果
 * @param signinData 签到数据（连续签到天数、累计签到天数、当前矿石数）
 * @returns 格式化后的消息
 */
export function formatCheckinMessage(
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
  },
  signinData?: {
    consecutiveDays?: number
    totalDays?: number
    currentOre?: number
  } | null
): string {
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  let message = `【掘金自动签到】\n`
  message += `执行时间：${timeStr}\n\n`
  
  // 签到结果
  if (checkinResult.success) {
    message += `✅ 签到：${checkinResult.message}\n`
  } else {
    message += `❌ 签到：${checkinResult.message}\n`
    if (checkinResult.errorReason) {
      message += `⚠️ 失败原因：${checkinResult.errorReason}\n`
    }
  }
  
  // 抽奖结果
  if (lotteryResult) {
    if (lotteryResult.success) {
      message += `✅ 抽奖：${lotteryResult.message}\n`
    } else {
      message += `❌ 抽奖：${lotteryResult.message}\n`
      if (lotteryResult.errorReason) {
        message += `⚠️ 失败原因：${lotteryResult.errorReason}\n`
      }
    }
  }

  // 签到数据
  if (signinData) {
    message += `\n📊 签到数据：\n`
    if (signinData.consecutiveDays !== undefined) {
      message += `连续签到天数：${signinData.consecutiveDays} 天\n`
    }
    if (signinData.totalDays !== undefined) {
      message += `累计签到天数：${signinData.totalDays} 天\n`
    }
    if (signinData.currentOre !== undefined) {
      message += `当前矿石数：${signinData.currentOre}\n`
    }
  }
  
  return message
}

