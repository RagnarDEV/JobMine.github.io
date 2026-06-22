import urllib.request
import urllib.parse
import json
import os
import xml.etree.ElementTree as ET
import shutil
import sys
from datetime import datetime

def map_category(tags):
    tags_lower = [t.lower() for t in tags]
    
    # تصنيفات موسعة وشاملة لتغطية كافة مجالات العمل عن بعد المجلوبة
    dev_keywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'software', 'devops', 'tech', 'code', 'web', 'programming', 'python', 'javascript', 'react', 'node', 'data scientist', 'cyber']
    design_keywords = ['design', 'designer', 'ui', 'ux', 'figma', 'graphics', 'creative', 'illustrator', 'video editor']
    marketing_keywords = ['marketing', 'sales', 'seo', 'growth', 'ads', 'social media', 'content', 'copywriter', 'media buyer']
    product_keywords = ['product manager', 'product management', 'scrum', 'agile', 'project manager', 'operations']
    support_keywords = ['support', 'customer service', 'helpdesk', 'moderator', 'virtual assistant', 'chat support']
    writer_keywords = ['writer', 'editor', 'translation', 'translator', 'content creation']
    
    for word in dev_keywords:
        if any(word in t for t in tags_lower): return 'Development'
    for word in design_keywords:
        if any(word in t for t in tags_lower): return 'Design'
    for word in marketing_keywords:
        if any(word in t for t in tags_lower): return 'Marketing'
    for word in product_keywords:
        if any(word in t for t in tags_lower): return 'Product'
    for word in support_keywords:
        if any(word in t for t in tags_lower): return 'Customer Support'
    for word in writer_keywords:
        if any(word in t for t in tags_lower): return 'Writing & Translation'
        
    return 'Other Remote Jobs'

def generate_dynamic_sitemap(current_dir, jobs_list):
    base_url = "https://www.jobmine.site.je/"
    sitemap_path = os.path.join(current_dir, 'sitemap.xml')
    today_date = datetime.now().strftime('%Y-%m-%d')
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    main_url = ET.SubElement(urlset, "url")
    ET.SubElement(main_url, "loc").text = base_url
    ET.SubElement(main_url, "lastmod").text = today_date
    ET.SubElement(main_url, "changefreq").text = "daily"
    ET.SubElement(main_url, "priority").text = "1.0"
    static_pages = ["terms.html", "privacy.html", "disclaimer.html"]
    for page in static_pages:
        page_url = ET.SubElement(urlset, "url")
        ET.SubElement(page_url, "loc").text = f"{base_url}{page}"
        ET.SubElement(page_url, "lastmod").text = today_date
        ET.SubElement(page_url, "changefreq").text = "weekly"
        ET.SubElement(page_url, "priority").text = "0.5"
    for job in jobs_list:
        job_id = job.get('id')
        if job_id:
            job_url = ET.SubElement(urlset, "url")
            ET.SubElement(job_url, "loc").text = f"{base_url}job.html?id={job_id}"
            ET.SubElement(job_url, "lastmod").text = job.get('date', today_date)
            ET.SubElement(job_url, "changefreq").text = "weekly"
            ET.SubElement(job_url, "priority").text = "0.7"
    tree = ET.ElementTree(urlset)
    try:
        with open(sitemap_path, "wb") as f:
            f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
            tree.write(f, encoding="utf-8", xml_declaration=False)
    except Exception as e:
        print(f"⚠️ Error creating sitemap.xml: {e}")

def load_existing_jobs(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except: return []
    return []

def save_and_optimize_jobs(new_jobs, file_path, current_dir):
    existing_jobs = load_existing_jobs(file_path)
    seen_links = set()
    combined_jobs = []
    
    # دمج الوظائف الجديدة أولاً
    for job in new_jobs:
        link = job.get('apply_link')
        if link and link not in seen_links:
            seen_links.add(link)
            combined_jobs.append(job)
            
    # دمج الوظائف القديمة المخزنة مسبقاً لمنع فقدان البيانات القديمة
    for job in existing_jobs:
        link = job.get('apply_link')
        if link and link not in seen_links:
            seen_links.add(link)
            combined_jobs.append(job)
            
    final_filtered_jobs = []
    today = datetime.now()
    
    for job in combined_jobs:
        job_date_str = job.get('date', today.strftime('%Y-%m-%d'))
        try:
            job_date = datetime.strptime(job_date_str, '%Y-%m-%d')
            if (today - job_date).days <= 30: final_filtered_jobs.append(job)
        except: final_filtered_jobs.append(job)
        
    final_filtered_jobs.sort(key=lambda x: x.get('date', ''), reverse=True)
    final_filtered_jobs = final_filtered_jobs[:1000]
    
    for index, job in enumerate(final_filtered_jobs): 
        job['id'] = index + 1
        
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(final_filtered_jobs, f, ensure_ascii=False, indent=2)
        print(f"✅ Database updated successfully. Total jobs in jobs.json: {len(final_filtered_jobs)}")
        
        archive_dir = os.path.join(current_dir, 'archive')
        if not os.path.exists(archive_dir): os.makedirs(archive_dir)
        current_date = datetime.now().strftime('%Y_%m_%d')
        shutil.copyfile(file_path, os.path.join(archive_dir, f"jobs_{current_date}.json"))
    except Exception as e:
        print(f"⚠️ Failed to save: {e}")
    generate_dynamic_sitemap(current_dir, final_filtered_jobs)

def fetch_from_jsearch():
    print("🤖 Mining Engine Activated: Connecting via Native Urllib (Safe Mode)...")
    
    api_key = os.getenv("RAPID_API_KEY")
    if not api_key or len(api_key.strip()) < 10:
        print("⚠️ GitHub Secret missing or unreadable. Deploying direct primary API key fallback...")
        api_key = "d1dc16eb89msh5cd274ef830e058p185d96jsn961f91626ac5"
        
    api_key = api_key.strip()
    jobs = []
    
    # تم التعديل هنا: استخدام المسافات كبديل مباشر ومبسط يفهمه المحرك لتجميع كافة الاختصاصات
    params = {
        "query": "remote developer engineer designer marketing manager support sales writer",
        "page": "1",
        "num_pages": "1"
    }
    encoded_params = urllib.parse.urlencode(params)
    url = f"https://jsearch.p.rapidapi.com/search?{encoded_params}"
    
    headers = {
        "x-rapidapi-host": "jsearch.p.rapidapi.com", 
        "x-rapidapi-key": api_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            for j_data in res_data.get('data', []):
                detected_tags = [j_data.get('job_title', ''), j_data.get('job_category', '')]
                posted_at = datetime.now().strftime('%Y-%m-%d')
                raw_date = j_data.get('job_posted_at_datetime_utc')
                if raw_date:
                    try: posted_at = raw_date.split('T')[0]
                    except: pass
                
                # استخراج المقتطفات الذكية (المؤهلات والمسؤوليات) بأمان
                highlights = j_data.get('job_highlights', {})
                qualifications = highlights.get('Qualifications', [])[:3] # نكتفي بـ 3 نقاط لحفظ مساحة الملف
                responsibilities = highlights.get('Responsibilities', [])[:3]
                
                jobs.append({
                    "id": 0, 
                    "title": j_data.get('job_title', 'Remote Specialist'),
                    "company": j_data.get('employer_name', 'Tech Corporation'),
                    "category": map_category(detected_tags),
                    "location": j_data.get('job_city', 'Remote') or "Worldwide Remote",
                    "type": j_data.get('job_employment_type', 'Full-time'),
                    "salary": "Competitive", 
                    "tags": detected_tags[:3],
                    "apply_link": j_data.get('job_apply_link', 'https://google.com/search?q=jobs'),
                    "date": posted_at,
                    "qualifications": qualifications if isinstance(qualifications, list) else [],
                    "responsibilities": responsibilities if isinstance(responsibilities, list) else []
                })
        print(f"🎯 Successfully extracted {len(jobs)} FRESH vacancies via Advanced JSearch Query.")
    except Exception as e:
        print(f"⚠️ JSearch API Engine sync failure: {e}")
    return jobs

def main_mining_process():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, 'jobs.json')
    all_fetched_jobs = fetch_from_jsearch()
    
    if all_fetched_jobs: 
        save_and_optimize_jobs(all_fetched_jobs, file_path, current_dir)
    else:
        print("⚠️ Fetch returned no new results. Preserving existing database entries...")
        save_and_optimize_jobs([], file_path, current_dir)

if __name__ == "__main__":
    main_mining_process()
