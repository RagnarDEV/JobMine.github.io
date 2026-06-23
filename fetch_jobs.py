import urllib.request
import urllib.parse
import json
import os
from datetime import datetime

def map_category(tags):
    tags_lower = [t.lower() for t in tags]
    if any(k in ' '.join(tags_lower) for k in ['dev', 'engineer', 'code', 'python', 'react']): return 'Development'
    if any(k in ' '.join(tags_lower) for k in ['design', 'ui', 'ux']): return 'Design'
    return 'Other Remote Jobs'

def fetch_from_fantastic():
    # جلب المفتاح مباشرة من البيئة
    api_key = os.environ.get("FANTASTIC_API_KEY", "").strip()
    
    if not api_key:
        print("⚠️ مفتاح FANTASTIC_API_KEY مفقود في البيئة!")
        return []

    print("🚀 محرك Fantastic Active قيد التشغيل...")
    
    # الرابط المباشر
    url = "https://active-jobs-db.p.rapidapi.com/active-ats?limit=50&title=Developer"
    
    headers = {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": api_key,
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            job_list = data if isinstance(data, list) else data.get('jobs', [])
            
            jobs = []
            for j in job_list:
                jobs.append({
                    "title": j.get('title', 'Remote Job'),
                    "company": j.get('company', 'Tech Co'),
                    "category": map_category([j.get('title', '')]),
                    "apply_link": j.get('url', 'https://google.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
            print(f"✅ تم جلب {len(jobs)} وظيفة بنجاح.")
            return jobs
    except Exception as e:
        print(f"⚠️ فشل جلب البيانات: {e}")
        return []

if __name__ == "__main__":
    fetch_from_fantastic()
