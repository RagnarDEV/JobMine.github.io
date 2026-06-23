import urllib.request
import urllib.parse
import json
import os
import xml.etree.ElementTree as ET
import shutil
import sys
from datetime import datetime

# 1. إعداد المتغيرات السرية
secrets_raw = os.getenv("ALL_SECRETS")
if secrets_raw:
    try:
        secrets_dict = json.loads(secrets_raw)
        for key, value in secrets_dict.items():
            os.environ[key] = str(value)
    except: pass

def map_category(tags):
    tags_lower = [t.lower() for t in tags]
    if any(k in ' '.join(tags_lower) for k in ['dev', 'engineer', 'code', 'python', 'react']): return 'Development'
    if any(k in ' '.join(tags_lower) for k in ['design', 'ui', 'ux']): return 'Design'
    return 'Other Remote Jobs'

def save_and_optimize(jobs, file_path):
    # ترتيب وتصفية
    jobs.sort(key=lambda x: x.get('date', ''), reverse=True)
    for i, job in enumerate(jobs): job['id'] = i + 1
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(jobs[:500], f, ensure_ascii=False, indent=2)
    print(f"✅ تم حفظ {len(jobs)} وظيفة.")

def fetch_from_fantastic():
    print("🚀 محرك Fantastic Active...")
    api_key = os.getenv("FANTASTIC_API_KEY", "").strip()
    if not api_key: return []
    
    # الرابط والبارامترات المصححة
    url = "https://active-jobs-db.p.rapidapi.com/active-ats"
    params = {"limit": "50", "title": "Developer"}
    url = f"{url}?{urllib.parse.urlencode(params)}"
    
    headers = {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": api_key,
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            jobs = []
            for j in (data if isinstance(data, list) else data.get('jobs', [])):
                jobs.append({
                    "title": j.get('title', 'Remote Job'),
                    "company": j.get('company', 'Tech Co'),
                    "category": map_category([j.get('title', '')]),
                    "apply_link": j.get('url', 'https://google.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
            return jobs
    except Exception as e:
        print(f"⚠️ خطأ: {e}")
        return []

def main():
    file_path = os.path.join(os.path.dirname(__file__), 'jobs.json')
    new_jobs = fetch_from_fantastic()
    if new_jobs:
        save_and_optimize(new_jobs, file_path)
    else:
        print("⚠️ لم يتم جلب وظائف جديدة، تم الإبقاء على القديم.")

if __name__ == "__main__":
    main()
