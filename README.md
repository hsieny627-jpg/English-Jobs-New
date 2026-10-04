# 職業英文單字小故事

國小三、四年級英語教材：21 個職業單字，每字 6 頁（字源 → 演變 → 拆字 → 合字 → 母音 → 音節＋記憶技巧）。

## 使用方式
網址：https://hsieny627-jpg.github.io/English-Jobs-New/ （首頁）

| 檔案 | 內容 |
|---|---|
| `index.html` | **首頁**：🏆 挑戰 1～4、🔤 21 張單字卡＋複習、🎮 10 種遊戲、📊 大人榜單，點一下直接開始 |
| `story.html` | 單字小故事（原本的首頁） |
| `games.html` | 10 種遊戲 |

每一頁左上角都有 🏠 首頁。也可以直接打開某一頁：
`story.html#c1`～`#c4`（挑戰）、`#w1`～`#w21`（第幾張單字卡）、`#rev`（複習 21 個字）、`#adv0`～`#adv2`（大人榜單）、`games.html#g1`～`#g10`（第幾個遊戲）。

下載後用瀏覽器打開 `index.html` 也能用，不需要網路。

## 修改之後
- 首頁是產生出來的：改了 `story.html` 的單字或 `games.html` 的遊戲，跑 `node _build_home.js` 首頁就會同步。
- 量測：`node _verify.js`（手機、iPad 直／橫、教室觸控螢幕四種尺寸＋首頁每一個連結），只印失敗項。

## 內容來源
- 台灣兒少：國語日報社 2026「兒少大未來」職業探索問卷調查
- 全球青少年：OECD PISA 2018（41 國 15 歲學生）
- 台灣成人：1111 人力銀行 2026「上班族夢幻工作大調查」
- 全球成人：Remitly「Dream Jobs Around the World」2026
- 字源：Online Etymology Dictionary、Merriam-Webster、Cambridge Dictionary

## 字體
Andika（SIL Open Font License），已內嵌於 HTML。
