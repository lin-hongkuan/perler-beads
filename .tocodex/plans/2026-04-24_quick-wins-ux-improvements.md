---
created: 2026-04-24T12:51:00.000Z
status: active
reason: 三项低风险 UX 改进：Ctrl+Z/Y 快捷键、floatAnimation 迁移、下载 loading 提示
---

# 快速 UX 改进三合一方案

## 背景
代码重构（阶段 1-8）已完成，现进入体验打磨阶段。本批次选择三项改动独立、风险极低的改进。

---

## 改动 A：把 `floatAnimation` 移出 page.tsx → globals.css

### 现状
- [`src/app/page.tsx:26`](src/app/page.tsx:26) 有一段 JS 字符串内联 CSS，通过 `dangerouslySetInnerHTML` 注入 `<style>` 标签
- 该动画在 [`src/components/home/HomeHeroHeader.tsx`](src/components/home/HomeHeroHeader.tsx:6) 的 `animate-float` class 里使用

### 目标
把以下内容：
```css
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}
```
移入 [`src/app/globals.css`](src/app/globals.css:27) 末尾。

### 改动文件
1. [`src/app/globals.css`](src/app/globals.css:1) — 追加动画 CSS
2. [`src/app/page.tsx`](src/app/page.tsx:26) — 删除 `floatAnimation` 常量及 `<style dangerouslySetInnerHTML.../>` 标签（约 -11 行）

### 注意
Tailwind v4 使用 `@import "tailwindcss"` 语法，自定义 `@keyframes` 可直接写在 CSS 文件里，无需放在 `@layer`。

---

## 改动 B：绑定 Ctrl+Z / Ctrl+Y 快捷键

### 现状
- [`handleUndo`](src/app/page.tsx:404) 和 [`handleRedo`](src/app/page.tsx:412) 已在 page.tsx 中定义，对接了 [`useEditorHistory`](src/hooks/useEditorHistory.ts:1)
- 但没有任何键盘事件绑定，用户只能通过 FloatingToolbar 按钮触发

### 目标
在 page.tsx 中新增一个 `useEffect`，监听全局 `keydown` 事件：
- `Ctrl+Z`（Mac: `Meta+Z`）→ 调用 `handleUndo`，且仅在 `isManualColoringMode && canUndo` 时生效
- `Ctrl+Y` 或 `Ctrl+Shift+Z`（Mac: `Meta+Shift+Z`）→ 调用 `handleRedo`，仅在 `isManualColoringMode && canRedo` 时生效
- 注意：当用户在 `<input>` 或 `<textarea>` 内输入时，不应拦截快捷键（检查 `event.target instanceof HTMLInputElement`）

### 改动文件
1. [`src/app/page.tsx`](src/app/page.tsx:540) — 在已有的 `useEffect` 区域附近新增键盘事件监听 useEffect（约 +20 行）

### 实现示意
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;
    if (!isManualColoringMode) return;

    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      if (canUndo) handleUndo();
    } else if (isCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      if (canRedo) handleRedo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isManualColoringMode, canUndo, canRedo, handleUndo, handleRedo]);
```

---

## 改动 C：下载时加 loading 提示

### 现状
- [`handleDownloadRequest`](src/app/page.tsx:581) 直接调用 `downloadImage(...)` 同步（或异步阻塞），无任何反馈
- 大图下载时界面会假死数秒

### 目标
1. 新增一个状态 `const [isDownloading, setIsDownloading] = useState(false)`
2. `handleDownloadRequest` 改为 `async`，在调用前后分别 `setIsDownloading(true/false)`
3. 在页面合适位置（建议 `DownloadSettingsModal` 的确认按钮上）显示 loading 状态

### 实现方案
- 在 `DownloadSettingsModal` 的"下载"按钮上传入 `isLoading` prop，按钮显示 spinner 并 `disabled`
- 或用全局 toast/overlay（更简单：直接在按钮文字上切换）

### 改动文件
1. [`src/app/page.tsx`](src/app/page.tsx:581) — 新增 `isDownloading` 状态，修改 `handleDownloadRequest` 为 async（约 +5 行）
2. [`src/components/DownloadSettingsModal.tsx`](src/components/DownloadSettingsModal.tsx:1) — 接收 `isDownloading?: boolean` prop，按钮加 spinner

---

## 执行顺序建议

```
A（globals.css）→ B（快捷键）→ C（下载 loading）
```

三项均独立，无依赖关系，可并行实施。

## 验收标准
- [ ] `animate-float` 动画视觉效果与之前完全一致
- [ ] page.tsx 中不再有 `dangerouslySetInnerHTML`
- [ ] 手动编辑模式下，Ctrl+Z/Y 能正确撤销/重做
- [ ] 非手动模式、输入框聚焦时，Ctrl+Z/Y 不被拦截
- [ ] 点击下载按钮后，按钮变为 loading 状态，完成后恢复
- [ ] TypeScript 0 error，ESLint 0 warning
