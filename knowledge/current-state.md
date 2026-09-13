# Current State

- Goal: 搭建个人读书笔记系统（书架 → 书籍页三区平行展示：书籍简介 / 章节要点(导图+文字提炼) / 音频口播合集），并持续积累书籍。
- Stage: v4——书籍页由三页签改为三区同页平行展示（顶部锚点跳转）；导图改莫兰迪低饱和配色（根深灰蓝/分支灰陶土/叶子灰豆绿），三层字号 14/13/11.5px、折叠按钮 22/16/12.5px 差异化；两本书接入真实封面（assets/covers/xlw.png / g2g.jpg，`.book-cover` 有 img 时渲染图、无则渐变兜底）。思维导图沿用 v3 竖向逻辑图（根在上、宽 360 固定）。
- Current task: 全站（书架/书籍页三区/章节导图）仅含 2 本书；新增书只改 `assets/js/data.js`。待用户补音频（`audio.src` 填写后界面由占位切换为播放器）或继续加新书。
- 架构: 静态单页 `index.html` + 数据驱动 `assets/js/data.js`（新增书籍/章节只改该文件），详见 README.md。
- 书籍约定: 每章 `notes[{h, items}]` 即口播文字稿，单章 ≤1200 字；`audio` 为空显示口播占位，填 `{title,src,transcript}` 后变为播放器。
- Next action: 用户反馈；按需补音频或新增书籍。- 部署: GitHub Pages 线上地址 https://yijing19961991-blip.github.io/reading-notes/ （仓库 yijing19961991-blip/reading-notes, public, main 分支 root 部署）。
