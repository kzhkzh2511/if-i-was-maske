# Repository Guidelines

## Project Structure

```
根目录/
├── index.html          # 唯一页面入口，零依赖直接打开
├── css/
│   └── style.css       # 全局样式，CSS 变量驱动，响应式断点 768px/480px/420px
├── js/
│   ├── data.js         # 数据层：8 个角色、60+ 商品、9 个分类、贷款配置
│   └── app.js          # 核心逻辑：状态管理、购物车、贷款系统、结账、Canvas 账单
├── assets/
│   └── products/       # 54 张商品图片（JPG），命名与 data.js 中产品 id 对应
├── generate_images.py  # 批量生图脚本（Agnes AI API），生完自动更新 data.js
└── README.md
```

纯前端静态项目，无框架、无构建工具、无 npm。用浏览器打开 `index.html` 即可运行。

## Development Commands

| 命令 | 用途 |
|------|------|
| `node -c js/app.js` | 检查 JS 语法（无运行时校验，仅语法） |
| `node -c js/data.js` | 同上，数据文件语法检查 |
| `py generate_images.py` | 批量调用 AI API 生成商品图片到 `assets/products/` |
| `open index.html` / `npx http-server` | 本地预览 |

没有测试套件。修改后必须跑 `node -c` 验证两个 JS 文件无语法错误再提交。

## Coding Conventions

- **缩进**：4 空格，无 tab
- **JS 风格**：全局作用域，`const` 优先，函数声明式（`function name() {}`），箭头函数用于回调
- **命名**：驼峰式（`getCartTotal`、`openLoanGeneral`）；DOM 引用统一放在 `dom` 对象里；常量用全大写（`MAX_LOAN_RATIO`、`TOAST_DURATION_MS`）
- **CSS**：CSS 变量集中定义在 `:root`；媒体查询从大到小排列（768px → 480px → 420px）
- **数据**：`data.js` 是纯数据文件，不要加逻辑；新增商品在 `ITEMS` 数组里加对象，图片命名与 `id` 一致放 `assets/products/`

## Key Patterns

- **状态共享**：全局 `state` 对象（`currentCharId`、`cart`、`wealth`、`totalLoan`、`loanCount`、`loanedItems`、`checkoutCompleted`）
- **贷款流程**：`addToCart()` 余额不足 → 自动调用 `openLoan(itemId)` → 弹窗签字 → `confirmLoan()` 加现金并自动入购物车。通用贷款走 `openLoanGeneral()`
- **抵押物渐进**：`LOAN_CONFIG.collateralList` + `collateralValues` 逐次递增，贷款次数 ≥ 列表长度时拒绝
- **事件委托**：商品按钮和购物车按钮的点击事件在 `initApp` 里统一绑定（`dom.productGrid` / `dom.cartItems` 的 `click` 委托），`renderProducts` 不再绑事件

## Commit Guidelines

- 格式：`分类：简短描述` 或 `fix: 描述`
- 中文优先，描述改动内容和原因
- 一次提交聚焦一个功能或修复，避免混合无关改动
- 推送前必须 `node -c` 双文件语法检查通过

发布时同步刷新 `index.html` 预览确认功能正常。
