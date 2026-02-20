# Phase 1 各大廠頻寬計費與流量限制整理

> **創建日期**: 2026-02-20  
> **適用**: 專案 Phase 1（約 100 房東）、全量自架於單一雲端 Linux instance（含 Supabase Docker）  
> **說明**: 以下為對外流量（egress）之計費與限制，**入站（ingress）各廠皆免費**。

---

## 1. 大廠（AWS / GCP / Azure）

### 1.1 AWS

| 項目 | 說明 |
|------|------|
| **免費額度** | 每月前 **100 GB** 對外流量免費 |
| **超過後** | 階梯計費：約 **$0.09/GB**（首 10 TB）、$0.085/GB（10–40 TB）、再高遞減 |
| **流量上限** | 無硬性 cap，按用量計費；instance 有對應網路頻寬上限（依實例型號） |
| **亞洲區** | 部分區域（如 ap-northeast-1）價格可能略高，以官方 Pricing 為準 |

### 1.2 Google Cloud (GCP)

| 項目 | 說明 |
|------|------|
| **免費額度** | **Standard Tier**：前 **200 GiB/月** 免費；**Premium Tier** 無免費 egress |
| **超過後** | Standard：約 **$0.085/GiB**（200 GiB–10 TiB），再高遞減；Premium：約 $0.12/GiB 起 |
| **流量上限** | 無硬性 cap，按用量計費 |
| **亞洲** | 往亞洲/南美等目的地單價較高（約 $0.15–0.19/GiB，依目的地） |

### 1.3 Microsoft Azure

| 項目 | 說明 |
|------|------|
| **免費額度** | 每月前 **100 GB** 對外流量免費 |
| **超過後** | 階梯計費，依目的地與傳輸方式（標準/進階網路）不同 |
| **流量上限** | 無硬性 cap，按用量計費 |
| **同區域 / 同 VNET** | 區內與同 VNET 傳輸免費 |

---

## 2. VPS 型廠商（DigitalOcean / Vultr / Linode）

### 2.1 DigitalOcean

| 項目 | 說明 |
|------|------|
| **含量** | 依 Droplet 方案，約 **1–10 TB/月** 不等（依方案大小） |
| **超額** | **$0.01/GiB**（約 $10/TB） |
| **流量上限** | 無硬 cap，超額按 GiB 計費；帳戶級合計 |

### 2.2 Vultr

| 項目 | 說明 |
|------|------|
| **含量** | **2 TB/月** 免費 egress（帳戶級、可跨 instance 合併） |
| **超額** | **$0.01/GB**（約 $10/TB） |
| **流量上限** | 無硬 cap，超額按 GB 計費 |

### 2.3 Linode (Akamai)

| 項目 | 說明 |
|------|------|
| **含量** | 依方案約 **1–20 TB/月** |
| **超額** | **$0.005/GB**（約 **$5/TB**，三者中最低） |
| **流量上限** | 無硬 cap，超額按 GB 計費 |

---

## 3. Phase 1 粗估流量與建議

### 3.1 Phase 1 情境（約 100 房東）

- 主要流量：**物件照片、影片、權狀 PDF**；其餘為 JSON/API。
- 粗估（僅供數量級）：若每房東每月平均 **2–5 GB** 下載（列表縮圖 + 詳情圖/PDF），則 **月 egress 約 200–500 GB**；若使用 CDN 或快取，實際從主機出去的流量會更低。

### 3.2 與各廠免費額度對照

| 廠商 | 免費/含量（約） | Phase 1 粗估 200–500 GB 時 |
|------|-----------------|----------------------------|
| **AWS** | 100 GB/月 | 超出部分約 **$9–36/月**（以 $0.09/GB 計） |
| **GCP Standard** | 200 GiB/月 | 超出部分約 **$0–25/月**（以 $0.085/GiB 計） |
| **Azure** | 100 GB/月 | 超出部分約 **$9–36/月** |
| **DigitalOcean** | 依方案 1–10 TB | 多數方案可涵蓋，超額 $10/TB |
| **Vultr** | 2 TB/月 | **完全在含量內**，egress  $0 |
| **Linode** | 依方案 1–20 TB | 多數方案可涵蓋，超額 $5/TB |

### 3.3 簡要結論

- **Phase 1 無硬性「流量 cap」問題**：各廠皆為按量計費或「含量 + 超額」，不會被強制斷網。
- **若要壓低頻寬成本**：可優先考慮 **Vultr（2 TB 免費）** 或 **Linode（含量高、超額 $5/TB）**；若選 AWS/GCP/Azure，Phase 1 流量下月增約 **$10–40** 級 egress 費屬合理範圍。
- **實際計費**請以各廠最新 Pricing 與所選區域為準；本文僅供 Phase 1 規劃參考。

---

## 4. Vultr 單機全包：RAM、年費、容器管理澄清

### 4.1 選 Vultr 可以嗎？

可以。Phase 1 流量粗估 200–500 GB/月，Vultr 的 **2 TB/月** 含量足夠，egress 成本 $0，很適合「全部在一台 VPS 上跑」的作法。

### 4.2 Docker Desktop 8GB 是「本機」的事，VPS 不用 Desktop

- **Docker Desktop**（要 8GB RAM）是給 **Mac / Windows** 用的：裡面跑一個 Linux VM，所以吃記憶體多。
- 你的 **VPS 是 Linux**，上面裝的是 **Docker Engine**（`docker` + `dockerd`），**沒有** Docker Desktop，也沒有那顆 VM。
- 所以：**不需要為了「跑 Docker」在 VPS 上多留 8GB**。VPS 上 Docker 就是一般 process，吃多少算多少；真正吃 RAM 的是 **Supabase 那十幾個 container**。

### 4.3 自架 Supabase + 應用，RAM 怎麼抓？

| 項目 | 說明 |
|------|------|
| **Supabase 自架（官方 Docker）** | 最低 **4 GB**，建議 **8 GB**；約 12 個容器（DB、Auth、Realtime、Storage 等）。 |
| **再加 Next.js / 其他服務** | 同一台再跑 app，建議整機 **至少 4 GB**，**8 GB 較穩**（Phase 1 單機全包建議 **8 GB**）。 |

所以：**不是「Docker Desktop 8GB + 所以至少要 12GB」**；而是「Supabase + 應用建議 8GB 主機」，與 Docker Desktop 無關。

### 4.4 Vultr 一台 VPS 一年大概多少錢？（參考）

| 方案（參考） | RAM | 月費（約） | 年費（約） | 含量 |
|--------------|-----|------------|------------|------|
| General Purpose | 4 GB | ~$30 | **~$360** | 依方案（部分 4TB） |
| High Frequency | 8 GB | ~$48 | **~$576** | 4TB 級 |

- 以上為公開報價區間，實際以 [Vultr 官網](https://www.vultr.com/pricing/) 為準。
- 若 Phase 1 全塞一台：**建議 8GB 方案**，年費約 **$576** 級；若只跑 Supabase 且關掉部分服務，4GB 可試，年費約 **$360** 級。

### 4.5 不用 Docker Desktop，還有更輕的容器管理嗎？（VPS 上）

在 **Linux VPS** 上本來就不會裝 Docker Desktop，只會用底下其中一種：

| 方式 | 說明 |
|------|------|
| **Docker Engine + Compose** | 官方做法：`docker` + `docker-compose`，無 GUI，無多餘 VM，已很輕。Supabase 自架文件即以此為準。 |
| **Podman + podman-compose** | 無 daemon、可 rootless，記憶體約比 Docker 再少一點（約 85MB vs 約 100MB），指令與 Docker 相容。若你要「更輕、更省」可考慮；需自行確認 Supabase 的 `docker-compose` 在 Podman 上是否需微調。 |

**建議**：VPS 上直接用 **Docker Engine + Docker Compose** 即可，不需 Docker Desktop，也沒有更重一層的「管理工具」；若日後想再省一點資源再評估 **Podman**。

### 4.6 小結

- **Vultr**：2 TB 免費 egress，適合 Phase 1 單機全包。
- **RAM**：8GB VPS 足夠跑 Supabase + 應用；Docker Desktop 的 8GB 是本機（Mac/Windows）的事，不影響 VPS 規格。
- **年費**：約 **$360（4GB）～$576（8GB）**，依選用方案與地區而異。
- **容器**：VPS 上用 **Docker Engine + Compose** 即可，不必、也不應裝 Docker Desktop；若要更輕可考慮 **Podman**。
