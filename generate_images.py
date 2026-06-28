#!/usr/bin/env python3
"""
Batch generate product images using Agnes-Image-2.1-Flash API.
Saves images to assets/products/ and updates data.js with local file paths.

Usage: py generate_images.py
"""

import urllib.request, json, base64, os, re, sys, time

API = "https://api.agnes-ai.com/v1"
KEY = "sk-ENjC67gQGv7bLS2xMixabyVS1zZOtVj5KINxqp4zM4xcmiMW"
MODEL = "Agnes-Image-2.1-Flash"
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "assets", "products")
os.makedirs(OUT_DIR, exist_ok=True)

PRODUCTS = {
    "xicha": "喜茶奶茶杯产品图，白色背景，电商产品摄影风格，1:1构图",
    "starbucks": "星巴克咖啡杯，白色背景，极简电商产品摄影，1:1正方形构图",
    "wagyu": "神户和牛精美摆盘，白色背景，高级餐厅美食摄影，1:1",
    "maotai": "茅台酒瓶产品图，白色背景，高端白酒电商摄影，1:1",
    "michelin": "米其林三星精致法餐摆盘，白色背景，高级美食摄影，1:1",
    "lafite": "82年拉菲红酒瓶，白色背景，高级葡萄酒产品摄影，1:1",
    "toothbrush": "电动牙刷产品图，白色背景，科技小家电摄影，1:1",
    "dyson": "戴森吹风机产品图，白色背景，高端家电摄影，1:1",
    "lego": "乐高千年隼积木套装，白色背景，玩具产品摄影，1:1",
    "switch": "任天堂Switch 2游戏机，白色背景，数码产品摄影，1:1",
    "sonytv": "索尼85寸大屏电视，白色背景，家电产品摄影，1:1",
    "smart-home": "智能家居套装产品图，白色背景，科技感产品摄影，1:1",
    "iphone": "iPhone 16 Pro Max手机，白色背景，苹果产品摄影，1:1",
    "macbook": "MacBook Pro 16笔记本，白色背景，苹果产品摄影，1:1",
    "tesla": "特斯拉Model S轿车，白色背景，汽车产品摄影，1:1",
    "h100": "NVIDIA H100 GPU显卡，白色背景，科技硬件产品摄影，1:1",
    "server": "服务器机柜产品图，白色背景，数据中心设备摄影，1:1",
    "starlink": "星链卫星天线产品图，白色背景，科技产品摄影，1:1",
    "lv-bag": "LV Neverfull手袋，白色背景，奢侈品皮具摄影，1:1",
    "rolex": "劳力士潜航者手表，白色背景，高端腕表摄影，1:1",
    "hermes": "爱马仕铂金包，白色背景，奢侈品手袋摄影，1:1",
    "vca": "梵克雅宝四叶草项链，白色背景，高级珠宝摄影，1:1",
    "patek": "百达翡丽鹦鹉螺腕表，白色背景，高端腕表摄影，1:1",
    "savile": "定制英式西装三件套，白色背景，高端男装摄影，1:1",
    "maldives": "马尔代夫水上别墅海岛度假，俯拍视角，度假旅游摄影，1:1",
    "jet": "豪华私人飞机外观，白色背景，航空产品摄影，1:1",
    "cruise": "奢华环球邮轮，海景视角，旅游产品摄影，1:1",
    "space-travel": "太空旅行太空舱，星空背景，航天旅游摄影，1:1",
    "antarctica": "南极冰川探险，企鹅和破冰船，自然旅游摄影，1:1",
    "burj": "迪拜帆船酒店总统套房，奢华酒店室内摄影，1:1",
    "accompanion": "高端私人伴游服务体验概念图，优雅氛围，1:1",
    "celebrity-dinner": "明星私人晚宴场景，高级餐厅烛光氛围，1:1",
    "model-party": "超模时尚派对概念图，高端社交场景，1:1",
    "butler": "英式管家形象图，专业制服，高端服务概念，1:1",
    "vip-club": "全球顶级私人会所概念图，奢华俱乐部场景，1:1",
    "hollywood": "好莱坞红毯礼包概念图，奥斯卡风格场景，1:1",
    "bugatti": "布加迪Chiron超级跑车，白色背景，超跑产品摄影，1:1",
    "yacht": "超级游艇外观，海洋背景，奢华游艇摄影，1:1",
    "island": "私人热带岛屿全景，航拍视角，度假地产摄影，1:1",
    "picasso": "毕加索名画（油画风格艺术品），白色背景，艺术品摄影，1:1",
    "gulfstream": "湾流G700私人飞机，白色背景，航空产品摄影，1:1",
    "monaco": "摩纳哥顶层公寓天际线景观，奢华地产室内摄影，1:1",
    "twitter": "Twitter/X社交媒体品牌标识图，蓝白配色，科技品牌概念，1:1",
    "mid-company": "中型科技公司办公楼外观，现代化建筑，商业摄影，1:1",
    "your-building": "住宅小区开发商楼盘外观，现代化住宅建筑，1:1",
    "nike": "耐克运动鞋产品图，白色背景，运动品牌电商摄影，1:1",
    "apple": "苹果公司品牌产品图（iPhone和MacBook组合），白色背景，1:1",
    "google": "Google品牌标识概念图，多彩配色，科技品牌，1:1",
    "beverly": "比弗利山庄豪宅外观，奢华住宅建筑摄影，1:1",
    "ny-penthouse": "纽约中央公园顶层公寓室内，天际线景观，奢华地产摄影，1:1",
    "hawaii": "夏威夷海滩庄园，热带度假地产，建筑摄影，1:1",
    "london-mansion": "伦敦海德公园别墅，英式古典建筑，高端地产摄影，1:1",
    "onsen": "日本私人温泉度假村，日式建筑风格，度假地产摄影，1:1",
    "palm-island": "迪拜棕榈岛别墅，奢华中东建筑风格，海滨地产摄影，1:1",
}

def generate_image(prompt, out_path, retries=2):
    data = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json",
    }).encode()

    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                f"{API}/images/generations",
                data=data,
                headers={
                    "Authorization": f"Bearer {KEY}",
                    "Content-Type": "application/json",
                },
            )
            resp = urllib.request.urlopen(req, timeout=120)
            result = json.loads(resp.read())

            if "data" in result and len(result["data"]) > 0:
                b64 = result["data"][0].get("b64_json", "")
                if b64:
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(b64))
                    size = os.path.getsize(out_path)
                    return f"OK ({size}B)"
            return f"Unexpected: {json.dumps(result, ensure_ascii=False)[:200]}"
        except Exception as e:
            if attempt < retries:
                time.sleep(3)
                continue
            return f"Error: {e}"

def main():
    total = len(PRODUCTS)
    generated = 0
    failed = []

    for idx, (pid, prompt) in enumerate(PRODUCTS.items(), 1):
        fname = f"{pid}.png"
        out_path = os.path.join(OUT_DIR, fname)
        print(f"[{idx}/{total}] Generating {pid}...", end=" ", flush=True)
        result = generate_image(prompt, out_path)
        print(result)
        if result.startswith("OK"):
            generated += 1
        else:
            failed.append(pid)

    print(f"\nDone: {generated}/{total} generated")
    if failed:
        print(f"Failed: {', '.join(failed)}")

    # Update data.js with local paths
    if generated > 0:
        data_path = os.path.join(ROOT, "js", "data.js")
        with open(data_path, encoding="utf-8") as f:
            data = f.read()

        # Remove existing SVG imageUrl data URIs (they're huge)
        data = re.sub(r"        imageUrl: 'data:image/svg\+xml;base64,[^']*',\n", "", data)

        for pid in [p for p in PRODUCTS if p not in failed]:
            # Add local imageUrl
            pattern = f"id: '{pid}'"
            idx = data.find(pattern)
            if idx == -1:
                continue
            name_idx = data.find("name:", idx)
            next_block = data.find("    id:", name_idx + 1)
            block = data[idx:next_block] if next_block != -1 else data[idx:]

            if "imageUrl:" in block:
                # Replace existing
                old_img = re.search(r"        imageUrl: '[^']*',", block)
                if old_img:
                    data = data.replace(old_img.group(), f"        imageUrl: 'assets/products/{pid}.png',")
            else:
                # Insert after desc line
                desc_idx = block.find("desc:")
                if desc_idx == -1:
                    desc_idx = block.find("toast:") 
                if desc_idx != -1:
                    end_line = block.find("\n", desc_idx)
                    insert_pos = idx + end_line + 1
                    data = data[:insert_pos] + f"\n        imageUrl: 'assets/products/{pid}.png'," + data[insert_pos:]

        with open(data_path, "w", encoding="utf-8") as f:
            f.write(data)
        print("data.js updated with local image paths")

if __name__ == "__main__":
    main()
