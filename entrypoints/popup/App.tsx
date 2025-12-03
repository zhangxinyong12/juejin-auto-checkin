import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  TimePicker,
  Switch,
  Input,
  Button,
  Space,
  message,
  Typography,
  Divider
} from 'antd';
import { SaveOutlined, ExperimentOutlined, ClockCircleOutlined, BellOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'antd/dist/reset.css';
import './index.css';

const { Title, Text } = Typography;

/**
 * 设置项类型定义
 */
interface Settings {
  time?: string;
  enabled?: boolean;
  feishuEnabled?: boolean;
  feishuWebhook?: string;
}

/**
 * Popup 主组件
 * 处理用户设置和界面交互
 */
const App: React.FC = () => {
  // 状态管理
  const [time, setTime] = useState<Dayjs | null>(dayjs('09:00', 'HH:mm'));
  const [enabled, setEnabled] = useState<boolean>(false);
  const [feishuEnabled, setFeishuEnabled] = useState<boolean>(false);
  const [feishuWebhook, setFeishuWebhook] = useState<string>('');
  const [nextTime, setNextTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * 组件挂载时加载设置
   */
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * 当启用状态或时间改变时，更新下次执行时间显示
   */
  useEffect(() => {
    updateNextTimeDisplay();
  }, [enabled, time]);

  /**
   * 加载保存的设置
   */
  const loadSettings = async () => {
    const settings = await getSettings();

    if (settings.time) {
      setTime(dayjs(settings.time, 'HH:mm'));
    }

    setEnabled(settings.enabled ?? false);
    setFeishuEnabled(settings.feishuEnabled ?? false);

    if (settings.feishuWebhook) {
      setFeishuWebhook(settings.feishuWebhook);
    }
  };

  /**
   * 获取保存的设置
   */
  const getSettings = async (): Promise<Settings> => {
    const result = await chrome.storage.sync.get([
      'checkinTime',
      'checkinEnabled',
      'feishuEnabled',
      'feishuWebhook'
    ]);
    return {
      time: result.checkinTime as string | undefined,
      enabled: result.checkinEnabled as boolean | undefined,
      feishuEnabled: result.feishuEnabled as boolean | undefined,
      feishuWebhook: result.feishuWebhook as string | undefined
    };
  };

  /**
   * 保存设置
   */
  const handleSave = async () => {
    if (!time) {
      message.warning('请选择执行时间');
      return;
    }

    const timeStr = time.format('HH:mm');

    // 验证飞书 webhook
    if (feishuEnabled && !feishuWebhook.trim()) {
      message.warning('请填写飞书机器人 Webhook 链接');
      return;
    }

    if (feishuEnabled && !feishuWebhook.startsWith('https://open.feishu.cn/open-apis/bot/v2/hook/')) {
      message.warning('飞书 Webhook 链接格式不正确');
      return;
    }

    setLoading(true);

    try {
      // 保存到存储
      await chrome.storage.sync.set({
        checkinTime: timeStr,
        checkinEnabled: enabled,
        feishuEnabled: feishuEnabled,
        feishuWebhook: feishuWebhook.trim()
      });

      // 通知 background script 更新定时任务
      await chrome.runtime.sendMessage({
        action: 'updateSchedule',
        time: timeStr,
        enabled: enabled
      });

      message.success('✅ 设置已保存！');
      updateNextTimeDisplay();
    } catch (error) {
      message.error('保存设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理启用开关切换
   */
  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);

    await chrome.storage.sync.set({ checkinEnabled: checked });

    // 通知 background script
    await chrome.runtime.sendMessage({
      action: 'updateSchedule',
      enabled: checked
    });

    if (checked) {
      message.success('✅ 自动签到已启用');
    } else {
      message.info('⏸️ 自动签到已暂停');
    }

    updateNextTimeDisplay();
  };

  /**
   * 处理飞书开关切换
   */
  const handleFeishuToggle = (checked: boolean) => {
    setFeishuEnabled(checked);

    // 自动保存飞书开关状态
    chrome.storage.sync.set({ feishuEnabled: checked });
  };

  /**
   * 处理立即测试
   */
  const handleTest = async () => {
    message.loading({ content: '🚀 正在执行测试...', key: 'test', duration: 0 });

    try {
      // 发送消息给 background script，触发立即执行
      const response = await chrome.runtime.sendMessage({
        action: 'executeNow'
      }) as { success?: boolean } | undefined;

      if (response && response.success) {
        message.success({ content: '✅ 测试执行成功！请查看掘金页面', key: 'test' });
      } else {
        message.warning({ content: '❌ 测试执行失败，请确保已打开掘金网站', key: 'test' });
      }
    } catch (error) {
      message.error({ content: '❌ 测试执行失败', key: 'test' });
    }
  };

  /**
   * 更新下次执行时间显示
   * 显示：用户选择时间 + 随机时间（0-30分钟）
   */
  const updateNextTimeDisplay = async () => {
    const settings = await getSettings();

    if (!settings.enabled || !settings.time) {
      setNextTime('');
      return;
    }

    const [hours, minutes] = settings.time.split(':').map(Number);
    const now = new Date();
    const baseTime = new Date();
    baseTime.setHours(hours, minutes, 0, 0);

    // 如果今天的基础时间已过，设置为明天
    if (baseTime <= now) {
      baseTime.setDate(baseTime.getDate() + 1);
    }

    // 计算时间范围（加上0-30分钟随机）
    const minTime = new Date(baseTime);
    const maxTime = new Date(baseTime);
    maxTime.setMinutes(maxTime.getMinutes() + 30);

    const formatTime = (date: Date) => {
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    setNextTime(`下次执行时间：${formatTime(minTime)} - ${formatTime(maxTime)}（${settings.time} + 0-30分钟随机）`);
  };

  return (
    <div className="w-full min-h-[500px] bg-gray-50 p-4">
      <Card className="shadow-sm border-0">
        <Space direction="vertical" size="middle" className="w-full">
          <div className="text-center">
            <Title level={4} className="!mb-0 !text-gray-800">
              <ClockCircleOutlined className="mr-2 text-blue-500" />
              自动签到设置
            </Title>
          </div>

          <Divider className="!my-3" />

          <Form layout="vertical" size="small">
            <Form.Item
              label="每日执行时间"
              help={
                <Text type="secondary" className="text-xs">
                  实际执行时间 = 选择时间 + 随机时间（0-30分钟）
                  <br />
                  例如：选择 09:00，将在 09:00 - 09:30 之间随机执行
                </Text>
              }
            >
              <TimePicker
                value={time}
                onChange={(value: Dayjs | null) => setTime(value)}
                format="HH:mm"
                className="w-full"
                placeholder="选择时间"
              />
            </Form.Item>

            <Form.Item label="启用自动签到">
              <Switch
                checked={enabled}
                onChange={handleToggle}
                checkedChildren="已启用"
                unCheckedChildren="已禁用"
              />
            </Form.Item>

            <Form.Item label={
              <span>
                <BellOutlined className="mr-1" />
                推送到飞书
              </span>
            }>
              <Switch
                checked={feishuEnabled}
                onChange={handleFeishuToggle}
                checkedChildren="已启用"
                unCheckedChildren="已禁用"
              />
            </Form.Item>

            {feishuEnabled && (
              <Form.Item label="飞书机器人 Webhook 链接">
                <Input
                  value={feishuWebhook}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeishuWebhook(e.target.value)}
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  size="small"
                />
              </Form.Item>
            )}
          </Form>

          <Space direction="vertical" size="small" className="w-full">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              block
            >
              保存设置
            </Button>

            <Button
              icon={<ExperimentOutlined />}
              onClick={handleTest}
              block
            >
              立即测试
            </Button>
          </Space>

          {nextTime && (
            <div className="text-center">
              <Text type="secondary" className="text-xs">
                {nextTime}
              </Text>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default App;
