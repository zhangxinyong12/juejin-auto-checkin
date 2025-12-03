#!/usr/bin/env python3
"""
生成掘金自动签到&抽奖插件的图标
图标设计理念：
- 主题：掘金（金色/橙色）+ 签到（对勾）+ 自动化（时钟/齿轮）
- 颜色：掘金品牌色（金色 #FF6B35） + 蓝色（自动化）
- 尺寸：16x16, 32x32, 48x48, 96x96, 128x128
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 掘金品牌色
JUEJIN_ORANGE = "#FF6B35"  # 掘金橙色
JUEJIN_GOLD = "#FFA500"     # 金色
AUTO_BLUE = "#1890FF"       # 自动化蓝色
WHITE = "#FFFFFF"
DARK_BG = "#1A1A1A"

def create_icon(size):
    """
    创建图标
    设计：圆形背景 + 对勾（签到）+ 时钟（自动化）
    """
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 计算缩放比例（基于128x128）
    scale = size / 128
    
    # 绘制圆形背景（渐变效果，外圈橙色，内圈金色）
    center = size // 2
    radius = int(size * 0.45)
    
    # 外圈（橙色）
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=JUEJIN_ORANGE,
        outline=None
    )
    
    # 内圈（金色，稍微小一点）
    inner_radius = int(radius * 0.85)
    draw.ellipse(
        [center - inner_radius, center - inner_radius, 
         center + inner_radius, center + inner_radius],
        fill=JUEJIN_GOLD,
        outline=None
    )
    
    # 绘制对勾（签到符号）- 白色
    checkmark_size = int(size * 0.3 * scale)
    checkmark_thickness = max(2, int(3 * scale))
    
    # 对勾的路径点（相对于中心）
    check_x = center - int(checkmark_size * 0.3)
    check_y = center
    check_end_x = center + int(checkmark_size * 0.2)
    check_end_y = center + int(checkmark_size * 0.3)
    check_mid_x = center - int(checkmark_size * 0.1)
    check_mid_y = center + int(checkmark_size * 0.15)
    
    # 绘制对勾（两条线组成）
    draw.line(
        [check_x, check_y, check_mid_x, check_mid_y],
        fill=WHITE,
        width=checkmark_thickness
    )
    draw.line(
        [check_mid_x, check_mid_y, check_end_x, check_end_y],
        fill=WHITE,
        width=checkmark_thickness
    )
    
    # 在小尺寸上不绘制时钟，只在对勾上方添加一个小星星（抽奖）
    if size >= 48:
        # 绘制时钟外圈（自动化符号）- 蓝色，半透明
        clock_radius = int(size * 0.25 * scale)
        clock_center_x = center + int(size * 0.2 * scale)
        clock_center_y = center - int(size * 0.2 * scale)
        
        # 时钟外圈
        draw.ellipse(
            [clock_center_x - clock_radius, clock_center_y - clock_radius,
             clock_center_x + clock_radius, clock_center_y + clock_radius],
            fill=(24, 144, 255, 180),  # 半透明蓝色
            outline=WHITE,
            width=max(1, int(2 * scale))
        )
        
        # 时钟指针（12点和3点方向，表示自动化）
        pointer_length = int(clock_radius * 0.6)
        # 12点方向指针
        draw.line(
            [clock_center_x, clock_center_y - int(clock_radius * 0.2),
             clock_center_x, clock_center_y - pointer_length],
            fill=WHITE,
            width=max(1, int(2 * scale))
        )
        # 3点方向指针
        draw.line(
            [clock_center_x + int(clock_radius * 0.2), clock_center_y,
             clock_center_x + pointer_length, clock_center_y],
            fill=WHITE,
            width=max(1, int(2 * scale))
        )
    else:
        # 小尺寸：在对勾上方添加小星星（抽奖符号）
        star_size = int(size * 0.15 * scale)
        star_x = center
        star_y = center - int(size * 0.25 * scale)
        
        # 绘制五角星（简化版，用一个小点代替）
        draw.ellipse(
            [star_x - star_size//2, star_y - star_size//2,
             star_x + star_size//2, star_y + star_size//2],
            fill=WHITE,
            outline=None
        )
    
    return img

def main():
    """生成所有尺寸的图标"""
    import sys
    import io
    
    # 设置UTF-8编码输出（Windows兼容）
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    sizes = [16, 32, 48, 96, 128]
    output_dir = "public/icon"
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    print("开始生成掘金自动签到&抽奖插件图标...")
    
    for size in sizes:
        print(f"生成 {size}x{size} 图标...")
        icon = create_icon(size)
        output_path = os.path.join(output_dir, f"{size}.png")
        icon.save(output_path, "PNG", optimize=True)
        print(f"已保存: {output_path}")
    
    print("\n所有图标生成完成！")
    print(f"图标保存在: {output_dir}/")
    print("\n生成的图标尺寸：")
    for size in sizes:
        print(f"  - {size}x{size}.png")

if __name__ == "__main__":
    main()

