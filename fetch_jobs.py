import urllib.request
import json
import os
from datetime import datetime

def fetch_from_fantastic():
    # جلب كافة الأسرار التي تم تمريرها من البيئة (Env)
    # سنقوم بجمعها في قاموس واحد
    secrets = {key: val for key, val in os.environ.items() if key.endswith('_API_KEY')}
    
    api_key = secrets.get("FANTASTIC_API_KEY", "").strip()
    
    if not api_key:
        print("⚠️ مفتاح FANTASTIC_API_KEY غير موجود في الأسرار!")
        return []

    print("🚀 محرك Fantastic Active (متعدد الأسرار) قيد التشغيل...")
    
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
            return [{"title": j.get('title'), "company": j.get('company'), "apply_link": j.get('url')} for j in job_list]
    except Exception as e:
        print(f"⚠️ خطأ: {e}")
        return []

if __name__ == "__main__":
    fetch_from_fantastic()
