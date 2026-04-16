# 婷婷的拼豆工坊

这是一个为婷婷定制的拼豆小站，用来把图片转换成拼豆底稿，并保留色号统计、专注模式和下载图纸功能。

## 本地开发

```bash
npm install
npm run dev
```

默认访问 `http://localhost:3000`。

## 功能概览

- 上传图片并生成拼豆底稿
- 按所选色系统计色号和数量
- 下载整理后的图纸图片
- 使用专注模式逐色完成作品

## 部署到 GitHub Pages

如果仓库发布到用户主页仓库以外的项目仓库，需要设置仓库名作为 `basePath`。

### Windows PowerShell

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/你的仓库名"
npm install
npm run build:pages
```

### macOS / Linux

```bash
NEXT_PUBLIC_BASE_PATH=/你的仓库名 npm install
NEXT_PUBLIC_BASE_PATH=/你的仓库名 npm run build:pages
```

构建完成后，静态文件会输出到 `out/`，将其作为 GitHub Pages 发布目录即可。

如果你使用 GitHub Actions 发布，可以在构建步骤里设置：

```yaml
env:
  NEXT_PUBLIC_BASE_PATH: /你的仓库名
```

## 说明

- 项目已配置 `next export` 所需的静态导出选项
- 图片已设置为适合 GitHub Pages 的非优化模式
- 站内无外部宣传链接、二维码导流或打赏内容
