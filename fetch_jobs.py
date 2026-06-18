import urllib.request
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime

def map_category(tags):
    tags_lower = [t.lower() for t in tags]
    dev_keywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'software', 'devops', 'tech', 'code']
    design_keywords = ['design', 'designer', 'ui', 'ux', 'figma']
    
    for word in dev_keywords:
        if any(word in t for t in tags_lower): return 'Development'
    for word in design_keywords:
        if any(word in t for t in tags_lower): return 'Design'
    return 'Development'

def generate_dynamic_sitemap(current_dir):
    """
    توليد وتحديث ملف sitemap.xml تلقائياً بناءً على تاريخ اليوم والروابط الأساسية
    """
    base_url = "https://www.jobmine.site.je/"
    sitemap_path = os.path.join(current_dir, 'sitemap.xml')
    today_date = datetime.now().strftime('%Y-%m-%d')
    
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    # 1. إضافة الصفحة الرئيسية
    main_url = ET.SubElement(urlset, "url")
    ET.SubElement(main_url, "loc").text = base_url
    ET.SubElement(main_url, "lastmod").text = today_date
    ET.SubElement(main_url, "changefreq").text = "daily"
    ET.SubElement(main_url, "priority").text = "1.0"
    
    # 2. إضافة الصفحات الفرعية
    static_pages = ["terms.html", "privacy.html", "disclaimer.html"]
    for page in static_pages:
        page_url = ET.SubElement(urlset, "url")
        ET.SubElement(page_url, "loc").text = f"{base_url}{page}"
        ET.SubElement(page_url, "lastmod").text = today_date
        ET.SubElement(page_url, "changefreq").text = "weekly"
        ET.SubElement(page_url, "priority").text = "0.5"

    tree = ET.ElementTree(urlset)
    try:
        with open(sitemap_path, "wb") as f:
            f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
            tree.write(f, encoding="utf-8", xml_declaration=False)
        print("✅ Dynamic sitemap.xml generated and updated successfully!")
    except Exception as e:
        print(f"⚠️ Error creating sitemap.xml: {e}")

def load_existing_jobs(file_path):
    """
    قراءة الوظائف الحالية المخزنة في ملف jobs.json
    """
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Could not read existing jobs, starting fresh: {e}")
    return []

def save_and_optimize_jobs(new_jobs, file_path):
    """
    دمج الوظائف الجديدة مع القديمة، حذف المكرر، تنظيف منتهي الصلاحية (>30 يوم)، وحفظ حد أقصى 1000 وظيفة
    """
    existing_jobs = load_existing_jobs(file_path)
    
    # دمج القائمتين مع تجنب التكرار بناءً على رابط التقديم (apply_link)
    seen_links = set()
    combined_jobs = []
    
    # نعطي الأولوية للوظائف الجديدة المستخرجة للتو
    for job in new_jobs:
        link = job.get('apply_link')
        if link and link not in seen_links:
            seen_links.add(link)
            combined_jobs.append(job)
            
    # إضافة الوظائف القديمة غير المكررة
    for job in existing_jobs:
        link = job.get('apply_link')
        if link and link not in seen_links:
            seen_links.add(link)
            combined_jobs.append(job)
            
    # تصفية القائمة لحذف الوظائف التي مر عليها أكثر من 30 يوماً
    final_filtered_jobs = []
    today = datetime.now()
    
    for job in combined_jobs:
        job_date_str = job.get('date', today.strftime('%Y-%m-%d'))
        try:
            job_date = datetime.strptime(job_date_str, '%Y-%m-%d')
            # حساب فارق الأيام
            days_old = (today - job_date).days
            if days_old <= 30:  # احتفاظ بالوظيفة إذا كانت أقل من أو تساوي 30 يوماً
                final_filtered_jobs.append(job)
        except ValueError:
            # في حال وجود خطأ في تنسيق التاريخ، نحتفظ بها كأمان
            final_filtered_jobs.append(job)

    # ترتيب الوظائف من الأحدث تاريخاً إلى الأقدم
    final_filtered_jobs.sort(key=lambda x: x.get('date', ''), reverse=True)

    # اقتطاع أول 1000 وظيفة فقط لتجنب تضخم الملف وحجم البيانات
    final_filtered_jobs = final_filtered_jobs[:1000]

    # إعادة توليد الـ ID بشكل متسلسل من 1 إلى 1000 متوافق مع واجهة الجافاسكربت
    for index, job in enumerate(final_filtered_jobs):
        job['id'] = index + 1

    # حفظ مصفوفة المنجم الكبرى في ملف jobs.json الموحد
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(final_filtered_jobs, f, ensure_ascii=False, indent=2)
        print(f"🚀 Success! Database updated. Total active tracked jobs: {len(final_filtered_jobs)}/1000")
    except Exception as e:
        print(f"⚠️ Failed to save jobs database: {e}")

def fetch_remote_ok_jobs():
    url = "https://remoteok.com/api"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'}
    )
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'jobs.json')
    fetched_jobs = []
    
    try:
        print("🤖 Attempting to mine Remote OK...")
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            raw_jobs = data[1:] 
            
            for index, r_job in enumerate(raw_jobs[:40]): # نسحب أحدث 40 وظيفة في كل دورة تشغيل لدمجها
                fetched_jobs.append({
                    "id": 0, # سيتم ضبطه تلقائياً بالتسلسل لاحقاً
                    "title": r_job.get('position', 'Remote Software Engineer'),
                    "company": r_job.get('company', 'Tech Enterprise'),
                    "category": map_category(r_job.get('tags', [])),
                    "location": r_job.get('location', 'Worldwide'),
                    "type": "Full-time",
                    "salary": f"${r_job.get('salary_min', 70)}k - ${r_job.get('salary_max', 130)}k" if r_job.get('salary_max') else "Competitive",
                    "tags": r_job.get('tags', [])[:3] if r_job.get('tags') else ["Remote", "Tech"],
                    "apply_link": r_job.get('url', 'https://remoteok.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
            print(f"📥 Successfully fetched {len(fetched_jobs)} new raw jobs from server.")
            save_and_optimize_jobs(fetched_jobs, file_path)

    except Exception as e:
        print(f"⚠️ Server temporary busy or rate-limited: {e}")
        print("💡 Utilizing fallback data injection mechanism...")
        
        fallback_jobs = [
            {
                "id": 0,
                "title": "Senior Full-Stack Developer (Remote)",
                "company": "Automattic",
                "category": "Development",
                "location": "Worldwide",
                "type": "Full-time",
                "salary": "$95k - $125k",
                "tags": ["WordPress", "React", "PHP"],
                "apply_link": "https://automattic.com/work-with-us/",
                "date": datetime.now().strftime('%Y-%m-%d')
            },
            {
                "id": 0,
                "title": "Lead UI/UX Product Designer",
                "company": "Canva",
                "category": "Design",
                "location": "Remote (Worldwide)",
                "type": "Full-time",
                "salary": "$110k - $140k",
                "tags": ["Figma", "UI/UX", "Product"],
                "apply_link": "https://www.canva.com/careers/",
                "date": datetime.now().strftime('%Y-%m-%d')
            }
        ]
        save_and_optimize_jobs(fallback_jobs, file_path)
        
    finally:
        generate_dynamic_sitemap(current_dir)

if __name__ == "__main__":
    fetch_remote_ok_jobs()
