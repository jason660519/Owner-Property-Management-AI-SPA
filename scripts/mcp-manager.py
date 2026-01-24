#!/usr/bin/env python3
# filepath: scripts/mcp-manager.py
# description: MCP Server 管理工具 - 啟用/停用/查看 MCP servers

import json
import sys
from pathlib import Path

MCP_CONFIG_PATH = Path(__file__).parent.parent / '.claude' / '.mcp.json'

def load_config():
    """載入 MCP 配置"""
    with open(MCP_CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(config):
    """儲存 MCP 配置"""
    with open(MCP_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ 配置已儲存至 {MCP_CONFIG_PATH}")

def list_servers():
    """列出所有 MCP servers"""
    config = load_config()
    servers = config.get('mcpServers', {})

    enabled = [name for name, cfg in servers.items() if not cfg.get('disabled', False)]
    disabled = [name for name, cfg in servers.items() if cfg.get('disabled', False)]

    print("\n╔════════════════════════════════════════════════════════╗")
    print("║          MCP Servers 狀態                              ║")
    print("╚════════════════════════════════════════════════════════╝\n")

    print(f"📊 總計：{len(servers)} 個")
    print(f"✅ 啟用：{len(enabled)} 個")
    print(f"❌ 停用：{len(disabled)} 個\n")

    if enabled:
        print("✅ 啟用中的 Servers:")
        for i, name in enumerate(enabled, 1):
            print(f"  {i}. {name}")

    if disabled:
        print("\n❌ 已停用的 Servers:")
        for i, name in enumerate(disabled, 1):
            print(f"  {i}. {name}")

    print()

def enable_server(server_name):
    """啟用指定的 MCP server"""
    config = load_config()
    servers = config.get('mcpServers', {})

    if server_name not in servers:
        print(f"❌ 錯誤：找不到名為 '{server_name}' 的 MCP server")
        print(f"可用的 servers: {', '.join(servers.keys())}")
        return

    servers[server_name]['disabled'] = False
    save_config(config)
    print(f"✅ 已啟用 MCP server: {server_name}")
    print("⚠️  請重啟 Claude Code 以套用變更")

def disable_server(server_name):
    """停用指定的 MCP server"""
    config = load_config()
    servers = config.get('mcpServers', {})

    if server_name not in servers:
        print(f"❌ 錯誤：找不到名為 '{server_name}' 的 MCP server")
        print(f"可用的 servers: {', '.join(servers.keys())}")
        return

    servers[server_name]['disabled'] = True
    save_config(config)
    print(f"❌ 已停用 MCP server: {server_name}")
    print("⚠️  請重啟 Claude Code 以套用變更")

def show_help():
    """顯示幫助訊息"""
    print("""
MCP Server 管理工具

用法:
  python scripts/mcp-manager.py <command> [arguments]

指令:
  list                列出所有 MCP servers 及其狀態
  enable <name>       啟用指定的 MCP server
  disable <name>      停用指定的 MCP server
  help                顯示此幫助訊息

範例:
  python scripts/mcp-manager.py list
  python scripts/mcp-manager.py disable slack
  python scripts/mcp-manager.py enable slack

注意:
  - 修改配置後需要重啟 Claude Code 才會生效
  - 停用的 server 不會被載入，可節省資源
""")

def main():
    if len(sys.argv) < 2:
        show_help()
        return

    command = sys.argv[1].lower()

    if command == 'list':
        list_servers()
    elif command == 'enable':
        if len(sys.argv) < 3:
            print("❌ 錯誤：請指定要啟用的 server 名稱")
            print("範例: python scripts/mcp-manager.py enable slack")
            return
        enable_server(sys.argv[2])
    elif command == 'disable':
        if len(sys.argv) < 3:
            print("❌ 錯誤：請指定要停用的 server 名稱")
            print("範例: python scripts/mcp-manager.py disable slack")
            return
        disable_server(sys.argv[2])
    elif command == 'help':
        show_help()
    else:
        print(f"❌ 錯誤：未知的指令 '{command}'")
        show_help()

if __name__ == '__main__':
    main()
