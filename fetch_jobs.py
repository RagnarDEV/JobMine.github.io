import urllib.request
import urllib.parse
import json
import os

def main():
    api_key = os.environ.get("FANTASTIC_API_KEY", "").strip()
    
    if not api_key:
        print("⚠️ خطأ: FANTASTIC_API_KEY غير موجود.")
        return

    print(f"🚀 محرك Fantastic Active قيد التشغيل...")

    params = urllib.parse.urlencode({
        "limit": "50",
        "title": "Developer",
        "time_frame": "24h"
    })
    
    url = f"https://active-jobs-db.p.rapidapi.com/active-ats?{params}"
    
    headers = {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": api_key,
        "Accept": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            print(f"✅ Status: {response.status}")
            data = json.loads(response.read().decode())
            job_list = data if isinstance(data, list) else data.get('jobs', [])
            
            file_path = os.path.join(os.path.dirname(__file__), 'jobs.json')
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(job_list, f, indent=2, ensure_ascii=False)
            print(f"✅ تم جلب {len(job_list)} وظيفة.")
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.reason}")
        print(f"❌ Response body: {e.read().decode()}")
    except Exception as e:
        print(f"❌ فشل الاتصال: {e}")

if __name__ == "__main__":
    main()
