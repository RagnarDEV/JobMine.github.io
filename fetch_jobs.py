import urllib.request
import json
import os
import xml.etree.ElementTree as ET
import shutil
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
# 🎛️ محركات الجلب الخمسة المتوازية (5-Engine Mining System)
# ==========================================================================

def fetch_from_remote_ok():
    print("🤖 Mining Source 1: Remote OK...")
    jobs = []
    try:
        url = "https://remoteok.com/api"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            for r_job in data[1:30]:
                jobs.append({
                    "id": 0,
                    "title": r_job.get('position', 'Remote Software Engineer'),
                    "company": r_job.get('company', 'Tech Enterprise'),
                    "category": map_category(r_job.get('tags', [])),
                    "location": r_job.get('location', 'Worldwide'),
                    "type": "Full-time",
                    "salary": f"${r_job.get('salary_min', 70)}k - ${r_job.get('salary_max', 130)}k" if r_job.get('salary_max') else "Competitive",
                    "tags": r_job.get('tags', [])[:3] if r_job.get('tags') else ["Remote"],
                    "apply_link": r_job.get('url', 'https://remoteok.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
    except Exception as e:
        print(f"⚠️ Source 1 (Remote OK) temporary skipped: {e}")
    return jobs

def fetch_from_we_work_remotely():
    print("🤖 Mining Source 2: We Work Remotely...")
    jobs = []
    try:
        url = "https://weworkremotely.com/categories/remote-programming-jobs.json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            for w_job in data[:25]:
                jobs.append({
                    "id": 0,
                    "title": w_job.get('title', 'Remote Web Developer'),
                    "company": w_job.get('company', 'Global Firm'),
                    "category": map_category([w_job.get('category', 'Development')]),
                    "location": w_job.get('region', 'Worldwide'),
                    "type": w_job.get('type', 'Full-time'),
                    "salary": "Competitive",
                    "tags": ["Tech", "Remote", "WWR"],
                    "apply_link": w_job.get('url', 'https://weworkremotely.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
    except Exception as e:
        print(f"⚠️ Source 2 (We Work Remotely) temporary skipped: {e}")
    return jobs

def fetch_from_design_feed():
    print("🤖 Mining Source 3: Design & UI/UX Segment...")
    jobs = []
    try:
        url = "https://remoteok.com/api?tags=design"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            for d_job in data[1:20]:
                jobs.append({
                    "id": 0,
                    "title": d_job.get('position', 'Remote UI/UX Designer'),
                    "company": d_job.get('company', 'Creative Studio'),
                    "category": map_category(d_job.get('tags', [])),
                    "location": "Remote Worldwide",
                    "type": "Full-time",
                    "salary": "Competitive",
                    "tags": ["Design", "UI/UX", "Creative"],
                    "apply_link": d_job.get('url', 'https://remoteok.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
    except Exception as e:
        print(f"⚠️ Source 3 Engine temporary skipped: {e}")
    return jobs

def fetch_from_marketing_feed():
    print("🤖 Mining Source 4: Marketing & Sales Segment...")
    jobs = []
    try:
        url = "https://remoteok.com/api?tags=marketing"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            for m_job in data[1:20]:
                jobs.append({
                    "id": 0,
                    "title": m_job.get('position', 'Remote Marketing Specialist'),
                    "company": m_job.get('company', 'Growth Agency'),
                    "category": map_category(m_job.get('tags', [])),
                    "location": "Worldwide Remote",
                    "type": "Full-time",
                    "salary": "Attractive",
                    "tags": ["Marketing", "SEO", "Growth"],
                    "apply_link": m_job.get('url', 'https://remoteok.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
    except Exception as e:
        print(f"⚠️ Source 4 Engine temporary skipped: {e}")
    return jobs

def fetch_from_product_feed():
    print("🤖 Mining Source 5: Product & Management Segment...")
    jobs = []
    try:
        url = "https://remoteok.com/api?tags=product"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            for p_job in data[1:20]:
                jobs.append({
                    "id": 0,
                    "title": p_job.get('position', 'Remote Product Operations Manager'),
                    "company": p_job.get('company', 'Enterprise SaaS'),
                    "category": map_category(p_job.get('tags', [])),
                    "location": "Global Remote",
                    "type": "Full-time",
                    "salary": "Competitive",
                    "tags": ["Product", "Management", "SaaS"],
                    "apply_link": p_job.get('url', 'https://remoteok.com'),
                    "date": datetime.now().strftime('%Y-%m-%d')
                })
    except Exception as e:
        print(f"⚠️ Source 5 Engine temporary skipped: {e}")
    return jobs


def main_mining_process():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'jobs.json')
    
    all_fetched_jobs = []
    all_fetched_jobs.extend(fetch_from_remote_ok())
    all_fetched_jobs.extend(fetch_from_we_work_remotely())
    all_fetched_jobs.extend(fetch_from_design_feed())
    all_fetched_jobs.extend(fetch_from_marketing_feed())
    all_fetched_jobs.extend(fetch_from_product_feed())
    
    if all_fetched_jobs:
        save_and_optimize_jobs(all_fetched_jobs, file_path, current_dir)
    else:
        print("⚠️ All 5 engines returned empty shifts. Utilizing fallback active mechanism...")
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
