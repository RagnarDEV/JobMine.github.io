import urllib.request
import json
import os
import xml.etree.ElementTree as ET
import shutil
import sys
from datetime import datetime

def map_category(tags):
    tags_lower = [t.lower() for t in tags]
    dev_keywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'software', 'devops', 'tech', 'code', 'web', 'programming', 'python', 'javascript', 'react', 'node']
    design_keywords = ['design', 'designer', 'ui', 'ux', 'figma', 'graphics', 'creative']
    marketing_keywords = ['marketing', 'sales', 'seo', 'growth', 'ads', 'social media', 'content']
    product_keywords = ['product manager', 'product management', 'scrum', 'agile', 'project manager']
    
    for word in dev_keywords:
        if any(word in t for t in tags_lower): return 'Development'
    for word in design_keywords:
        if any(word in t for t in tags_lower): return 'Design'
    for word in marketing_keywords:
        if any(word in t for t in tags_lower): return 'Marketing'
    for word in product_keywords:
        if any(word in t for t in tags_lower): return 'Product'
    return 'Development'

def generate_dynamic_sitemap(current_dir, jobs_list):
    """
    توليد وتحديث ملف sitemap.xml تلقائياً ليشمل الروابط الأساسية بالإضافة إلى الـ 1000 وظيفة النشطة
    """
    base_url = "https://www.jobmine.site.je/"
    sitemap_path = os.path.join(current_dir, 'sitemap.xml')
    today_date = datetime.now().strftime('%Y-%m-%d')
    
    # بناء جذر ملف الـ XML
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    # 1. إضافة الصفحة الرئيسية للموقع
    main_url = ET.SubElement(urlset, "url")
    ET.SubElement(main_url, "loc").text = base_url
    ET.SubElement(main_url, "lastmod").text = today_date
    ET.SubElement(main_url, "changefreq").text = "daily"
    ET.SubElement(main_url, "priority").text = "1.0"
    
    # 2. إضافة الصفحات الثابتة (شروط الاستخدام، الخصوصية، إخلاء المسؤولية)
    static_pages = ["terms.html", "privacy.html", "disclaimer.html"]
    for page in static_pages:
        page_url = ET.SubElement(urlset, "url")
        ET.SubElement(page_url, "loc").text = f"{base_url}{page}"
        ET.SubElement(page_url, "lastmod").text = today_date
        ET.SubElement(page_url, "changefreq").text = "weekly"
        ET.SubElement(page_url, "priority").text = "0.5"

    # 3. الثورة الجديدة: التكرار داخل المصفوفة لتوليد سطر مؤرشف مستقل لكل وظيفة نشطة
    for job in jobs_list:
        job_id = job.get('id')
        if job_id:
            job_url = ET.SubElement(urlset, "url")
            ET.SubElement(job_url, "loc").text = f"{base_url}job.html?id={job_id}"
            ET.SubElement(job_url, "lastmod").text = job.get('date', today_date)
            ET.SubElement(job_url, "changefreq").text = "weekly"
            ET.SubElement(job_url, "priority").text = "0.7"

    # حفظ الملف بصيغة UTF-8 مع ترويسة الـ XML الصحيحة
    tree = ET.ElementTree(urlset)
    try:
        with open(sitemap_path, "wb") as f:
            f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
            tree.write(f, encoding="utf-8", xml_declaration=False)
        print(f"✅ Mega SEO Success! sitemap.xml generated with {len(jobs_list) + 4} total indexed paths.")
    except Exception as e:
        print(f"⚠️ Error creating sitemap.xml: {e}")

def load_existing_jobs(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Could not read existing jobs, starting fresh: {e}")
    return []

def save_and_optimize_jobs(new_jobs, file_path, current_dir):
    existing_jobs = load_existing_jobs(file_path)
    seen_links = set()
    combined_jobs = []
    
    # دمج القائمتين مع تجنب التكرار بناءً على رابط التتقديم
    for job in new_jobs:
        link = job.get('apply_link')
        if link and link not in seen_links:
            seen_links.add(link)
            combined_jobs.append(job)
            
    for job in existing_jobs:
        link = job.get('apply_link')
        if link and link not in seen_links:
            seen_links.add(link)
            combined_jobs.append(job)
            
    # تصفية القائمة لحذف الوظائف القديمة (أكثر من 30 يوماً)
    final_filtered_jobs = []
    today = datetime.now()
    
    for job in combined_jobs:
        job_date_str = job.get('date', today.strftime('%Y-%m-%d'))
        try:
            job_date = datetime.strptime(job_date_str, '%Y-%m-%d')
            if (today - job_date).days <= 30:
                final_filtered_jobs.append(job)
        except ValueError:
            final_filtered_jobs.append(job)

    # ترتيب الوظائف من الأحدث إلى الأقدم
    final_filtered_jobs.sort(key=lambda x: x.get('date', ''), reverse=True)

    # اقتطاع أول 1000 وظيفة فقط لتجنب تضخم حجم الملف
    final_filtered_jobs = final_filtered_jobs[:1000]

    # إعادة توليد الـ ID بشكل متسلسل ومستقر وثابت للروابط
    for index, job in enumerate(final_filtered_jobs):
        job['id'] = index + 1

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(final_filtered_jobs, f, ensure_ascii=False, indent=2)
        print(f"🚀 Mega Update Success! JobMine database expanded: {len(final_filtered_jobs)}/1000 jobs active.")
        
        # 📂 [نظام الأرشفة المدمج]: أخذ نسخة احتياطية يومية مؤتمتة داخل مجلد archive
        archive_dir = os.path.join(current_dir, 'archive')
        if not os.path.exists(archive_dir):
            os.makedirs(archive_dir)
            
        current_date = datetime.now().strftime('%Y_%m_%d')
        archive_file_path = os.path.join(archive_dir, f"jobs_{current_date}.json")
        
        shutil.copyfile(file_path, archive_file_path)
        print(f"📦 Data Archiving Success! Daily backup snapshot created at: archive/jobs_{current_date}.json")
        
    except Exception as e:
        print(f"⚠️ Failed to save jobs database or create archive: {e}")
        
    # حقن استدعاء الـ Sitemap هنا لتمرير المصفوفة النهائية الجاهزة مباشرة
    generate_dynamic_sitemap(current_dir, final_filtered_jobs)


# ==========================================================================
# 🎛️ محرك الجلب الموحد الجديد: JSearch Mining Engine
# ==========================================================================

def fetch_from_jsearch():
    print("🤖 Mining Engine Activated: Fetching from JSearch API...")
    
    # جلب مفتاح الـ API المؤمن من متغيرات البيئة بسلامة وأمان
    api_key = os.environ.get("RAPID_API_KEY")
    if not api_key:
        print("❌ Error: RAPID_API_KEY variable is missing from repository secrets.")
        return []
        
    api_key = api_key.strip()
    jobs = []
    
    # إعداد الاستعلام لجلب أفضل الوظائف عن بُعد لخدمة تخصصات موقعك
    query_term = "developer engineer designer marketing manager remote"
    encoded_query = urllib.parse.quote(query_term)
    
    # نطلب صفحة غنية بالبيانات تحتوي على حد أقصى (50 نتيجة) لتعظيم قيمة الطلب الواحد
    url = f"https://jsearch.p.rapidapi.com/search?query={encoded_query}&page=1&num_pages=1"
    
    headers = {
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "x-rapidapi-key": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            raw_jobs = res_data.get('data', [])
            
            for j_data in raw_jobs:
                # تجميع الكلمات الدلالية المناسبة للفئات من البيانات المسترجعة
                detected_tags = []
                if j_data.get('job_title'): detected_tags.append(j_data.get('job_title'))
                if j_data.get('job_category'): detected_tags.append(j_data.get('job_category'))
                
                # استخراج وتحسين صيغة التاريخ القادم من الـ API
                posted_at = datetime.now().strftime('%Y-%m-%d')
                raw_date = j_data.get('job_posted_at_datetime_utc')
                if raw_date:
                    try:
                        posted_at = raw_date.split('T')[0]
                    except Exception:
                        pass
                
                # تجميع الراتب بصيغة نصية واضحة ومقروءة للزائر
                salary_str = "Competitive"
                min_sal = j_data.get('job_min_salary')
                max_sal = j_data.get('job_max_salary')
                currency = j_data.get('job_salary_currency', '$')
                if min_sal and max_sal:
                    salary_str = f"{currency}{min_sal} - {currency}{max_sal}"
                elif max_sal:
                    salary_str = f"{currency}{max_sal}"

                # ضخ البيانات في المصفوفة محافظين على نفس المفاتيح القديمة بدقة لسلامة الواجهة
                jobs.append({
                    "id": 0,
                    "title": j_data.get('job_title', 'Remote Specialist'),
                    "company": j_data.get('employer_name', 'Tech Corporation'),
                    "category": map_category(detected_tags),
                    "location": j_data.get('job_city', 'Remote') if j_data.get('job_city') else "Worldwide Remote",
                    "type": j_data.get('job_employment_type', 'Full-time'),
                    "salary": salary_str,
                    "tags": detected_tags[:3] if detected_tags else ["Remote"],
                    "apply_link": j_data.get('job_apply_link', 'https://google.com/search?q=jobs'),
                    "date": posted_at
                })
        print(f"🎯 Successfully extracted {len(jobs)} high-quality vacancies via JSearch Engine.")
    except Exception as e:
        print(f"⚠️ JSearch API Engine synchronization failure: {e}")
        
    return jobs


def main_mining_process():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'jobs.json')
    
    # جلب الداتا من المصدر الموحد المحدث JSearch
    all_fetched_jobs = fetch_from_jsearch()
    
    if all_fetched_jobs:
        save_and_optimize_jobs(all_fetched_jobs, file_path, current_dir)
    else:
        print("⚠️ JSearch returned an empty shift. Utilizing backup fallback active mechanism...")
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
        save_and_optimize_jobs(fallback_jobs, file_path, current_dir)

if __name__ == "__main__":
    main_mining_process()
