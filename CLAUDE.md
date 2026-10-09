# CLAUDE.md — 職業英文單字網站（給接手的 AI 讀）

網址：https://hsieny627-jpg.github.io/English-Jobs-New/ （GitHub Pages，推到 `main` 就上線，約 1 分鐘）
使用者：國小英語老師，**不懂程式**。學生：國小三、四年級。上課用 **iPad** 和**教室前方觸控螢幕**。

## 一、工作規則（一定照做）

1. **先規劃、等同意、再動手。** 新功能或新課程：先把規劃（頁面、內容清單、證據來源、要問的問題）寫給使用者看，**使用者說 OK 才寫程式**。看不懂或跟規格衝突，先全部列出來問。
2. **一次只做一件事**，做完一件才做下一件。
3. **事實 100% 要有出處，而且要拿原文核對。** 沒有證據的不放。出處要對應到「那一個字、那一張卡、那一句話」，不能只放通則。
4. **網站上原本就有的資料也要重新拿原始資料核對**，不可以直接相信（教訓：舊的四榜綜合寫錯 PISA 名次，上一個對話一開始沒抓到）。
5. **改完 → build → 量測 0 失敗 → 才推 `main`。** 不要一頁一頁截圖給使用者，全部做完一次回報。
6. 跟使用者說話：繁體中文、簡單、秒懂、用表格；不講程式術語。數字比較一律寫「A 出現 1 次，B 就出現約 N 次」，不要只寫「N 倍」。
7. 每個決定寫回本檔，下一個對話才不會改回去。

## 二、檔案（改內容先找對檔案）

| 檔案 | 是什麼 | 怎麼改 |
|---|---|---|
| `index.html` | 首頁（主題式） | **產生出來的**，改 `_build_home.js` 再 `node _build_home.js` |
| `story.html` | 36 張單字卡（每張 6 步）＋挑戰 1～4＋複習＋進階 | 資料在檔案裡的 `const W=[…]`、`SYL`、`TIP`、`AKA`、`SILENT`；**卡片順序由 `_build_mix.py` 決定**，不要手動排 |
| `games.html` | 10 種遊戲（只有 21 個學生職業，大人 13＋中學生 2 還沒進遊戲） | 資料在 `const DATA=` |
| `quiz.html` | 🧭 職業興趣探險（30 題，何倫六型）＋📚 給老師看的證據 | 題目改 `_quiz_check.py` 的 `ITEMS` → `python3 _quiz_check.py`（抓 O*NET 原文核對 → `evidence/quiz.json`）→ `node _build_quiz.js` |
| `rank-tw.html` | 2026 台灣中小學生前 10 名＋證據 | `node _build_rank.js` |
| `rank-mix.html` | 四榜綜合排序＋證據 | `python3 _build_mix.py`（會重排 story.html），再 `node _build_home.js` |
| `word-check.html` | 英文用字考證（字典、O*NET、Ngram、每句話的原文、音節、改正紀錄） | `python3 _build_check.py` |
| `evidence/*.json` | 所有查證的原始結果 | `_ngram.py`、`_ngram_us_gb.py`、`_dict_check.py`、`_onet_check.py`、`_audit.py` 重抓 |
| `notebooklm/` | 給 NotebookLM 的前 10 名英文單字 | 手寫 Markdown |

網址直接進入：`story.html#c1～#c4`（挑戰）、`#w1～#w36`（第幾張卡）、`#rev`、`#adv0～#adv2`；`games.html#g1～#g10`；`quiz.html`、`quiz.html#ev`（證據）。每頁左上角都有 🏠 首頁。

## 三、指令

```
node _build_home.js && node _build_rank.js && python3 _build_check.py && node _build_quiz.js   # 重建
python3 _quiz_check.py         # 測驗：30 題、29 個職業興趣分數、7 項研究說法重抓原文核對
python3 _audit.py              # 每一句英文說法對原文（新增卡片文字就在 C 清單加一條）
NODE_PATH=$(npm root -g) node _verify.js   # 量測，只印失敗項＋一行總結；必須 0 失敗
```
量測涵蓋：手機／iPad 直／iPad 橫／1920 觸控螢幕不橫向捲動、按鈕 ≥ 48px、36 張卡每一步不超出、每個連結打開正確畫面、
卡片順序＝四榜綜合、`evidence/audit.json` 全部通過、舊錯誤寫法不能再出現。

## 四、查證方法（已驗證可用）

| 要查什麼 | 用什麼 | 注意 |
|---|---|---|
| 字源 | Etymonline `https://www.etymonline.com/word/<字>` | `engineer` 單字頁會無限轉址 → 用 `/search?q=engineer`；原文逗號在引號內（`"teacher,"`） |
| 有沒有這個字、定義、口語標記 | Cambridge `dictionary.cambridge.org/dictionary/english/<字>`、Merriam-Webster | Cambridge 美式音標用「.」分音節（`_audit.py` 有擷取寫法） |
| 美國正式職稱 | O*NET `onetonline.org/link/summary/<代碼>`（列「實際使用的職稱」） | BLS 網站擋自動抓取，用 O*NET |
| 哪個說法最常用 | Google Books Ngram JSON API（`books.google.com/ngrams/json`，corpus `en`、`en-US`、`en-GB`） | 只代表書；一字多義（vet、cook、mechanic）不能直接比 |
| 調查名次 | 國語日報原始統計圖、OECD《Dream Jobs?》PDF Table 1.1、1111 人力銀行新聞、Remitly 原文 | 都已存在 `_build_mix.py` 的 `SRC` |

## 五、已決定的事

- 單字卡排序＝**四榜綜合**（規則寫在 rank-mix.html）。上 2 份榜單 8 個 → 上 1 份 26 個 → 國語日報中學生榜 2 個。
- hairstylist、computer engineer、professional athlete 保留；卡片最後一步有「也可以說」（hairdresser／software engineer／pro athlete）＋原因＋證據。
- 國語日報沒有公布百分比 → 網站不寫百分比。
- 2026/10/4 查證後改正 11 處（列在 word-check.html「查證後改正的地方」）。
- **職業興趣探險（quiz.html，2026/10/8 使用者同意）**：
  - 架構照 O*NET 迷你興趣量表（Mini-IP）：六型 × 5 題 = 30 題、六型輪流出；5 個表情作答（😍5～😖1）。每 6 題一關，中場有徽章。
  - 每一題 = 36 個職業之一的 O*NET 工作內容逐字原文改寫，且該職業 O*NET 興趣分數前 3 名有這一型。改寫後**不是正式量表**，頁面要說是探索活動、僅供參考（開場、結果頁、首頁各一次）。
  - 結果：六型全部顯示（六角形＋長條）；說「你**今天**最常按「喜歡」的是…」（喜歡加引號，2026/10/9），不說「你是…型」；最高型同分並列，只有一型時加第二高（第二高 ≥3 型同分就不加）；職業寫「可以去認識」。不問性別、名字，不存資料。
  - 第 27 題（DJ）原本「用 DJ 機器播放音樂」學生看不懂，2026/10/9 改成「選大家喜歡的歌，放給大家聽」（O*NET：Select and play music incorporating crowd preferences and mood.）。
  - 結果頁職業＝O*NET 興趣前 3 名有這一型；📋 事務型只列前 2 名。
  - O*NET 沒有直接資料的 7 個字（YouTuber、content creator、influencer、entertainer、esports player、engineer、fortune teller）不放進六型；前 6 個列在「這些職業也可以認識」，**fortune teller 不列**。
  - 只測興趣，不測能力（四年級太累；能力不是短測驗測得出來）。
  - 根據：O*NET IP/Mini-IP/Emoji 報告、Tracey & Ward 1998、Tracey 2002（小孩興趣結構還在變）、教育部議題融入說明手冊（涯E4、E8、E9、性E3）、大考中心六型中文名稱。網址都在 `_quiz_check.py` 的 `CLAIMS`。

## 六、還沒做／等使用者決定

- 我建議的「📚 上課順序」（6 單元，學生最愛的先教、句型 I want to be a/an ___.）**使用者還沒同意**，不要自己做。
- 大人 13＋中學生 2 個字還沒進 10 種遊戲。
- 發音用裝置內建語音（en-US），沒有逐字檢查。
