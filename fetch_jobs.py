import urllib.request
import json
import re
from datetime import datetime

def clean_html(raw_html):
    """تنظيف النصوص من أي وسم HTML قد يأتي مع وصف الوظيفة"""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.strip()

def map_category(tags):
    """تحليل الكلمات الدلالية لتصنيف الوظيفة بدقة حسب أقسام موقعنا"""
    tags_lower = [t.lower() for t in tags]
    
    dev_keywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'software', 'devops', 'qa', 'code', 'tech']
    design_keywords = ['design', 'designer', 'ui', 'ux', 'figma', 'product design', 'graphic']
    marketing_keywords = ['marketing', 'sales', 'seo', 'growth', 'social media', 'copywriter']
    product_keywords = ['product manager', 'product management', 'product owner', 'scrum']
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
        
    return 'Development' # التصنيف الافتراضي في حال لم يتطابق شيء

def fetch_remote_ok_jobs():
    url = "https://remoteok.com/api"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JobMineBot/1.0'}
    )
    
    try:
        print("🤖 Connecting to Remote OK Mine...")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            # العنصر الأول في API الخاص بـ Remote OK هو دائماً نص قانوني، نقوم بتجاهله
            raw_jobs = data[1:] 
            
            formatted_jobs = []
            # نكتفي بجلب أفضل وأحدث 30 وظيفة للحفاظ على خفة وسرعة الموقع
            for index, r_job in enumerate(raw_jobs[:30]):
                # استخراج المهارات (أول 3 مهارات فقط لتبدو أنيقة في الكرت)
                job_tags = r_job.get('tags', [])[:3]
                if not job_tags:
                    job_tags = ["Remote", "Tech"]
                
                # ترتيب بيانات الوظيفة لتطابق هيكل موقعنا تماماً
                job_entry = {
                    "id": index + 1,
                    "title": r_job.get('position', 'Remote Specialist'),
                    "company": r_job.get('company', 'Secret Mine'),
                    "category": map_category(r_job.get('tags', [])),
                    "location": r_job.get('location', 'Worldwide'),
                    "type": "Full-time", # الافتراضي للوظائف التقنية هناك
                    "salary": f"${r_job.get('salary_min', 60)}k - ${r_job.get('salary_max', 120)}k" if r_job.get('salary_max') else "Competitive",
                    "tags": job_tags,
                    "apply_link": r_job.get('url', 'https://remoteok.com'),
                    "date": datetime.fromtimestamp(int(r_job.get('date'))).strftime('%Y-%m-%d') if r_job.get('date') else "2026-06-18"
                }
                formatted_jobs.append(job_entry)
                
            # حفظ الوظائف الجديدة المستخرجة تلقائياً داخل ملف jobs.json
            with open('jobs.json', 'w', encoding='utf-8') as f:
                json.dump(formatted_jobs, f, ensure_ascii=False, indent=2)
                
            print(f"✅ Extraction Successful! Saved {len(formatted_jobs)} premium jobs to jobs.json.")
            
    except Exception as e:
        print(f"❌ Error during mining operation: {e}")

if __name__ == "__main__":
    fetch_remote_ok_jobs()
