import urllib.request
import urllib.parse
import json
import os
from datetime import datetime, timezone

# ============================================================
#  إعدادات البحث — يمكنك تعديلها بحرية
# ============================================================
SEARCH_TITLES = ["Developer", "Engineer", "Designer", "Product Manager", "DevOps"]
TIME_FRAME    = "24h"
LIMIT_PER_QUERY = 50
BASE_URL      = "https://www.jobmine.site.je"
# ============================================================


def fetch_from_fantastic(api_key):
    """جلب الوظائف من active-jobs-db (FANTASTIC_API_KEY)"""
    all_jobs = []

    for title in SEARCH_TITLES:
        print(f"  🔍 جلب: {title}...")
        params = urllib.parse.urlencode({
            "limit": str(LIMIT_PER_QUERY),
            "title": title,
            "time_frame": TIME_FRAME
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
                data = json.loads(response.read().decode())
                jobs = data if isinstance(data, list) else data.get('jobs', data.get('data', []))
                all_jobs.extend(jobs)
                print(f"  ✅ {title}: {len(jobs)} وظيفة")
        except urllib.error.HTTPError as e:
            print(f"  ❌ {title} HTTP {e.code}: {e.reason}")
            try:
                print(f"     {e.read().decode()}")
            except:
                pass
        except Exception as e:
            print(f"  ❌ {title} فشل: {e}")

    return all_jobs


def fetch_from_jsearch(api_key):
    """جلب الوظائف من JSearch (RAPID_API_KEY)"""
    all_jobs = []
    queries = ["remote developer", "remote engineer", "remote designer"]

    for query in queries:
        print(f"  🔍 JSearch: {query}...")
        params = urllib.parse.urlencode({
            "query": query,
            "page": "1",
            "num_pages": "1",
            "date_posted": "today"
        })
        url = f"https://jsearch.p.rapidapi.com/search?{params}"
        headers = {
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
            "x-rapidapi-key": api_key,
            "Accept": "application/json"
        }
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode())
                jobs = data.get('data', [])
                all_jobs.extend(jobs)
                print(f"  ✅ JSearch '{query}': {len(jobs)} وظيفة")
        except urllib.error.HTTPError as e:
            print(f"  ❌ JSearch HTTP {e.code}: {e.reason}")
        except Exception as e:
            print(f"  ❌ JSearch فشل: {e}")

    return all_jobs


def remove_duplicates(jobs):
    """إزالة المكررات بناءً على id أو url"""
    seen = set()
    unique = []
    for job in jobs:
        key = str(job.get('id', '')) or str(job.get('job_id', '')) or job.get('url', '') or job.get('job_apply_link', '')
        if key and key not in seen:
            seen.add(key)
            unique.append(job)
        elif not key:
            unique.append(job)
    return unique


def update_archive(new_jobs, archive_path):
    """تحديث ملف الأرشيف بإضافة الوظائف الجديدة فقط"""
    existing = []
    if os.path.exists(archive_path):
        try:
            with open(archive_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except:
            existing = []

    existing_ids = set()
    for job in existing:
        key = str(job.get('id', '')) or job.get('url', '') or job.get('job_apply_link', '')
        if key:
            existing_ids.add(key)

    added = 0
    for job in new_jobs:
        key = str(job.get('id', '')) or job.get('url', '') or job.get('job_apply_link', '')
        if not key or key not in existing_ids:
            existing.append(job)
            if key:
                existing_ids.add(key)
            added += 1

    # الاحتفاظ بآخر 500 وظيفة فقط لتجنب تضخم الملف
    existing = existing[-500:]

    with open(archive_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

    print(f"📦 الأرشيف: {added} وظيفة جديدة أضيفت، إجمالي: {len(existing)}")
    return existing


def update_sitemap(all_jobs, sitemap_path):
    """تحديث sitemap.xml بروابط الوظائف"""
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # الصفحات الثابتة
    static_pages = [
        {"url": f"{BASE_URL}/", "priority": "1.0", "changefreq": "daily"},
        {"url": f"{BASE_URL}/trends.html", "priority": "0.8", "changefreq": "weekly"},
        {"url": f"{BASE_URL}/privacy.html", "priority": "0.3", "changefreq": "monthly"},
        {"url": f"{BASE_URL}/terms.html", "priority": "0.3", "changefreq": "monthly"},
        {"url": f"{BASE_URL}/disclaimer.html", "priority": "0.3", "changefreq": "monthly"},
    ]

    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    # الصفحات الثابتة
    for page in static_pages:
        xml_lines.append(f"""  <url>
    <loc>{page['url']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")

    # صفحات الوظائف
    added_urls = set()
    for job in all_jobs:
        job_id = str(job.get('id', ''))
        job_url = job.get('url', '') or job.get('job_apply_link', '')
        if not job_id:
            continue
        page_url = f"{BASE_URL}/job.html?id={urllib.parse.quote(job_id)}&url={urllib.parse.quote(str(job_url))}"
        if page_url not in added_urls:
            added_urls.add(page_url)
            xml_lines.append(f"""  <url>
    <loc>{page_url}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>""")

    xml_lines.append('</urlset>')

    with open(sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(xml_lines))

    print(f"🗺️ sitemap.xml تم تحديثه: {len(added_urls)} وظيفة + {len(static_pages)} صفحة ثابتة")


def main():
    print("=" * 50)
    print(f"🕐 بدء التشغيل: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)

    fantastic_key = os.environ.get("FANTASTIC_API_KEY", "").strip()
    rapid_key     = os.environ.get("RAPID_API_KEY", "").strip()

    if not fantastic_key and not rapid_key:
        print("⚠️ خطأ: لا يوجد أي مفتاح API!")
        return

    base_dir     = os.path.dirname(os.path.abspath(__file__))
    jobs_path    = os.path.join(base_dir, 'jobs.json')
    archive_path = os.path.join(base_dir, 'archive', 'jobs_archive.json')
    sitemap_path = os.path.join(base_dir, 'sitemap.xml')

    # إنشاء مجلد الأرشيف إذا لم يكن موجوداً
    os.makedirs(os.path.dirname(archive_path), exist_ok=True)

    all_jobs = []

    # ── Fantastic API ──
    if fantastic_key:
        print("\n📡 [1/2] جلب من Fantastic (active-jobs-db)...")
        jobs = fetch_from_fantastic(fantastic_key)
        all_jobs.extend(jobs)
        print(f"  → Fantastic: {len(jobs)} وظيفة إجمالاً")
    else:
        print("⏭️ FANTASTIC_API_KEY غير موجود، تم التخطي")

    # ── JSearch API ──
    if rapid_key:
        print("\n📡 [2/2] جلب من JSearch (RAPID_API_KEY)...")
        jobs = fetch_from_jsearch(rapid_key)
        all_jobs.extend(jobs)
        print(f"  → JSearch: {len(jobs)} وظيفة إجمالاً")
    else:
        print("⏭️ RAPID_API_KEY غير موجود، تم التخطي")

    if not all_jobs:
        print("\n❌ لم يتم جلب أي وظائف!")
        return

    # إزالة المكررات
    all_jobs = remove_duplicates(all_jobs)
    print(f"\n📊 إجمالي بعد إزالة المكررات: {len(all_jobs)} وظيفة")

    # حفظ jobs.json
    with open(jobs_path, 'w', encoding='utf-8') as f:
        json.dump(all_jobs, f, indent=2, ensure_ascii=False)
    print(f"💾 jobs.json تم حفظه: {len(all_jobs)} وظيفة")

    # تحديث الأرشيف
    print("\n📦 تحديث الأرشيف...")
    update_archive(all_jobs, archive_path)

    # تحديث sitemap.xml
    print("\n🗺️ تحديث sitemap.xml...")
    update_sitemap(all_jobs, sitemap_path)

    print("\n" + "=" * 50)
    print(f"✅ اكتمل: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)


if __name__ == "__main__":
    main()
