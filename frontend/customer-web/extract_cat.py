import json
import re

try:
    with open(r'C:\Users\chung\.gemini\antigravity-ide\brain\cbeb05cf-6d55-46f8-8b73-df24c3025e04\.system_generated\steps\367\content.md', 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', content)
    if match:
        data = json.loads(match.group(1))
        props = data.get('props', {})
        
        def find_categories(obj):
            cats = set()
            if isinstance(obj, dict):
                if 'name' in obj and 'slug' in obj:
                    cats.add(obj['name'])
                for k, v in obj.items():
                    cats.update(find_categories(v))
            elif isinstance(obj, list):
                for item in obj:
                    cats.update(find_categories(item))
            return cats
            
        categories = find_categories(props)
        with open('categories.json', 'w', encoding='utf-8') as f:
            json.dump(list(categories), f, ensure_ascii=False, indent=2)
            print("Wrote to categories.json")
    else:
        print("No __NEXT_DATA__ found")
except Exception as e:
    print(e)
