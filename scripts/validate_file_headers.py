"""
檔案規範驗證腳本

創建日期: 2026-01-31
創建者: Claude Sonnet 4.5
最後修改: 2026-01-31
修改者: Claude Sonnet 4.5
版本: 1.0

用途: 驗證專案中的 Markdown 和程式碼檔案是否符合命名規範與格式要求
使用方式: python scripts/validate_file_headers.py
"""

import os
import re
from pathlib import Path
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """驗證結果"""
    file_path: str
    is_valid: bool
    error_message: str = ""


class FileHeaderValidator:
    """檔案頭部驗證器"""
    
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir)
        self.errors: List[ValidationResult] = []
        self.warnings: List[ValidationResult] = []
        
    def validate_markdown_metadata(self, file_path: Path) -> ValidationResult:
        """
        驗證 Markdown 檔案是否包含必要的 Metadata
        
        必填欄位:
        - 創建日期
        - 創建者
        - 版本
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read(800)  # 只讀前 800 字元
        except Exception as e:
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message=f"無法讀取檔案: {e}"
            )
        
        # 檢查必要欄位
        required_fields = {
            '創建日期': r'> \*\*創建日期\*\*:',
            '創建者': r'> \*\*創建者\*\*:',
            '版本': r'> \*\*版本\*\*:',
        }
        
        missing_fields = []
        for field_name, pattern in required_fields.items():
            if not re.search(pattern, content):
                missing_fields.append(field_name)
        
        if missing_fields:
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message=f"缺少必要的 Metadata 欄位: {', '.join(missing_fields)}"
            )
        
        return ValidationResult(file_path=str(file_path), is_valid=True)
    
    def validate_typescript_header(self, file_path: Path) -> ValidationResult:
        """
        驗證 TypeScript/JavaScript 檔案是否包含文件頭部註解
        
        必填欄位:
        - @creator
        - @created
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read(500)  # 只讀前 500 字元
        except Exception as e:
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message=f"無法讀取檔案: {e}"
            )
        
        # 檢查是否有文件頭部註解
        has_creator = '@creator' in content or '@modifiedBy' in content
        has_created = '@created' in content
        
        if not (has_creator and has_created):
            missing = []
            if not has_creator:
                missing.append('@creator')
            if not has_created:
                missing.append('@created')
            
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message=f"缺少文件頭部註解: {', '.join(missing)}"
            )
        
        return ValidationResult(file_path=str(file_path), is_valid=True)
    
    def validate_python_docstring(self, file_path: Path) -> ValidationResult:
        """
        驗證 Python 檔案是否包含模組 Docstring
        
        必填欄位:
        - 創建日期
        - 創建者
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read(500)
        except Exception as e:
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message=f"無法讀取檔案: {e}"
            )
        
        # 檢查是否有 Docstring
        if not content.strip().startswith('"""'):
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message="缺少模組 Docstring"
            )
        
        # 檢查必要欄位
        has_created_date = '創建日期:' in content or 'Created:' in content
        has_creator = '創建者:' in content or 'Creator:' in content
        
        if not (has_created_date and has_creator):
            missing = []
            if not has_created_date:
                missing.append('創建日期')
            if not has_creator:
                missing.append('創建者')
            
            return ValidationResult(
                file_path=str(file_path),
                is_valid=False,
                error_message=f"Docstring 缺少必要欄位: {', '.join(missing)}"
            )
        
        return ValidationResult(file_path=str(file_path), is_valid=True)
    
    def should_skip_file(self, file_path: Path) -> bool:
        """判斷是否應該跳過驗證"""
        skip_patterns = [
            # 排除自動生成的檔案
            'node_modules',
            '.next',
            'dist',
            'build',
            '__pycache__',
            '.git',
            # 排除配置檔案
            '.config.js',
            '.config.ts',
            '.config.mjs',
            'tsconfig.json',
            'package.json',
            # 排除特定檔案
            'database.ts',  # 由 Supabase CLI 生成
            'middleware.ts',  # 可能已存在
            # 排除根目錄的標準檔案
            'README.md',
            'CHANGELOG.md',
            'LICENSE',
            'CONTRIBUTING.md',
        ]
        
        str_path = str(file_path)
        return any(pattern in str_path for pattern in skip_patterns)
    
    def validate_all_files(self):
        """驗證專案中的所有檔案"""
        print("🔍 開始驗證專案檔案...\n")
        
        # 驗證 Markdown 文檔
        print("📝 檢查 Markdown 文檔...")
        md_count = 0
        for md_file in self.root_dir.rglob('*.md'):
            if self.should_skip_file(md_file):
                continue
            
            md_count += 1
            result = self.validate_markdown_metadata(md_file)
            if not result.is_valid:
                self.errors.append(result)
        
        print(f"   檢查了 {md_count} 個 Markdown 檔案")
        
        # 驗證 TypeScript 檔案
        print("\n💻 檢查 TypeScript/JavaScript 檔案...")
        ts_count = 0
        for pattern in ['*.ts', '*.tsx', '*.js', '*.jsx']:
            for ts_file in self.root_dir.rglob(pattern):
                if self.should_skip_file(ts_file):
                    continue
                
                # 只檢查重要的程式碼檔案（lib, hooks, types, components）
                str_path = str(ts_file)
                if any(x in str_path for x in ['/lib/', '/hooks/', '/types/', '/components/', '/src/']):
                    ts_count += 1
                    result = self.validate_typescript_header(ts_file)
                    if not result.is_valid:
                        self.warnings.append(result)
        
        print(f"   檢查了 {ts_count} 個 TypeScript/JavaScript 檔案")
        
        # 驗證 Python 檔案
        print("\n🐍 檢查 Python 檔案...")
        py_count = 0
        for py_file in self.root_dir.rglob('*.py'):
            if self.should_skip_file(py_file):
                continue
            
            # 排除測試檔案和 __init__.py
            if py_file.name == '__init__.py' or 'test_' in py_file.name:
                continue
            
            py_count += 1
            result = self.validate_python_docstring(py_file)
            if not result.is_valid:
                self.warnings.append(result)
        
        print(f"   檢查了 {py_count} 個 Python 檔案")
    
    def print_results(self):
        """輸出驗證結果"""
        print("\n" + "="*70)
        print("📊 驗證結果")
        print("="*70)
        
        if self.errors:
            print(f"\n❌ 發現 {len(self.errors)} 個錯誤（Markdown 文檔缺少 Metadata）：\n")
            for error in self.errors:
                print(f"   {error.file_path}")
                print(f"   └─ {error.error_message}\n")
        
        if self.warnings:
            print(f"\n⚠️  發現 {len(self.warnings)} 個警告（程式碼檔案缺少文件頭部註解）：\n")
            for warning in self.warnings[:10]:  # 只顯示前 10 個
                print(f"   {warning.file_path}")
                print(f"   └─ {warning.error_message}\n")
            
            if len(self.warnings) > 10:
                print(f"   ... 還有 {len(self.warnings) - 10} 個警告")
        
        if not self.errors and not self.warnings:
            print("\n✅ 所有檔案都符合規範！")
        
        print("\n" + "="*70)
        
        # 返回錯誤碼
        if self.errors:
            print("\n💡 建議：")
            print("   1. 閱讀 FILE_CREATION_CHECKLIST.md")
            print("   2. 為缺少 Metadata 的文檔添加必要欄位")
            print("   3. 參考 docs/本專案檔案命名規則與新增文件歸檔總則.md")
            return 1
        
        if self.warnings:
            print("\n💡 建議：")
            print("   為重要的程式碼檔案添加文件頭部註解")
            print("   參考 FILE_CREATION_CHECKLIST.md 中的範本")
            return 0
        
        return 0


def main():
    """主函數"""
    validator = FileHeaderValidator()
    validator.validate_all_files()
    exit_code = validator.print_results()
    exit(exit_code)


if __name__ == '__main__':
    main()
