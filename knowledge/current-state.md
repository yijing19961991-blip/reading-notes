# Current State

- Goal: 搭建个人读书笔记系统（书架 → 全书概括 → 每章思维导图+文字提炼 → 预留音频口播），并持续积累书籍。
- Stage: v2 完成（导图左右对称关键词紧凑布局）+ 第二本书《从优秀到卓越》（id=g2g）编入书架：9 章口播稿（每章≤1200字，存入 notes）、每章关键词导图、进度"在读"。
- Current task: 全站（书架/全书概括/章节页/引导图）仅含 2 本书；新增书只改 `assets/js/data.js`。待用户补音频或继续加新书。
- 架构: 静态单页 `index.html` + 数据驱动 `assets/js/data.js`（新增书籍/章节只改该文件），详见 README.md。
- 书籍约定: 每章 `notes[{h, items}]` 即口播文字稿，单章 ≤1200 字；`audio` 为空显示口播占位，填 `{title,src,transcript}` 后变为播放器。
- Next action: 用户反馈；按需补音频或新增书籍。- 部署: GitHub Pages 线上地址 https://yijing19961991-blip.github.io/reading-notes/ （仓库 yijing19961991-blip/reading-notes, public, main 分支 root 部署）。
