import sys
import re

def is_printable_utf16(code_point):
    # ASCII printable
    if 0x20 <= code_point <= 0x7E:
        return True
    # CJK Unified Ideographs
    if 0x4E00 <= code_point <= 0x9FFF:
        return True
    # Fullwidth ASCII variants (often used in CJK context)
    if 0xFF00 <= code_point <= 0xFFEF:
        return True
    # Hiragana/Katakana (if needed, but user seems Chinese context)
    if 0x3040 <= code_point <= 0x30FF:
        return True
    # General punctuation
    if 0x3000 <= code_point <= 0x303F:
        return True
    return False

def extract_strings(file_path, output_path):
    print(f"Processing {file_path}...")
    chunk_size = 1024 * 1024  # 1MB
    min_chars = 3
    
    with open(file_path, "rb") as f, open(output_path, "w", encoding="utf-8") as out:
        overlap = b""
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            
            # Prepend overlap from previous chunk
            data = overlap + chunk
            
            # Decode with replacement
            # Since we could start in the middle of a 2-byte char if alignment is wrong,
            # this might produce garbage at the very start, but it self-corrects quickly (at next ASCII).
            text = data.decode('utf-16le', errors='replace')
            
            processed_run = []
            for char in text:
                if is_printable_utf16(ord(char)):
                    processed_run.append(char)
                else:
                    if len(processed_run) >= min_chars:
                        out.write("".join(processed_run) + "\n")
                    processed_run = []
            
            # flush last run
            if len(processed_run) >= min_chars:
                out.write("".join(processed_run) + "\n")

            # Prepare overlap for next chunk (last 2 bytes)
            overlap = chunk[-2:]
            
    print("Done extraction.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_strings.py input output")
    else:
        extract_strings(sys.argv[1], sys.argv[2])
