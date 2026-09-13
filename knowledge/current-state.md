# Current State

- Goal: 搭建个人读书笔记系统（书架 → 书籍页三页签：书籍简介 / 章节要点 / 音频口播；章节页两页签：思维导图 / 文字提炼），并持续积累书籍。
- Stage: v6——《效率为王》第1章口播已入库（`assets/audio/xlw_ch01.mp3`，audio 字段从 null 改为 `{title, src}`）。**章节页**标题下方新增内联播放器：播放/暂停按钮 + 可拖进度条 + 当前/总时长，切"思维导图/文字提炼"页签不中断，返回书籍页自动暂停，无音频章节不显示任何音频入口。**书籍页"音频口播"页签**一页列齐：有音频显示播放器、无音频显示"制作中"占位。书籍页/章节页页签就地切换（v5），导图莫兰迪配色与真实封面沿用（assets/covers/）。
- Current task: 全站仅含 2 本书；新增书只改 `assets/js/data.js`。待用户补音频（`audio.src` 填写后界面由占位切换为播放器）或继续加新书。
- 架构: 静态单页 `index.html` + 数据驱动 `assets/js/data.js`（新增书籍/章节只改该文件），详见 README.md。
- 书籍约定: 每章 `notes[{h, items}]` 即口播文字稿，单章 ≤1200 字；`audio` 为空显示口播占位，填 `{title,src,transcript}` 后变为播放器。
- Next action: 用户反馈；按需补音频或新增书籍。- 部署: GitHub Pages 线上地址 https://yijing19961991-blip.github.io/reading-notes/ （仓库 yijing19961991-blip/reading-notes, public, main 分支 root 部署）。
