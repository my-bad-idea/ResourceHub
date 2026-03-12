# ResourceHub 运行与排障手册

## 1. 本地启动

```bash
npm install
npm run dev
```

生产构建与启动：

```bash
npm run build
npm start
```

Windows PowerShell 若因执行策略拦截 `npm.ps1`，可改用：

```powershell
npm.cmd run build
npm.cmd run check
```

## 2. 环境变量

- `PORT`：服务端口，默认 `3000`
- `JWT_SECRET`：JWT 密钥，默认 `dev-secret-change-me`
- `DB_PATH`：SQLite 文件路径，默认 `data/app.db`
- `NODE_ENV`：`development` / `production` / `test`

## 3. 首次初始化

1. 启动服务后访问 `#/setup`
2. 创建首个管理员账号
3. 初始化完成后系统会写入默认配置与演示数据
4. 再次访问初始化接口会返回 `SYSTEM_ALREADY_INITIALIZED`

## 4. Mock 邮件模式

当 `email_config.smtpHost` 为空字符串时，系统不会真实发信：

- 注册
- 忘记密码
- 管理员重置密码
- 邮件测试

以上接口会在响应里附带 `emailPreview`，前端会弹出预览窗口。联调阶段建议保持该模式。

## 5. 回归检查

```bash
npm run check
```

`check` 会执行：

1. `npm run build`
2. `npm run test:smoke`

冒烟脚本会使用独立数据库 `data/smoke-test.db`，每次运行前自动清理旧文件，不影响默认 `data/app.db`。

浏览器端到端验收可单独执行：

```bash
npm run test:browser
```

默认会启动独立服务与浏览器调试端口：

- `UI_ACCEPTANCE_PORT=3100`
- `UI_ACCEPTANCE_CDP_PORT=9223`

如需避开端口冲突，可临时覆盖：

```powershell
$env:UI_ACCEPTANCE_PORT='3129'
$env:UI_ACCEPTANCE_CDP_PORT='9249'
npm.cmd run test:browser
```

产物会输出到 `artifacts/browser-acceptance/`，包括运行日志、截图和 `report.json`。

## 6. 常见问题

### 6.1 `npm run build` 失败

先确认依赖已安装：

```bash
npm install
```

再执行：

```bash
npm run build
```

### 6.2 页面提示系统未初始化

说明当前 `DB_PATH` 对应的数据库还没有完成初始化，访问 `#/setup` 创建管理员即可。

### 6.3 测试邮件没有真实发送

这是 Mock 邮件模式的正常行为。配置 `SMTP Host` 后，再保存邮件配置并点击“测试连接”。

### 6.4 窄屏下表格内容超出

当前实现允许后台表格横向滚动，这是预期行为；若要进一步优化为卡片化列表，需要单独做移动端重构。
