# Linux CLI / Shell「SDK」資源整理

Linux CLI 本身不是單一產品的 SDK；常見需求是「用程式呼叫 shell/commands」或「寫可攜式 shell script」。以下整理偏向：可攜式規格（POSIX）與 Bash 官方文件。

來源：
- GNU Bash Reference Manual：https://www.gnu.org/software/bash/manual/bash
- POSIX Shell Command Language（Open Group）：https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/utilities/V3_chap02.html

## 1) POSIX Shell Command Language（可攜式腳本基準）

用途：
- 你要寫「跨 Linux/Unix」更可攜的 shell script（偏 `sh` 語法），先以 POSIX Shell Command Language 作為語法/行為基準。

文件：
- https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/utilities/V3_chap02.html

## 2) Bash Manual（Bash 專屬特性 / 進階用法）

用途：
- 你明確使用 Bash（`#!/usr/bin/env bash`），想用陣列、`[[ ]]`、process substitution 等 Bash 特性。

文件：
- https://www.gnu.org/software/bash/manual/bash

