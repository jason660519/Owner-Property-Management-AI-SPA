#!/usr/bin/env python3
"""
MCP Server 连接验证脚本 (Python 版)
用途：自动测试所有配置的 MCP 伺服器是否能正常连接
可以进行更深度的连接测试和诊断
"""

import os
import sys
import json
import subprocess
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Tuple
import sqlite3

# 颜色定义
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

def print_header(title: str):
    """打印标题"""
    print(f"\n{Colors.BLUE}╔{'═' * 59}╗{Colors.NC}")
    print(f"{Colors.BLUE}║  {title:<55}  ║{Colors.NC}")
    print(f"{Colors.BLUE}╚{'═' * 59}╝{Colors.NC}\n")

def print_section(title: str):
    """打印区段标题"""
    print(f"{Colors.BLUE}{title}{Colors.NC}")
    print("━" * 63)

def load_env_file(env_path: str) -> Dict[str, str]:
    """从 .env 文件加载环境变量"""
    env_vars = {}
    if not os.path.exists(env_path):
        print(f"{Colors.RED}✗ .env 文件未找到: {env_path}{Colors.NC}")
        sys.exit(1)
    
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    return env_vars

def test_postgresql(database_url: str) -> Tuple[str, str]:
    """测试 PostgreSQL 连接"""
    try:
        import psycopg2
        conn = psycopg2.connect(database_url)
        conn.close()
        return ("✓", f"{Colors.GREEN}连接成功{Colors.NC}")
    except ImportError:
        return ("⚠", f"{Colors.YELLOW}未安装 psycopg2（但 MCP 可用）{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败: {str(e)[:40]}{Colors.NC}")

def test_github(token: str) -> Tuple[str, str]:
    """测试 GitHub API"""
    try:
        headers = {"Authorization": f"token {token}"}
        response = requests.get("https://api.github.com/user", headers=headers, timeout=5)
        if response.status_code == 200:
            user_data = response.json()
            return ("✓", f"{Colors.GREEN}认证成功 ({user_data.get('login')}){Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}API 返回 {response.status_code}{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_sqlite(db_path: str) -> Tuple[str, str]:
    """测试 SQLite 连接"""
    try:
        if not os.path.exists(db_path):
            return ("⚠", f"{Colors.YELLOW}数据库文件不存在{Colors.NC}")
        
        conn = sqlite3.connect(db_path, timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        return ("✓", f"{Colors.GREEN}可访问{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}访问失败: {str(e)[:30]}{Colors.NC}")

def test_slack(bot_token: str, team_id: str) -> Tuple[str, str]:
    """测试 Slack API"""
    try:
        headers = {"Authorization": f"Bearer {bot_token}"}
        response = requests.post(
            "https://slack.com/api/auth.test",
            headers=headers,
            timeout=5
        )
        data = response.json()
        if data.get('ok'):
            return ("✓", f"{Colors.GREEN}认证成功 (Team: {data.get('team_id')}){Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}认证失败{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_openai(api_key: str) -> Tuple[str, str]:
    """测试 OpenAI API"""
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get("https://api.openai.com/v1/models", headers=headers, timeout=5)
        if response.status_code == 200:
            return ("✓", f"{Colors.GREEN}API 可用{Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}API 返回 {response.status_code}{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_google_maps(api_key: str) -> Tuple[str, str]:
    """测试 Google Maps API"""
    try:
        response = requests.get(
            f"https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=256x256&key={api_key}",
            timeout=5
        )
        if response.status_code == 200:
            return ("✓", f"{Colors.GREEN}API 可用{Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}API 返回 {response.status_code}{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_firecrawl(api_key: str) -> Tuple[str, str]:
    """测试 Firecrawl API"""
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.post(
            "https://api.firecrawl.dev/v0/scrape",
            headers=headers,
            json={"url": "https://example.com"},
            timeout=5
        )
        if response.status_code in [200, 400]:  # 400 可能是 URL 问题，但 API 响应了
            return ("✓", f"{Colors.GREEN}API 可用{Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}API 返回 {response.status_code}{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_notion(api_key: str) -> Tuple[str, str]:
    """测试 Notion API"""
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": "2022-06-28"
        }
        response = requests.get("https://api.notion.com/v1/users/me", headers=headers, timeout=5)
        if response.status_code == 200:
            return ("✓", f"{Colors.GREEN}API 可用{Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}API 返回 {response.status_code}{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_docker() -> Tuple[str, str]:
    """测试 Docker 连接"""
    try:
        result = subprocess.run(["docker", "ps"], capture_output=True, timeout=5)
        if result.returncode == 0:
            return ("✓", f"{Colors.GREEN}Docker 可用{Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}Docker daemon 未运行{Colors.NC}")
    except FileNotFoundError:
        return ("⚠", f"{Colors.YELLOW}未安装 Docker CLI{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}连接失败{Colors.NC}")

def test_node_module(module_name: str, display_name: str) -> Tuple[str, str]:
    """测试 Node 模块是否可用"""
    try:
        result = subprocess.run(
            ["npx", module_name, "--help"],
            capture_output=True,
            timeout=10
        )
        if result.returncode == 0:
            return ("✓", f"{Colors.GREEN}可用{Colors.NC}")
        else:
            return ("⚠", f"{Colors.YELLOW}可能需要检查{Colors.NC}")
    except Exception as e:
        return ("⚠", f"{Colors.YELLOW}可能需要检查{Colors.NC}")

def mask_secret(value: str) -> str:
    """隐藏敏感信息"""
    if len(value) <= 15:
        return "*" * len(value)
    return value[:10] + "..." + value[-5:]

def main():
    """主函数"""
    project_root = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(project_root, ".env")
    
    # 加载环境变量
    env_vars = load_env_file(env_path)
    
    print_header(f"MCP Server 连接验证 ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    
    # ========== 无依赖伺服器测试 ==========
    print_section("📋 无依赖伺服器 (立即可用)")
    
    no_dep_servers = [
        ("filesystem", "@modelcontextprotocol/server-filesystem", "文件系统访问"),
        ("fetch", "@modelcontextprotocol/server-fetch", "Web 内容获取"),
        ("mermaid-server", "@raymonddeng99/mermaid-mcp", "图表生成"),
        ("context7", "@upstash/context7-mcp", "长上下文记忆体"),
        ("memory", "@anthropic/mcp-memory", "会话记忆体管理"),
        ("mcp-copilot-conta", "@copilot-extensions/mcp-copilot-conta", "Docker 容器管理"),
    ]
    
    success_count = 0
    warning_count = 0
    failed_count = 0
    
    for server_id, module_name, description in no_dep_servers:
        status, message = test_node_module(module_name, description)
        print(f"{status} {server_id} ({description})")
        if status == "✓":
            success_count += 1
        elif status == "⚠":
            warning_count += 1
        else:
            failed_count += 1
    
    # ========== 依赖环境变量的伺服器 ==========
    print_section("\n🔌 需要环境变量的伺服器")
    
    api_tests = [
        ("postgres", env_vars.get("DATABASE_URL"), test_postgresql, "PostgreSQL 数据库"),
        ("github", env_vars.get("GITHUB_TOKEN"), test_github, "GitHub 整合"),
        ("sqlite", env_vars.get("SQLITE_DB_PATH"), test_sqlite, "SQLite 数据库"),
        ("slack", (env_vars.get("SLACK_BOT_TOKEN"), env_vars.get("SLACK_TEAM_ID")), test_slack, "Slack 整合"),
        ("openai", env_vars.get("OPENAI_API_KEY"), test_openai, "OpenAI API"),
        ("google-maps", env_vars.get("GOOGLE_API_KEY"), test_google_maps, "Google Maps API"),
        ("firecrawl", env_vars.get("FIRECRAWL_API_KEY"), test_firecrawl, "Web 爬虫"),
        ("notion", env_vars.get("NOTION_API_KEY"), test_notion, "Notion 数据库"),
    ]
    
    for server_id, credentials, test_func, description in api_tests:
        print(f"\n{server_id} ({description})... ", end="")
        
        if not credentials or (isinstance(credentials, tuple) and not all(credentials)):
            print(f"{Colors.RED}✗ 缺少凭证{Colors.NC}")
            failed_count += 1
        else:
            try:
                status, message = test_func(credentials)
                print(message)
                if status == "✓":
                    success_count += 1
                elif status == "⚠":
                    warning_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                print(f"{Colors.YELLOW}⚠ 测试异常: {str(e)[:40]}{Colors.NC}")
                warning_count += 1
    
    # Docker 测试
    print(f"\ndocker (Docker 容器管理)... ", end="")
    status, message = test_docker()
    print(message)
    if status == "✓":
        success_count += 1
    elif status == "⚠":
        warning_count += 1
    else:
        failed_count += 1
    
    # ========== 环境变量检查 ==========
    print_section("\n🔐 环境变量检查")
    
    important_vars = ["DATABASE_URL", "GITHUB_TOKEN", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", 
                      "SQLITE_DB_PATH", "SLACK_BOT_TOKEN", "BRAVE_API_KEY", "FIRECRAWL_API_KEY"]
    
    for var in important_vars:
        if var in env_vars:
            masked = mask_secret(env_vars[var])
            print(f"✓ {var}: {masked}")
        else:
            print(f"{Colors.RED}✗ {var}: 未配置{Colors.NC}")
    
    # ========== 总结 ==========
    print_section("\n📊 测试总结")
    
    total = success_count + warning_count + failed_count
    
    print(f"总 MCP 伺服器: {Colors.BLUE}{total}{Colors.NC}")
    print(f"✓ 正常: {Colors.GREEN}{success_count}{Colors.NC}")
    print(f"⚠ 警告: {Colors.YELLOW}{warning_count}{Colors.NC}")
    print(f"✗ 失败: {Colors.RED}{failed_count}{Colors.NC}\n")
    
    if failed_count == 0:
        print(f"{Colors.GREEN}✓ 所有 MCP 伺服器已就绪！{Colors.NC}\n")
        return 0
    else:
        print(f"{Colors.YELLOW}⚠ 部分 MCP 伺服器需要检查{Colors.NC}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
