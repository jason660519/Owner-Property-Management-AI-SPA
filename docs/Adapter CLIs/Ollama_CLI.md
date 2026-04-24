# Ollama CLI（Adapter 用）

本專案 Adapter 列以 **`ollama run <model> "<prompt>"`** 觸發；模型名稱須與本機／Ollama Cloud 目錄一致。

- 官方模型庫（例：Kimi K2.6）：[ollama.com/library/kimi-k2.6](https://ollama.com/library/kimi-k2.6)  
- 單次執行（與本 repo 產生命令一致）：`ollama run kimi-k2.6:cloud "你的提示"`

執行前請先安裝 [Ollama](https://ollama.com/download) 並登入（`:cloud` 變體需能使用 Ollama Cloud／帳號權限）。HTTP Adapter 測試則走 Ollama Cloud HTTP（`OLLAMA_API_KEY`），與金鑰管理中的 Ollama Cloud 驗證一致。
