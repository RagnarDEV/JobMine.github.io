import urllib.request
import json
import os
from datetime import datetime

def main():
    # جمع كافة الأسرار التي تنتهي بـ _API_KEY تلقائياً
    api_keys = {k: v for k, v in os.environ.items() if k.endswith('_API_KEY')}
    
    # تحديد المفتاح المطلوب للمحرك
    api_key = api_keys.get("FANTASTIC_API_KEY", "").strip()
    
    if not api_key:
        print("⚠️ خطأ: FANTASTIC_API_KEY غير موجود في إعدادات GitHub Secrets.")
        return

    print(f"🚀 جاري الاتصال بالمحرك باستخدام المفتاح: {api_key[:5]}...")
    
    # الرابط والطلبات بدون أي تعقيد (صيغة RAW)
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
            
            # حفظ النتائج
            file_path = os.path.join(os.path.dirname(__file__), 'jobs.json')
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(job_list, f, indent=2)
            print(f"✅ تم بنجاح جلب {len(job_list)} وظيفة وتحديث الملف.")
            
    except Exception as e:
        print(f"❌ فشل الاتصال: {e}")

if __name__ == "__main__":
    main()
