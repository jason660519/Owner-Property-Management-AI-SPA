"""
批量添加 Metadata 到 Markdown 文件

創建日期: 2026-01-31
創建者: Claude Sonnet 4.5
最後修改: 2026-01-31
修改者: Claude Sonnet 4.5
版本: 1.0

用途: 為缺少 Metadata 的歷史 Markdown 文件批量添加基本的 Metadata
使用方式: python scripts/add_metadata_batch.py [--dry-run] [--file-pattern <pattern>]
"""

import os
import re
from pathlib import Path
from datetime import datetime
from typing import List, Optional
import argparse


class MetadataAdder:
    """Markdown 文件 Metadata 添加器"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.processed_files: List[str] = []
        self.skipped_files: List[str] = []
        self.error_files: List[str] = []
        
    def has_metadata(self, content: str) -> bool:
        """檢查文件是否已有 Metadata"""
        # 檢查前 800 字元是否包含 Metadata 標記
        header = content[:800]
        return bool(re.search(r'> \*\*創建日期\*\*:', header))
    
    def get_file_date(self, file_path: Path) -> str:
        """獲取文件的修改日期作為創建日期"""
        try:
            mtime = os.path.getmtime(file_path)
            return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
        except:
            return datetime.now().strftime('%Y-%m-%d')
    
    def determine_doc_type(self, file_path: Path) -> str:
        """根據文件路徑判斷文件類型"""
        path_str = str(file_path).lower()
        
        if 'progress-report' in path_str or 'sdlc' in path_str:
            return '進度報告'
        elif 'roadmap' in path_str or 'sprint' in path_str:
            return '專案規劃'
        elif 'architecture' in path_str or '架構' in path_str:
            return '技術文件'
        elif 'guide' in path_str or '指南' in path_str:
            return '開發指南'
        elif 'design' in path_str:
            return '設計文件'
        elif 'test' in path_str:
            return '測試報告'
        elif 'ocr' in path_str:
            return '技術文件'
        elif 'readme' in path_str.lower():
            return '專案說明'
        else:
            return '技術文件'
    
    def create_metadata_block(self, file_path: Path) -> str:
        """創建 Metadata 區塊"""
        file_date = self.get_file_date(file_path)
        doc_type = self.determine_doc_type(file_path)
        
        metadata = f"""
> **創建日期**: {file_date}  
> **創建者**: Project Team  
> **最後修改**: {file_date}  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: {doc_type}

---

"""
        return metadata
    
    def add_metadata_to_file(self, file_path: Path) -> bool:
        """為單個文件添加 Metadata"""
        try:
            # 讀取文件內容
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 檢查是否已有 Metadata
            if self.has_metadata(content):
                self.skipped_files.append(str(file_path))
                return False
            
            # 找到第一個標題
            lines = content.split('\n')
            title_index = -1
            
            for i, line in enumerate(lines):
                if line.strip().startswith('#'):
                    title_index = i
                    break
            
            if title_index == -1:
                print(f"⚠️  {file_path}: 找不到標題，跳過")
                self.skipped_files.append(str(file_path))
                return False
            
            # 插入 Metadata
            metadata = self.create_metadata_block(file_path)
            
            # 重組內容
            new_content = (
                '\n'.join(lines[:title_index + 1]) + '\n' +
                metadata +
                '\n'.join(lines[title_index + 1:])
            )
            
            # Dry run 模式只顯示不寫入
            if self.dry_run:
                print(f"✓ [DRY RUN] {file_path}")
                self.processed_files.append(str(file_path))
                return True
            
            # 寫入文件
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"✓ {file_path}")
            self.processed_files.append(str(file_path))
            return True
            
        except Exception as e:
            print(f"❌ {file_path}: {e}")
            self.error_files.append(f"{file_path}: {e}")
            return False
    
    def process_directory(self, directory: Path, pattern: str = "**/*.md"):
        """處理目錄中的所有 Markdown 文件"""
        print(f"🔍 掃描目錄: {directory}")
        print(f"📋 文件模式: {pattern}")
        print()
        
        # 排除模式
        skip_patterns = [
            'node_modules',
            '.next',
            'dist',
            'build',
            '.git',
            # 排除已知符合規範的文件
            'FILE_CREATION_CHECKLIST.md',
            'CLAUDE.md',
            '認證系統架構設計.md',
            'Supabase_Auth_整合指南.md',
            'API整合層架構設計.md',
            '認證系統快速啟動.md',
            '阻塞解除完成報告',
            '文件規範遵循改善報告',
        ]
        
        for md_file in directory.rglob(pattern):
            # 跳過特定模式
            if any(pattern in str(md_file) for pattern in skip_patterns):
                continue
            
            # 跳過以 ._ 開頭的檔案（macOS 系統檔案）
            if md_file.name.startswith('._'):
                continue
            
            # 跳過 README.md, CHANGELOG.md 等根目錄標準檔案
            if md_file.parent == directory and md_file.name in ['README.md', 'CHANGELOG.md', 'LICENSE.md']:
                continue
            
            self.add_metadata_to_file(md_file)
    
    def print_summary(self):
        """打印處理總結"""
        print("\n" + "="*70)
        print("📊 處理總結")
        print("="*70)
        
        print(f"\n✅ 已處理: {len(self.processed_files)} 個文件")
        print(f"⏭️  已跳過: {len(self.skipped_files)} 個文件（已有 Metadata）")
        print(f"❌ 錯誤: {len(self.error_files)} 個文件")
        
        if self.error_files and len(self.error_files) <= 10:
            print("\n錯誤詳情:")
            for error in self.error_files:
                print(f"  - {error}")
        
        if self.dry_run:
            print("\n💡 這是 Dry Run 模式，未實際修改文件")
            print("   移除 --dry-run 參數以執行實際修改")
        
        print("\n" + "="*70)


def main():
    parser = argparse.ArgumentParser(
        description='為 Markdown 文件批量添加 Metadata'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Dry run 模式，只顯示不實際修改'
    )
    parser.add_argument(
        '--directory',
        type=str,
        default='.',
        help='要處理的目錄路徑（預設：當前目錄）'
    )
    parser.add_argument(
        '--pattern',
        type=str,
        default='**/*.md',
        help='文件匹配模式（預設：**/*.md）'
    )
    
    args = parser.parse_args()
    
    # 創建處理器
    adder = MetadataAdder(dry_run=args.dry_run)
    
    # 處理目錄
    directory = Path(args.directory)
    if not directory.exists():
        print(f"❌ 目錄不存在: {directory}")
        exit(1)
    
    adder.process_directory(directory, args.pattern)
    adder.print_summary()
    
    # 返回錯誤碼
    exit(0 if not adder.error_files else 1)


if __name__ == '__main__':
    main()
