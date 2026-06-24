# Chen & Gao

静态个人网站，当前页面入口是根目录 `index.html`。项目使用 Leaflet 展示世界地图和中国地图旅行足迹，旅行记录集中维护在 `assets/data/travel-places.data.js` 与 `public/assets/data/travel-places.data.js`。

## 本地预览

```bash
npm install
npm run dev
```

## 构建验证

当前 Vite 版本需要 Node.js 20.19+。

```bash
npm run build
```

## 文件说明

- `index.html`：主页面、样式和交互逻辑。
- `assets/`：GitHub Pages 根目录发布使用的静态资源。
- `public/assets/`：Vite 本地预览和构建时复制到站点根目录的静态资源。
- `assets/data/travel-places.data.js`：线上旅行记录数据。
- `public/assets/data/travel-places.data.js`：本地预览/构建旅行记录数据。
