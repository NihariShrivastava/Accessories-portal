import os, re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to match the old logic ignoring whitespace
    old_pattern = re.compile(r"item\.bill_number\.split\('-'\)\.length\s*>\s*2\s*\?\s*item\.bill_number\.substring\(0,\s*item\.bill_number\.lastIndexOf\('-'\)\)\s*:\s*item\.bill_number")
    
    new_str = "/-\\d+$/.test(item.bill_number) ? item.bill_number.replace(/-\\d+$/, '') : item.bill_number"

    new_content = old_pattern.sub(new_str, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

process_file('src/hooks/useTeamLeadData.ts')
process_file('src/hooks/useAdminData.ts')
process_file('src/hooks/useCounterData.ts')
print("Done")
