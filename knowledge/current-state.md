# Current State

- Goal: 搭建个人读书笔记系统（书架 → 书籍页三页签：书籍简介 / 章节要点 / 音频口播；章节页两页签：思维导图 / 文字提炼），并持续积累书籍。
- Stage: v5——书籍页由"三区同页平行展示"改回**页签就地切换**（简介/章节要点/音频口播，切换不滚动、不标一二三）；章节要点为章节列表，点行进入章节页（`#/book/<id>/ch<no>`），章节页"思维导图/文字提炼"两页签切换。导图沿用莫兰迪配色（根深灰蓝/分支灰陶土/叶子灰豆绿，字号 14/13/11.5px 分层）与真实封面（assets/covers/xlw.png / g2g.jpg）。README 已同步。
- Current task: 全站仅含 2 本书；新增书只改 `assets/js/data.js`。待用户补音频（`audio.src` 填写后界面由占位切换为播放器）或继续加新书。
- 架构: 静态单页 `index.html` + 数据驱动 `assets/js/data.js`（新增书籍/章节只改该文件），详见 README.md。
- 书籍约定: 每章 `notes[{h, items}]` 即口播文字稿，单章 ≤1200 字；`audio` 为空显示口播占位，填 `{title,src,transcript}` 后变为播放器。
- Next action: 用户反馈；按需补音频或新增书籍。- 部署: GitHub Pages 线上地址 https://yijing19961991-blip.github.io/reading-notes/ （仓库 yijing19961991-blip/reading-notes, public, main 分支 root 部署）。
