# 雨田娃娃 · 双人换装衣橱

一个只给两个人使用的 2D 实时换装网站。打开同一条房间网址，就能一起给娃娃换衣服和配饰；无需注册、无需密码。

## 已完成的功能

- 原娃娃稿件保持不变，服装和配饰以透明图层叠加。
- 15 件首批服装/配饰，包含日常、约会、公主风和可混搭单品。
- 衣服自动对齐；发卡、眼镜、包包、手持物可以拖动、旋转和缩放。
- 两个人实时同步换装，显示在线人数和对方操作提示。
- Cloudflare Durable Objects 持久保存房间，刷新或以后回来仍能恢复。
- 生成不可编辑的成品纪念链接。
- 下载 1280 × 1280 PNG。
- 手机优先，同时适配电脑。

## 平时怎么玩

第一次打开正式网址时会自动创建一个房间，并把房间编号放在网址末尾。把这条完整网址发给另一个人，以后两个人始终使用这条网址即可。

点击衣服会自动穿上；点击配饰后，可直接在娃娃画面里拖动，使用控制点缩放和旋转。“分享成品”会复制一条只读纪念链接，“下载图片”会保存高清图片。

## 项目结构

- `public/assets/base/doll.jpg`：固定不变的娃娃原稿。
- `public/assets/items/`：透明服装和配饰素材。
- `src/`：换装网页。
- `worker/`：Cloudflare 实时同步、持久化和只读快照服务。
- `docs/superpowers/`：产品设计和实现计划。

## 首次发布

正式发布需要 GitHub Pages 与 Cloudflare 各完成一次连接：

1. 在本机执行 `cd worker`、`npm install`、`npx wrangler login`、`npm run deploy`，记下部署后显示的 `https://...workers.dev` 地址。
2. 在 GitHub 仓库的 **Settings → Secrets and variables → Actions → Variables** 新建 `VITE_WORKER_URL`，值为上一步的 Worker 地址。
3. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 打开仓库 **Actions → 发布 GitHub Pages → Run workflow**。完成后网址为 `https://hubuxi19-commits.github.io/YuTian-Doll/`。

如果希望以后修改实时服务后自动发布，可按 Cloudflare 官方说明创建最小权限 API Token，再在 GitHub Actions Secrets 中添加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。不要把 Token 写进代码或提交到仓库。

## 本地开发

先启动实时服务：

```sh
cd worker
npm install
npm run dev
```

再在项目根目录启动网页：

```sh
npm install
npm run dev
```

网页默认连接 `http://localhost:8787`；也可以复制 `.env.example` 为 `.env` 后修改地址。

## 检查命令

```sh
npm test
npm run verify:assets
npm run build
cd worker
npm test
npm run typecheck
```

娃娃稿件与专属美术素材的版权归项目所有者保留。未经许可，请勿把素材用于其他项目。
