import urllib.request
import urllib.parse
import json
import os
from datetime import datetime, timezone

# ============================================================
SEARCH_TITLES = ["Developer", "Engineer", "Designer", "Product Manager", "DevOps"]
TIME_FRAME    = "24h"
LIMIT_PER_QUERY = 50
BASE_URL      = "https://www.jobmine.site.je"
# ============================================================


def fetch_from_fantastic(api_key):
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


def get_job_key(job):
    """مفتاح فريد لكل وظيفة"""
    return (
        str(job.get('id', '')) or
        str(job.get('job_id', '')) or
        job.get('url', '') or
        job.get('job_apply_link', '')
    )


def remove_duplicates(jobs):
    seen = set()
    unique = []
    for job in jobs:
        key = get_job_key(job)
        if key and key not in seen:
            seen.add(key)
            unique.append(job)
        elif not key:
            unique.append(job)
    return unique


def merge_with_existing(new_jobs, jobs_path, max_jobs=1000):
    """
    دمج الوظائف الجديدة مع الموجودة في jobs.json
    مع الاحتفاظ بأحدث 1000 وظيفة فقط
    الجديدة تأتي أولاً، القديمة تُحذف من النهاية
    """
    existing = []
    if os.path.exists(jobs_path):
        try:
            with open(jobs_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            print(f"  📂 jobs.json الحالي: {len(existing)} وظيفة")
        except:
            existing = []
            print("  📂 jobs.json فارغ أو تالف، سيتم إنشاؤه من جديد")

    # بناء فهرس للوظائف الموجودة
    existing_keys = set()
    for job in existing:
        key = get_job_key(job)
        if key:
            existing_keys.add(key)

    # إضافة الجديدة فقط في المقدمة
    truly_new = []
    for job in new_jobs:
        key = get_job_key(job)
        if not key or key not in existing_keys:
            truly_new.append(job)

    print(f"  🆕 وظائف جديدة فعلاً: {len(truly_new)}")

    # الجديدة في المقدمة + القديمة في النهاية
    merged = truly_new + existing

    # الاحتفاظ بأحدث 1000 فقط
    if len(merged) > max_jobs:
        merged = merged[:max_jobs]
        print(f"  ✂️ تم الاقتصار على أحدث {max_jobs} وظيفة")

    return merged


def update_archive(new_jobs, archive_path, max_jobs=1000):
    existing = []
    if os.path.exists(archive_path):
        try:
            with open(archive_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except:
            existing = []

    existing_keys = set()
    for job in existing:
        key = get_job_key(job)
        if key:
            existing_keys.add(key)

    added = 0
    for job in new_jobs:
        key = get_job_key(job)
        if not key or key not in existing_keys:
            existing.append(job)
            if key:
                existing_keys.add(key)
            added += 1

    # الاحتفاظ بآخر 1000 وظيفة في الأرشيف
    existing = existing[-max_jobs:]

    with open(archive_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

    print(f"📦 الأرشيف: +{added} جديدة، إجمالي: {len(existing)}")
    return existing


def update_sitemap(all_jobs, sitemap_path):
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    static_pages = [
        {"url": f"{BASE_URL}/",                "priority": "1.0", "changefreq": "daily"},
        {"url": f"{BASE_URL}/trends.html",     "priority": "0.8", "changefreq": "weekly"},
        {"url": f"{BASE_URL}/privacy.html",    "priority": "0.3", "changefreq": "monthly"},
        {"url": f"{BASE_URL}/terms.html",      "priority": "0.3", "changefreq": "monthly"},
        {"url": f"{BASE_URL}/disclaimer.html", "priority": "0.3", "changefreq": "monthly"},
    ]

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]

    for page in static_pages:
        xml_lines.append(f"""  <url>
    <loc>{page['url']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")

    added_urls = set()
    for job in all_jobs:
        job_id  = str(job.get('id', ''))
        job_url = job.get('url', '') or job.get('job_apply_link', '')
        if not job_id:
            continue
        page_url = (
            f"{BASE_URL}/job.html"
            f"?id={urllib.parse.quote(job_id)}"
            f"&url={urllib.parse.quote(str(job_url))}"
        )
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

    print(f"🗺️ sitemap.xml: {len(added_urls)} وظيفة + {len(static_pages)} صفحة ثابتة")


def main():
    print("=" * 50)
    print(f"🕐 بدء: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)

    fantastic_key = os.environ.get("FANTASTIC_API_KEY", "").strip()
    rapid_key     = os.environ.get("RAPID_API_KEY", "").strip()

    if not fantastic_key and not rapid_key:
        print("⚠️ لا يوجد أي مفتاح API!")
        return

    base_dir     = os.path.dirname(os.path.abspath(__file__))
    jobs_path    = os.path.join(base_dir, 'jobs.json')
    archive_path = os.path.join(base_dir, 'archive', 'jobs_archive.json')
    sitemap_path = os.path.join(base_dir, 'sitemap.xml')

    os.makedirs(os.path.dirname(archive_path), exist_ok=True)

    new_jobs = []

    if fantastic_key:
        print("\n📡 [1/2] Fantastic (active-jobs-db)...")
        jobs = fetch_from_fantastic(fantastic_key)
        new_jobs.extend(jobs)
        print(f"  → {len(jobs)} وظيفة")
    else:
        print("⏭️ FANTASTIC_API_KEY غير موجود")

    if rapid_key:
        print("\n📡 [2/2] JSearch (RAPID_API_KEY)...")
        jobs = fetch_from_jsearch(rapid_key)
        new_jobs.extend(jobs)
        print(f"  → {len(jobs)} وظيفة")
    else:
        print("⏭️ RAPID_API_KEY غير موجود")

    if not new_jobs:
        print("\n❌ لم يتم جلب أي وظائف!")
        return

    # إزالة مكررات الدفعة الجديدة
    new_jobs = remove_duplicates(new_jobs)
    print(f"\n📥 وظائف جديدة (بعد إزالة مكررات الدفعة): {len(new_jobs)}")

    # ✅ دمج مع jobs.json والاحتفاظ بأحدث 1000
    print("\n🔀 دمج مع jobs.json...")
    final_jobs = merge_with_existing(new_jobs, jobs_path, max_jobs=1000)

    # حفظ jobs.json
    with open(jobs_path, 'w', encoding='utf-8') as f:
        json.dump(final_jobs, f, indent=2, ensure_ascii=False)
    print(f"💾 jobs.json: {len(final_jobs)} وظيفة محفوظة")

    # تحديث الأرشيف
    print("\n📦 تحديث الأرشيف...")
    update_archive(new_jobs, archive_path, max_jobs=1000)

    # تحديث sitemap
    print("\n🗺️ تحديث sitemap.xml...")
    update_sitemap(final_jobs, sitemap_path)

    print("\n" + "=" * 50)
    print(f"✅ اكتمل: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"📊 jobs.json: {len(final_jobs)} | sitemap: {len(final_jobs)} رابط")
    print("=" * 50)


if __name__ == "__main__":
    main()
