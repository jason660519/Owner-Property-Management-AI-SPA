
import pandas as pd

file_path = '/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/Owner Property Management AI Project.xlsx'

try:
    xls = pd.ExcelFile(file_path)
    print("All Sheet Names:", xls.sheet_names)
    
    # Read first few rows of each sheet to get a glimpse of the content structure
    for sheet in xls.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
        print(df.columns.tolist())
        # Print first row of data if available
        if not df.empty:
            print(df.iloc[0].tolist())

except Exception as e:
    print(f"Error: {e}")
