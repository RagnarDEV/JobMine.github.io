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
    
    # إنشاء العنصر الرئيسي للخارطة بالروابط القياسية لـ Google
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    # 1. إضافة الصفحة الرئيسية للموقع
    main_url = ET.SubElement(urlset, "url")
    ET.SubElement(main_url, "loc").text = base_url
    ET.SubElement(main_url, "lastmod").text = today_date
    ET.SubElement(main_url, "changefreq").text = "daily"
    ET.SubElement(main_url, "priority").text = "1.0"
    
    # 2. إضافة الصفحات الفرعية الملحقة بالموقع
    static_pages = ["terms.html", "privacy.html", "disclaimer.html"]
    for page in static_pages:
        page_url = ET.SubElement(urlset, "url")
        ET.SubElement(page_url, "loc").text = f"{base_url}{page}"
        ET.SubElement(page_url, "lastmod").text = today_date
        ET.SubElement(page_url, "changefreq").text = "weekly"
        ET.SubElement(page_url, "priority").text = "0.5"

    # تحويل الشجرة البرمجية إلى نص XML منسق وحفظه
    tree = ET.ElementTree(urlset)
    try:
        with open(sitemap_path, "wb") as f:
            f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
            tree.write(f, encoding="utf-8", xml_declaration=False)
        print("✅ Dynamic sitemap.xml generated and updated successfully!")
    except Exception as e:
        print(f"⚠️ Error creating sitemap.xml: {e}")

def fetch_remote_ok_jobs():
    url = "https://remoteok.com/api"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'}
    )
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'jobs.json')
    
    try:
        print("🤖 Attempting to mine Remote OK...")
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            raw_jobs = data[1:] 
            
            formatted_jobs = []
            for index, r_job in enumerate(raw_jobs[:20]):
                formatted_jobs.append({
                    "id": index + 1,
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
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(formatted_jobs, f, ensure_ascii=False, indent=2)
            print("✅ Successfully updated jobs.json with live data!")

    except Exception as e:
        print(f"⚠️ Server temporary busy or rate-limited: {e}")
        print("💡 Generating fallback active jobs to keep the mine running smoothly...")
        
        fallback_jobs = [
            {
                "id": 1,
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
                "id": 2,
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
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(fallback_jobs, f, ensure_ascii=False, indent=2)
        print("✅ Fallback jobs saved successfully.")
        
    finally:
        # استدعاء دالة توليد الخارطة ديناميكياً دائماً في نهاية العملية
        generate_dynamic_sitemap(current_dir)

if __name__ == "__main__":
    fetch_remote_ok_jobs()
