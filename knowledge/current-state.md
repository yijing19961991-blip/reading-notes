# Current State

- Goal: 搭建个人读书笔记系统（书架 → 书籍页三页签：书籍简介 / 章节要点 / 音频口播；章节页两页签：思维导图 / 文字提炼），并持续积累书籍。
- Stage: v8——封面按**原始图片比例**显示（JS 用 `naturalWidth/naturalHeight` 设容器 aspect-ratio，无裁切；失败回退渐变）。章节页三个页签：思维导图 / 文字提炼 / **随手记**（localStorage 按章存"名字+想法"，本机持久、可删除；跨设备不共享，如需公开上传需另接后端）。其余沿用：页码签就地切换（v5）、章节页内联音频播放器（v6）、手机可拖进度条（v7）、莫兰迪配色与真实封面。
- Current task: 全站仅含 2 本书；新增书只改 `assets/js/data.js`。待用户补音频（`audio.src` 填写后界面由占位切换为播放器）或继续加新书。
- 架构: 静态单页 `index.html` + 数据驱动 `assets/js/data.js`（新增书籍/章节只改该文件），详见 README.md。
- 书籍约定: 每章 `notes[{h, items}]` 即口播文字稿，单章 ≤1200 字；`audio` 为空显示口播占位，填 `{title,src,transcript}` 后变为播放器。
- Next action: 用户反馈；按需补音频或新增书籍。- 部署: GitHub Pages 线上地址 https://yijing19961991-blip.github.io/reading-notes/ （仓库 yijing19961991-blip/reading-notes, public, main 分支 root 部署）。
