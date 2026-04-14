# Elastic Alert Thresholds（MVP）

> Task ID: `ELASTIC-OBS-142`  
> 版本：v1（MVP 固定門檻）  
> 更新：2026-04-14

---

## 1. 門檻總表

| Alert 名稱 | 條件 | 觀察窗口 | 嚴重度 | 建議動作 |
|---|---:|---|---|---|
| API p95 latency high | `p95 > 1500ms` | 10 分鐘 | High | 檢查慢端點/APM traces/DB 查詢 |
| HTTP 5xx ratio high | `5xx > 2%` | 5 分鐘 | Critical | 先看 deploy 變更與 error log 熱點 |
| OCR fail rate high | `OCR fail > 3%` | 10 分鐘 | High | 檢查 OCR service 狀態與上游 payload |
| DB active connections high | `> 80%` | 5 分鐘 | High | 檢查連線池與慢查詢 |
| Container restart burst | `>= 3 次` | 15 分鐘 | Medium | 檢查容器 memory/oom/healthcheck |

---

## 2. 環境調整建議

### dev

- 可先放寬 20%~30% 以減少噪音
- 優先驗證「會觸發/會恢復」流程

### staging

- 接近 prod 門檻
- 建議加上夜間流量基線比對

### prod

- 以 SLA/客訴風險為主
- Critical 告警要有值班通知路徑

---

## 3. 調校策略（避免告警疲勞）

1. 先保留這 5 條，穩定後再加
2. 每週檢討誤報率（false positive）
3. 每條告警都要對應「誰處理、怎麼處理」
4. 若告警觸發太頻繁，先查資料品質再調門檻

---

## 4. 驗收清單

- [ ] 5 條告警已建立
- [ ] 每條均做過一次觸發測試
- [ ] 每條均做過一次恢復測試
- [ ] 告警說明含對應 runbook 連結

