import urllib.request
import json
import os
from datetime import datetime

def map_category(tags):
    tags_lower = [t.lower() for t in tags]
    dev_keywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'software', 'devops', 'qa', 'code', 'tech']
    design_keywords = ['design', 'designer', 'ui', 'ux', 'figma', 'product design', 'graphic']
    marketing_keywords = ['marketing', 'sales', 'seo', 'growth', 'social media', 'copywriter']
    product_keywords = ['product manager', 'product management', 'product owner']
    support_keywords = ['support', 'customer success', 'customer service', 'helpdesk']
    
    for word in dev_keywords:
        if any(word in t for t in tags_lower): return 'Development'
    for word in design_keywords:
        if any(word in t for t in tags_lower): return 'Design'
    for word in marketing_keywords:
        if any(word in t for t in tags_lower): return 'Marketing'
    for word in product_keywords:
        if any(word in t for t in tags_lower): return 'Product'
    for word in support_keywords:
        if any(word in t for t in tags_lower): return 'Support'
    return 'Development'

def fetch_remote_ok_jobs():
    url = "https://remoteok.com/api"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JobMineBot/1.1'}
    )
    
    try:
        print("🤖 Connecting to Remote OK Mine...")
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            raw_jobs = data[1:] 
            
            formatted_jobs = []
            for index, r_job in enumerate(raw_jobs[:30]):
                job_tags = r_job.get('tags', [])[:3]
                if not job_tags:
                    job_tags = ["Remote", "Tech"]
                
                job_entry = {
                    "id": index + 1,
                    "title": r_job.get('position', 'Remote Specialist'),
                    "company": r_job.get('company', 'Secret Mine'),
                    "category": map_category(r_job.get('tags', [])),
                    "location": r_job.get('location', 'Worldwide'),
                    "type": "Full-time",
                    "salary": f"${r_job.get('salary_min', 60)}k - ${r_job.get('salary_max', 120)}k" if r_job.get('salary_max') else "Competitive",
                    "tags": job_tags,
                    "apply_link": r_job.get('url', 'https://remoteok.com'),
                    "date": datetime.fromtimestamp(int(r_job.get('date'))).strftime('%Y-%m-%d') if r_job.get('date') else "2026-06-18"
                }
                formatted_jobs.append(job_entry)
            
            # تحديد المسار المطلق للملف لضمان الكتابة داخل بيئة غيت هاب المؤتمتة
            current_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(current_dir, 'jobs.json')
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(formatted_jobs, f, ensure_ascii=False, indent=2)
                
            print(f"✅ Extraction Successful! Saved {len(formatted_jobs)} jobs to: {file_path}")
            
    except Exception as e:
        print(f"❌ Error during mining operation: {e}")
        # في حال حدوث خطأ اتصال، ننشئ ملفاً فارغاً تجريبياً لكي لا يتوقف نظام الفلترة
        raise e

if __name__ == "__main__":
    fetch_remote_ok_jobs()
