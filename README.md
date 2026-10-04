# 職業英文單字小故事

國小三、四年級英語教材：學生最想做的 21 個職業＋大人最想做的 13 個職業＋中學生榜的 2 個（mechanical engineer、chef），共 36 個單字，每字 6 頁（字源 → 演變 → 拆字 → 合字 → 母音 → 音節＋記憶技巧）。

## 使用方式
網址：https://hsieny627-jpg.github.io/English-Jobs-New/ （首頁）

| 檔案 | 內容 |
|---|---|
| `index.html` | **首頁**：🏆 挑戰 1～4、🔤 21 張單字卡＋複習、🎮 10 種遊戲、📊 大人榜單＋大人榜單的 13 張單字卡，點一下直接開始 |
| `story.html` | 單字小故事（原本的首頁） |
| `games.html` | 10 種遊戲 |
| `word-check.html` | 英文用字考證：每個字的字典、美國官方職稱（O*NET）、Google Books Ngram 語料庫；`python3 _build_check.py` 產生，證據在 `evidence/`（`_ngram.py`、`_ngram_us_gb.py`、`_dict_check.py`、`_onet_check.py` 重抓） |
| `rank-tw.html` | 2026 台灣中小學生最想做的工作前 10 名（國語日報原始統計圖＋四家媒體交叉比對）；`node _build_rank.js` 產生 |

每一頁左上角都有 🏠 首頁。也可以直接打開某一頁：
`story.html#c1`～`#c4`（挑戰）、`#w1`～`#w36`（第幾張單字卡；22～34 是大人榜單、35～36 是中學生榜）、`#rev`（複習全部 36 個字）、`#adv0`～`#adv2`（大人榜單）、`games.html#g1`～`#g10`（第幾個遊戲）。

下載後用瀏覽器打開 `index.html` 也能用，不需要網路。

## 修改之後
- 首頁是產生出來的：改了 `story.html` 的單字或 `games.html` 的遊戲，跑 `node _build_home.js` 首頁就會同步。
- 量測：`node _verify.js`（手機、iPad 直／橫、教室觸控螢幕四種尺寸＋首頁每一個連結），只印失敗項。

## 內容來源
- 台灣兒少：國語日報社 2026「兒少大未來」職業探索問卷調查
- 全球青少年：OECD PISA 2018（41 國 15 歲學生）
- 台灣成人：1111 人力銀行 2026「上班族夢幻工作大調查」
- 全球成人：Remitly「Dream Jobs Around the World」2026
- 字源：Online Etymology Dictionary、Merriam-Webster、Cambridge Dictionary（每張卡「🔎 怎麼知道」都附那個字的出處連結）
- 10 種遊戲目前只出 21 個學生職業的題目，大人榜單的 13 個字還沒進遊戲。

## 字體
Andika（SIL Open Font License），已內嵌於 HTML。
