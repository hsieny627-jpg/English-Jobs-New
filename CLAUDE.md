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

### ★ quiz 改版（2026/10/9 使用者已同意；下一個對話照做，不要重新規劃、不要重查下面已查證的資料）
做法：題目改 `_quiz_check.py`（ITEMS、CLAIMS、NO_DATA）→ `python3 _quiz_check.py` → 改 `_build_quiz.js` → 量測 0 失敗 → 推 main。新的出處都要加進 CLAIMS 自動核對。

**1. 7 個「沒有資料」的職業**（O*NET 官方職稱資料庫 v31：https://www.onetcenter.org/dl_files/database/db_31_0_csv/job_titles.csv ，54,269 個職稱）
| 職業 | 決定 | 證據 |
|---|---|---|
| esports player | 歸類 R E S | 職稱「Esports Competitor」「Gamer」列在 27-2021.00 Athletes and Sports Competitors（R70 E59 S55）；要註明分數是全部運動員一起算 |
| entertainer | 歸類 A S E | 職稱「Entertainer」列在 27-2011.00 Actors（A100 S51 E50）；也列在 27-2099.00（無資料） |
| engineer | 歸類 R I C | SOC 17-2000「工程師」大類，有分數的 29 種工程師（17-2021～17-2199.11）前 3 名全部是 R、I、C；`_quiz_check.py` 要逐一抓這 29 頁自動核對 |
| content creator | 不歸類 | 資料庫的「Content Creator」在 15-1255.01 Video Game Designers（做遊戲內容），和網站的「自媒體經營」意思不同 |
| YouTuber、influencer | 不歸類 | 職稱資料庫裡沒有這些字 |
| fortune teller | 不歸類、結果頁不列 | 「Fortune Teller」在 27-2099.00，原文：“O*NET data is not available for this type of title.” |
給學生的說明（放「這些職業也可以認識」）：美國勞動部替 900 多種工作做過調查，但 YouTuber、網紅、內容創作者這些很新的工作還沒有調查資料，所以先不分類，不代表它們不好。

**2. 題目改字（30 題中改 15 題，其餘不變；每句都要對得到原文）**
3 用筆、水彩或電腦畫畫｜6 **整題換成 programmer（事務型分數最高的職業，避免職業和型矛盾）**：找出電腦程式哪裡寫錯，改好再檢查一次（Correct errors by making appropriate changes and rechecking the program to ensure that the desired results are produced.）｜7 把麵粉放在秤上秤重，準備做麵包｜8 試玩電玩遊戲，找出哪裡有問題，記錄下來｜9 幫公司設計標誌（logo）和網頁畫面｜12 檢查急救箱和滅火器能不能用｜16 聽別人說出心裡的感受，幫他更了解自己｜17 幫要買房子和要賣房子的人商量｜18 把發生了什麼事，仔細寫下來｜19 按時練習運動，參加比賽｜20 研究機器為什麼壞掉，想辦法改好｜22 帶大家去參觀，介紹好玩的地方、回答問題｜24 把電腦要做的事一步一步排好，寫成程式｜26 找出別人在心情或行為上遇到的困難｜29 **整題換成 business manager 另一句**：選出新的工作夥伴，教他們怎麼做事（Perform personnel functions, such as selection, training, or evaluation.）。
原則：每一型的題目優先用「這一型分數最高」的職業，學生才不會覺得職業和型對不起來。

**3. 探險首頁重做（表面效度：精緻、嚴謹、讓學生信服）**
- 動線只有一條：標題 → 研究根據 3 張卡 → 為什麼做這個測驗 → 六種興趣 → 三句話 → 開始按鈕。主色深藍＋金色；六型固定顏色全站統一；每區塊一句話；動畫收斂（淡入、輕彈）。
- 研究根據 3 張卡：🇺🇸 改編自美國勞動部 O*NET「職業興趣量表」（onetcenter.org/IP.html）｜📚 何倫 Holland 六種興趣理論：研究歷史很長、輔導老師很常使用（IP.html 原文 rich and extensive research history；widely accepted and used by counselors）｜🔬 研究發現小學生的興趣還在改變（Tracey & Ward 1998、Tracey 2002）。
- **為什麼不做教育部／新北市的測驗？**（誠實寫，不可說我們比較準）：台灣的正式興趣測驗都是給國中以上：師大心測中心「職涯測驗系統」只有國中版、高中版、大學版（https://career.ntnu.edu.tw/ ；國中版預試對象 8、9 年級 1790 人，信度 α>.93：https://career.ntnu.edu.tw/junior/TestInterest/TI_Intro.aspx ）；大考中心興趣量表「測驗對象：高中以上學生」（https://career.ceec.edu.tw/StudentSection/Introduce ）。新北市教育局給國小的興趣測驗查不到。→ 學生版說法：「正式的興趣測驗比較準，但都是給國中以上的哥哥姊姊做的。我們用的是**同一套何倫六型理論**（師大、大考中心都用它），改寫成四年級看得懂的探索活動。上國中以後，可以做師大心測中心的正式測驗。」
- 這個測驗的目的（取代「不能決定未來」的負面說法）：幫你 ①發現自己現在最喜歡做哪些事 ②認識很多以前不知道的工作 ③學會這些工作的英文。根據：教育部手冊國小要做的就是 涯E4 認識自己的興趣、涯E8 對工作的好奇心、涯E9 認識不同的工作。
- 三句話（開始按鈕上方，字最大）：1️⃣ 這個測驗幫你發現：你**現在**最喜歡做哪些事。2️⃣ 你現在喜歡的事，長大以後可能會不一樣——就像以前喜歡的玩具，現在可能不玩了。3️⃣ 所以結果不是「你以後一定要做什麼」，而是「可以先去認識哪些工作」。
- 六型名稱改成大考中心正式名稱＋英文原文＋一句說明：🔧實用型 Realistic 喜歡動手做、修東西｜🔬研究型 Investigative 喜歡觀察、研究｜🎨藝術型 Artistic 喜歡創作、表演｜🤝社會型 Social 喜歡幫助、教別人｜📣企業型 Enterprising 喜歡帶領、說服別人｜📋事務型 Conventional 喜歡照步驟整理資料。全頁（題目翻面、結果頁、證據頁）都改用這套名稱。
- 「◀ 上一題」做得更明顯；回上一題不再強迫聽三次。

**4. 每題翻出的英文單字**
- 母音紅色、不發音字母灰色。⚠️ story.html 的 isV 把字中間的 y 一律當母音（lawyer 的 y 是 /j/ 子音，會標錯），SILENT 也沒對過字典 → 用 Cambridge 美式音標逐字核對（加進 `_audit.py` 或 `_quiz_check.py`），**連 story.html 一起改正**，並記到 word-check.html「查證後改正的地方」。
- 自動唸 3 次，唸完「下一題」才亮（保險：最多 8 秒一定會亮，避免 iPad 語音卡住）。單字正下方「🔊 再聽一次」唸 1 次。

**5. 結果頁最後的「六型職業總表」**
- 6 欄（手機 2 欄），欄頭＝圖示＋中文正式名＋英文。每個職業一張卡：圖示＋英文（母音紅、不發音灰）＋中文＋🔊＋「音節」按鈕。
- 放哪一欄（給學生看的說法）：「每個職業放在它**最強**的那一型（美國調查分數最高的）。例：teacher 社會型 100 分最高 → 放社會型。兩型一樣高（例：獸醫 實用 83、研究 83）→ 兩邊都放。」
- 收錄：題目出現過的職業＋結果頁的職業＋新歸類的 esports player、entertainer、engineer。
- 「音節」按鈕：點了用動畫呈現切分過程——整個字 → 出現切線 → 音節分開彈跳 → 顯示「doc · tor ＝ 2 個音節」＋每個音節一個 👏。音節資料用 story.html 的 SYL（已在 evidence/audit.json 對 Cambridge 核對）。


- 我建議的「📚 上課順序」（6 單元，學生最愛的先教、句型 I want to be a/an ___.）**使用者還沒同意**，不要自己做。
- 大人 13＋中學生 2 個字還沒進 10 種遊戲。
- 發音用裝置內建語音（en-US），沒有逐字檢查。
