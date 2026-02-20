# Phase 1 雲端單機方案評估 (Linux + Docker + Docker Compose)

> **創建日期**: 2026-02-20  
> **適用**: Phase 1 (約 100 房東)，單一主機全包 (Supabase + App)  
> **考量**: 流量成本、記憶體需求 (8GB+)、性價比

---

## 1. 需求規格確認

- **架構**: 單一 Linux 主機，運行 Docker Engine + Docker Compose。
- **容器**: Supabase (約 12 個容器, 需 4-8GB RAM) + Next.js App + 其他服務。
- **建議規格**: **4 vCPU / 8GB RAM / 160GB SSD** (最少 8GB RAM 以求穩定)。
- **流量**: Phase 1 預估 200-500 GB/月 (含圖片/PDF)。

---

## 2. 各大廠方案與價格比較 (2024/2025)

### 2.1 Vultr (目前首選)
* **方案**: Cloud Compute - High Frequency (或 Optimized Cloud Compute)
* **規格**: 4 vCPU / 8GB RAM / 160GB NVMe / 4TB Bandwidth (部分方案可能為 3 vCPU)
* **價格**: 約 **$48/月** (High Frequency 3 vCPU) 或 **$60/月** (General Purpose 2 vCPU 8GB)
* **流量**: 4TB (遠大於需求)，超額 $0.01/GB。
* **優勢**: 性能好 (NVMe)，全球節點多。

### 2.2 DigitalOcean (DO)
* **方案**: Basic Droplet (Regular)
* **規格**: 4 vCPU / 8GB RAM / 160GB SSD / 5TB Transfer
* **價格**: **$48/月**
* **流量**: 5TB (充裕)，超額 $0.01/GiB。
* **優勢**: 介面友善，文件豐富，穩定。

### 2.3 Linode (Akamai)
* **方案**: Shared CPU Plan
* **規格**: 4 vCPU / 8GB RAM / 160GB Storage / 5TB Transfer
* **價格**: **$48/月**
* **流量**: 5TB (充裕)，超額 $0.005/GB (業界最低)。
* **優勢**: 超額流量費率低，適合未來流量爆發。

### 2.4 Hetzner (CP值之王，但位置受限)
* **方案**: Cloud CPX31 (AMD)
* **規格**: 4 vCPU / 8GB RAM / 160GB SSD / 20TB Traffic
* **價格**: 約 **€13.60/月** (約 $15 USD) - 德國/芬蘭；新加坡約 €25/月。
* **流量**: 20TB (極大)。
* **劣勢**: 主要機房在歐洲，**台灣連線延遲較高** (新加坡機房較貴且線路有時不穩)。若客群在台灣/澳洲，需評估延遲 (可搭配 Cloudflare CDN 改善)。

---

## 3. 綜合評估與建議

| 廠商 | 規格 (vCPU/RAM) | 月費 (約) | 流量限制 | 台灣/澳洲連線 | 推薦度 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vultr** | 3-4 vCPU / 8GB | $48 | 4 TB | ⭐⭐⭐⭐ (有東京/新加坡/雪梨) | **首選 (效能/線路佳)** |
| **Linode** | 4 vCPU / 8GB | $48 | 5 TB | ⭐⭐⭐⭐ (有東京/新加坡/雪梨) | **次選 (超額費率低)** |
| **DigitalOcean** | 4 vCPU / 8GB | $48 | 5 TB | ⭐⭐⭐ (有新加坡/雪梨) | 穩健選擇 |
| **Hetzner** | 4 vCPU / 8GB | ~$15 (歐) | 20 TB | ⭐⭐ (歐洲延遲高) | 預算極限時考慮 |

### 建議方案

1.  **首選 Vultr 或 Linode ($48/月)**:
    *   規格 (4 vCPU / 8GB) 足以支撐 Phase 1 的 Supabase + App。
    *   流量 4-5 TB 遠大於預估 (500 GB)，**無須擔心流量超額費用**。
    *   機房可選 **東京 (Tokyo)** 或 **新加坡 (Singapore)**，對台灣與澳洲連線皆尚可；或選 **雪梨 (Sydney)** 專攻澳洲市場 (台灣連澳洲約 150ms，尚可接受)。

2.  **省錢方案 Hetzner + CDN**:
    *   若能接受較高延遲 (或透過 Cloudflare CDN 加速靜態內容)，Hetzner 德國機房 ($15/月) 可省下約 70% 成本。
    *   **注意**: 動態 API 請求 (登入、寫入 DB) 仍會受物理距離延遲影響。

### 結論
針對 Phase 1 且考量流量與穩定性，建議使用 **$48/月 等級的 VPS (Vultr/Linode/DO)**。這個價位已包含足夠的流量 (4-5TB)，不需額外付費，且硬體資源 (8GB RAM) 足以順暢運行完整的 Docker 服務堆疊。
