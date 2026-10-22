# 專案工作指引

## 開始工作
- 先讀「讀我.md」（目前最新操作說明）；若有 README.md 也一併閱讀。舊版「使用說明.txt」僅供歷史參考，並搭配「設計規格.md」與「測試紀錄.txt」。
- 本專案是興中國小賸餘款繳回簽辦工具。使用繁體中文，沿用既有行政表單與設計規格。
- 使用者入口為「啟動簽辦工具.cmd」，主頁為「賸餘款簽辦工具.html」；Python 本機服務為 document_service.py，免安裝執行環境位於 .runtime。
- HTML/CSS/JS 來源片段已內嵌至主 HTML。修改前確認來源與內嵌版本的關係，避免只改片段而主工具未更新。

## 沿用已安裝技能
使用者已授權其他專案安裝過的技能一併適用於本專案。沿用目前工作階段可見的共用技能與插件技能，依實際任務選用並先讀對應 SKILL.md；不必把每個技能複製到專案，也不必每次載入全部技能。

個人技能根目錄：C:/Users/asd11/.codex/skills。
目前確認的個人技能：anthropic-frontend-design、frontend-design、ui-ux-pro-max、web-design-engineer、beautiful-article、gpt-image-2、kb-retriever、web-video-presentation。

- 介面、互動、響應與無障礙：優先 ui-ux-pro-max；視任務搭配 web-design-engineer 或 frontend-design。既有設計規格優先，勿因技能預設而任意重做視覺。
- Word 文件：使用 documents 技能；PDF 閱讀、產製與版面驗證：使用 pdf 技能；Excel/試算表檔案：使用 spreadsheets 技能。依當次技能目錄取得插件技能的實際路徑。
- 文章網頁、圖片、知識庫檢索、網頁影片演示：分別於任務符合時使用 beautiful-article、imagegen / gpt-image-2、kb-retriever、web-video-presentation。
- 其他已安裝技能亦依其適用範圍使用。若技能在其他專案專屬目錄而目前不可見，先尋找確切位置再引用；不可宣稱已安裝或載入未確認的技能。
- 首次採用某技能時向使用者簡述。使用者指示優先於技能建議；不因沿用技能而擅自安裝套件、發布網站或更動原始公文。

## 功能與驗證
- 保留本機操作、JSON 草稿下載與載入、欄位核對、核定數與實支數差額、中文大寫金額、A4 列印功能。
- OCR 候選資料需經使用者核對；未辨識欄位不得清空原資料，覆蓋已有內容需沿用既有確認流程。
- 地教系統請購單號留白供會計填寫。原始 DOC/DOCX/XLS 參考文件不得因程式修改而覆寫。
- 本機服務僅監聽 127.0.0.1，保留既有檔案存取範圍。
- 依變更範圍閱讀並執行相關既有測試；歷史測試紀錄不代表本次已重新通過。
- UI 變更驗證桌面與手機版面；列印版面變更需檢查實際 PDF。測試資料不得當作正式送簽資料。
