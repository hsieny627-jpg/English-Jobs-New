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
| `quiz.html` | 🧭 職業興趣探險（30 題，何倫六型，5 站＋圖鑑挑戰＋興趣羅盤＋職業圖鑑）＋📚 給老師看的證據 | 題目改 `_quiz_check.py` 的 `ITEMS` → `python3 _quiz_check.py`（抓 O*NET 原文核對 → `evidence/quiz.json`）→ `node _build_quiz.js` |
| `rank-tw.html` | 2026 台灣中小學生前 10 名＋證據 | `node _build_rank.js` |
| `rank-mix.html` | 四榜綜合排序＋證據 | `python3 _build_mix.py`（會重排 story.html），再 `node _build_home.js` |
| `word-check.html` | 英文用字考證（字典、O*NET、Ngram、每句話的原文、音節、改正紀錄） | `python3 _build_check.py` |
| `evidence/*.json` | 所有查證的原始結果 | `_ngram.py`、`_ngram_us_gb.py`、`_dict_check.py`、`_onet_check.py`、`_audit.py` 重抓 |
| `notebooklm/` | 給 NotebookLM 的前 10 名英文單字 | 手寫 Markdown |

網址直接進入：`story.html#c1～#c4`（挑戰）、`#w1～#w36`（第幾張卡）、`#rev`、`#adv0～#adv2`；`games.html#g1～#g10`；`quiz.html`、`quiz.html#ev`（證據）。每頁左上角都有 🏠 首頁。

## 三、指令

```
node _build_home.js && node _build_rank.js && python3 _build_check.py && node _build_quiz.js   # 重建
python3 _quiz_check.py         # 測驗：30 題、32 個職業興趣分數（含 34 種工程師）、職稱資料庫、11 項說法重抓原文核對
python3 _audit.py              # 每一句英文說法對原文（新增卡片文字就在 C 清單加一條）
NODE_PATH=$(npm root -g) node _verify.js   # 量測，只印失敗項＋一行總結；必須 0 失敗
```
量測涵蓋：手機／iPad 直／iPad 橫／1920 觸控螢幕不橫向捲動、按鈕 ≥ 48px、36 張卡每一步不超出、每個連結打開正確畫面、
卡片順序＝四榜綜合、`evidence/audit.json` 全部通過（含母音／不發音）、舊錯誤寫法不能再出現；測驗每個尺寸走完 30 題＋5 次挑戰、結果頁、圖鑑、三種音節動畫、8 秒保險（量測時用假的語音，唸完立刻結束）。

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
  - O*NET 沒有直接資料的 7 個字：2026/10/9 起 esports player、entertainer、engineer 歸類（見下面「quiz 改版」）；YouTuber、content creator、influencer 列在「這些職業也可以認識」，**fortune teller 不列**。
  - 只測興趣，不測能力（四年級太累；能力不是短測驗測得出來）。
  - 根據：O*NET IP/Mini-IP/Emoji 報告、Tracey & Ward 1998、Tracey 2002（小孩興趣結構還在變）、教育部議題融入說明手冊（涯E4、E8、E9、性E3）、大考中心六型中文名稱。網址都在 `_quiz_check.py` 的 `CLAIMS`。
- **quiz 改版（2026/10/9 完成，照使用者同意的規劃做）**：
  - 頁面流程：開場（標題 → 研究根據 3 張卡 → 為什麼做這個測驗 → 六種興趣 → 三句話 → 開始）→ 🧭 指南針定位＋探險地圖 5 站 → 作答（卡片翻面解鎖職業、飛進右上角「📖 職業圖鑑 n / 26」，英文自動唸 3 次，唸完或最多 8 秒「下一題」才亮；回上一題不用再聽）→ 每站結束：🏅 站點點亮 → ⚡ 圖鑑挑戰 3 題（只練英文、不算分）→ 💭 想一想 → 結果：🧭 興趣羅盤（指針停在最高的型、六角形長出來）→ 推薦的型 → 其他方向 → 也可以認識 → 📖 我的職業圖鑑（6 欄；iPad 直放 3 欄、手機 2 欄；點卡看興趣成分＋👏🚂✂️ 三種音節動畫）。
  - 顏色：深藍 #1B2B4B、金色 #D9A520、白底＋六型固定色（R #D9692B、I #2C6FC9、A #9A4FC4、S #2E9358、E #CF3F55、C #14868A）。字級三級（--t1 標題、--t2 內文 iPad ≥22px、--t3 說明）。
  - 網頁不提教育部、教育局、其他測驗；教育部手冊和大考中心名稱的原文核對留在 `_quiz_check.py` 的 CLAIMS（page=False，不顯示）。
  - 第 6 題換 programmer、第 29 題換 lawyer；其他 13 題改字（見 `_quiz_check.py` ITEMS）。
  - 歸類：esports player（27-2021.00，分數是全部運動員一起算）、entertainer（27-2011.00 演員的分數）、engineer（O*NET 34 種工程師的平均）。不歸類：content creator、YouTuber、influencer（列「也可以認識」），fortune teller（不列）。
- **2026/10/9 重新核對原始資料後，規劃裡寫錯、已更正的地方**（`_quiz_check.py` 現在自動核對職稱資料庫）：
  | 規劃原本寫 | 原始資料其實是 |
  |---|---|
  | influencer：職稱資料庫裡沒有 | 有「Influencer」，列在 41-9012.00 Models（模特兒）→ 意思不同，仍不歸類 |
  | content creator 在 15-1255.01 | 在 3 個職業：15-1255.01 電玩設計師、27-3043.00 作家、27-4032.00 影片剪輯師 → 仍不歸類 |
  | entertainer 也列在 27-2099.00 | 是列在 27-3011.00 廣播主持人／電台 DJ（A78 E56 S42）；和演員一樣前 3 名是 A、S、E → 歸類不變 |
  | 有分數的 29 種工程師（17-2021～） | 17-2000 大類有分數的是 **34 種**（17-2011～17-2199.11），前 3 名全部是 R、I、C |
  | 「美國勞動部替 900 多種工作做過**調查**」 | O*NET 興趣分數來源是 Machine Learning／Expert（career_interest_types.csv），不是問卷調查 → 網頁改成「替 900 多種工作打了六種興趣的分數」（有分數的職業 923 種，自動核對） |
  | 第 6 題說明「美國調查：…」 | 改成「美國勞動部的資料：…」 |
- **母音紅色、不發音灰色（2026/10/9）**：`_audit.py` 的 ALIGN 把每個字拆成「字母→Cambridge 美式音標」，音標接起來要和字典一模一樣；沒有聲音的字母＝灰，a e i o u y 有母音的聲音＝紅，其他黑。story.html 改用 `VOW`、`SILENT`（JSON）資料，不再用「y 不在開頭就是母音」的規則。改正 3 處：business 的灰色原本標在 s（應該是 i）、lawyer 的 y（/j/ 子音）、professional 的 i（ssi 唸 /ʃ/）。記在 word-check.html「查證後改正的地方」和新的「母音和不發音」表。
- Etymonline 從雲端機器抓會被 Cloudflare 擋（"Just a moment..."）：`_audit.py` 這時沿用上一次核對成功的原文句子（標 kept，考證頁會註明條數），不會把擋住的頁面存進快取。

## 六、還沒做／等使用者決定

### ★ 職業圖鑑＋5 種複習遊戲（2026/10/9 規劃；quiz 改版已完成，**另開一個對話**再做）
- 新頁面 `jobdex.html`（職業圖鑑＋遊戲），quiz 結果頁最後和首頁都有入口。
- **圖鑑分批學**：「全部」＋六型各一本（實用型 Realistic…），每本只放那一型的職業（依 O*NET 最高分那一型；同分兩本都放），一次學的量比較少。content creator、YouTuber、influencer 放「還沒有調查資料」一本；fortune teller 不放。每張卡：圖示、英文（母音紅、不發音灰）、中文、🔊、興趣成分、三種音節動畫。
- **遊戲框架 100% 照參考頁** https://hsieny627-jpg.github.io/AI-Agent-Open-Code/sentences/games.html （先讀它的 HTML/JS 再做）：每個遊戲 3 分鐘、每題 15 秒、愈快分數愈高；連對 3 題 → 🎁 驚喜卡二～五選一（每個遊戲卡包樣式不同）；答錯 → 看清楚 → ⭐ 加分題答對 ✕2；結束有答錯整理、我的成績、再玩一次、換一個遊戲、回遊戲大廳；語速選單 0.5～1.0；🏠 首頁。參考頁的 10 種：閃電四選一、他還是她、語序大挑戰、變身術、聽力狙擊、記憶配對、火眼金睛、填空高手、分類大師、魔王挑戰。
- 每個遊戲開始前先選「全部」或某一型（分批練習）。
- **5 種新遊戲**（都和參考頁的 10 種不同）：
  1. 🧲 **興趣磁鐵**：職業卡從上面掉下來，越掉越快，把它丟進正確的興趣磁鐵（六個，依 O*NET 最高分那一型；同分兩個都算對）。練：單字＋六型。
  2. 🔤 **母音救援隊**：單字的母音變成紅色空格（d_ct_r），點母音泡泡把字救回來，救完唸一次。練：拼字＋母音（母音資料要先完成 Cambridge 核對）。
  3. 🥁 **音節節奏大師**：聽單字，跟著鼓點，一個音節敲一下鼓；或從三種切法選對的（doc·tor／do·ctor／d·octor）。練：音節（用 SYL，已核對 Cambridge）。
  4. 🕵 **職業神探**：線索一條一條出現（①興趣類型圖示 ②題目裡那件工作，例如「修理汽車的煞車」③中文名第一個字），越早猜中分數越高。練：英文＋職業內容（線索只用已核對過的題目句子）。
  5. 🌋 **火山大逃亡**：聽英文 → 選對的圖示就往上爬一格，岩漿一直往上漲；答錯岩漿漲更快。練：聽力。
- 量測：每個遊戲 3 種尺寸都能玩完一場、按鈕 ≥ 48px、不橫向捲動、驚喜卡和答錯整理都會出現。

- 我建議的「📚 上課順序」（6 單元，學生最愛的先教、句型 I want to be a/an ___.）**使用者還沒同意**，不要自己做。
- 大人 13＋中學生 2 個字還沒進 10 種遊戲。
- 發音用裝置內建語音（en-US），沒有逐字檢查。
