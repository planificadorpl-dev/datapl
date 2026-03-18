import pandas as pd
import json

try:
    # Read the Excel file
    # Note: openpyxl is needed for .xlsx files
    df = pd.read_excel('Sectores.xlsx')
    
    # Display the first few rows
    print("--- First 5 rows ---")
    print(df.head())
    
    print("\n--- Column Names ---")
    print(df.columns.tolist())
    
    print("\n--- Basic Statistics ---")
    print(df.describe(include='all'))
    
    # Convert to JSON for structured output if needed
    result = {
        "columns": df.columns.tolist(),
        "preview": df.head().to_dict(orient='records'),
        "total_rows": len(df)
    }
    
    with open('sectores_analysis.json', 'w') as f:
        json.dump(result, f, indent=2)
        
except Exception as e:
    print(f"Error: {e}")
