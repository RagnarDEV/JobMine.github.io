import urllib.request
import urllib.parse
import json
import os
from datetime import datetime

def fetch_from_fantastic():
    # 1. تحميل كافة الأسرار وتوزيعها على البيئة
    secrets_raw = os.getenv("ALL_SECRETS")
    if secrets_raw:
        try:
            secrets_dict = json.loads(secrets_raw)
            for key, value in secrets_dict.items():
                os.environ[key] = str(value)
        except json.JSONDecodeError:
            print("⚠️ خطأ في تنسيق JSON الخاص بالأسرار.")

    # 2. الآن نقوم بجلب المفتاح المطلوب بعد أن أصبح متاحاً في البيئة
    api_key = os.getenv("FANTASTIC_API_KEY", "").strip()
    if not api_key:
        print("⚠️ مفتاح FANTASTIC_API_KEY غير موجود في الأسرار!")
        return []

    print("🚀 محرك Fantastic Active قيد التشغيل...")
    
    # استخدام الرابط المباشر وتجنب التعقيد في الترميز
    url = "https://active-jobs-db.p.rapidapi.com/active-ats?limit=50&title=Developer"
    
    headers = {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": api_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
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
                    "apply_link": j.get('url', 'https://google.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
            print(f"✅ تم جلب {len(jobs)} وظيفة بنجاح.")
            return jobs
    except Exception as e:
        print(f"⚠️ فشل جلب البيانات: {e}")
        return []

# دالة تشغيل السكربت الأساسية
if __name__ == "__main__":
    jobs = fetch_from_fantastic()
    # هنا يمكنك إضافة كود حفظ الـ jobs في ملف json
