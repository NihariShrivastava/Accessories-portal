import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The string to replace
    old_str = "item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number"
    
    # The new robust logic: if it strictly ends with -\d+, strip the -\d+, otherwise keep it.
    new_str = "/-\\d+$/.test(item.bill_number) ? item.bill_number.replace(/-\\d+$/, '') : item.bill_number"

    new_content = content.replace(old_str, new_str)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

process_file('src/hooks/useTeamLeadData.ts')
process_file('src/hooks/useAdminData.ts')
process_file('src/hooks/useCounterData.ts')
print("Done")
