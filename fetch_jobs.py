import urllib.request
import urllib.parse
import json
import os
from datetime import datetime, timezone

# ============================================================
SEARCH_TITLES   = ["Developer", "Engineer", "Designer", "Product Manager", "DevOps"]
TIME_FRAME      = "24h"
LIMIT_PER_QUERY = 50
BASE_URL        = "https://www.jobmine.site.je"
MAX_JOBS        = 1000
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
    job_id  = job.get('id') or job.get('job_id') or ''
    job_url = job.get('url') or job.get('job_apply_link') or ''
    id_str  = str(job_id).strip() if job_id else ''
    url_str = str(job_url).strip() if job_url else ''

    if id_str and id_str not in ('0', 'None', 'null', ''):
        return id_str
    if url_str and url_str not in ('None', 'null', ''):
        return url_str
    return None


def remove_duplicates(jobs):
    seen   = set()
    unique = []
    for job in jobs:
        key = get_job_key(job)
        if key is None:
            unique.append(job)
        elif key not in seen:
            seen.add(key)
            unique.append(job)
    return unique


def merge_with_existing(new_jobs, jobs_path, max_jobs=MAX_JOBS):
    existing = []
    if os.path.exists(jobs_path):
        try:
            with open(jobs_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    existing = json.loads(content)
            print(f"  📂 jobs.json الحالي: {len(existing)} وظيفة")
        except Exception as e:
            existing = []
            print(f"  ⚠️ خطأ في قراءة jobs.json: {e} — سيتم إنشاؤه من جديد")

    existing_keys = set()
    for job in existing:
        key = get_job_key(job)
        if key:
            existing_keys.add(key)

    print(f"  📊 مفاتيح موجودة: {len(existing_keys)}")

    truly_new = []
    skipped   = 0
    for job in new_jobs:
        key = get_job_key(job)
        if key is None or key not in existing_keys:
            truly_new.append(job)
            if key:
                existing_keys.add(key)
        else:
            skipped += 1

    print(f"  🆕 وظائف جديدة فعلاً: {len(truly_new)}")
    print(f"  ♻️  مكررات تم تخطيها: {skipped}")

    merged = truly_new + existing

    if len(merged) > max_jobs:
        removed = len(merged) - max_jobs
        merged  = merged[:max_jobs]
        print(f"  ✂️ تم حذف {removed} وظيفة قديمة للحفاظ على الحد ({max_jobs})")

    print(f"  📦 إجمالي بعد الدمج: {len(merged)} وظيفة")
    return merged


def update_archive(new_jobs, archive_path, max_jobs=MAX_JOBS):
    existing = []
    if os.path.exists(archive_path):
        try:
            with open(archive_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    existing = json.loads(content)
        except Exception as e:
            existing = []
            print(f"  ⚠️ خطأ في قراءة الأرشيف: {e}")

    existing_keys = set()
    for job in existing:
        key = get_job_key(job)
        if key:
            existing_keys.add(key)

    added = 0
    for job in new_jobs:
        key = get_job_key(job)
        if key is None or key not in existing_keys:
            existing.append(job)
            if key:
                existing_keys.add(key)
            added += 1

    if len(existing) > max_jobs:
        existing = existing[-max_jobs:]

    try:
        with open(archive_path, 'w', encoding='utf-8') as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        print(f"  📦 الأرشيف: +{added} جديدة، إجمالي: {len(existing)}")
    except Exception as e:
        print(f"  ❌ خطأ في حفظ الأرشيف: {e}")

    return existing


def escape_xml(text):
    """✅ تشفير النصوص لتكون صالحة في XML"""
    return (
        str(text)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&apos;')
    )


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

    # الصفحات الثابتة
    for page in static_pages:
        xml_lines.append(f"""  <url>
    <loc>{page['url']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")

    # ✅ صفحات الوظائف مع تشفير صحيح
    added_urls = set()
    skipped    = 0

    for job in all_jobs:
        job_id  = job.get('id') or job.get('job_id') or ''
        job_url = job.get('url') or job.get('job_apply_link') or ''

        id_str  = str(job_id).strip() if job_id else ''
        url_str = str(job_url).strip() if job_url else ''

        if not id_str or id_str in ('0', 'None', 'null'):
            skipped += 1
            continue

        # ✅ تشفير المعاملات بشكل صحيح
        encoded_id  = urllib.parse.quote(id_str,  safe='')
        encoded_url = urllib.parse.quote(url_str, safe='')

        # ✅ استخدام &amp; بدل & في XML
        page_url = f"{BASE_URL}/job.html?id={encoded_id}&amp;url={encoded_url}"

        if page_url not in added_urls:
            added_urls.add(page_url)
            xml_lines.append(f"""  <url>
    <loc>{page_url}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>""")

    xml_lines.append('</urlset>')

    try:
        with open(sitemap_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(xml_lines))
        size = os.path.getsize(sitemap_path)
        print(f"  ✅ sitemap.xml: {len(added_urls)} وظيفة + {len(static_pages)} صفحة | حجم: {size:,} bytes")
        if skipped:
            print(f"  ⚠️ تم تخطي {skipped} وظيفة بدون id صالح")
    except Exception as e:
        print(f"  ❌ خطأ في حفظ sitemap.xml: {e}")


def main():
    print("=" * 55)
    print(f"🕐 بدء: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 55)

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
        print("\n📡 [1/2] Fantastic API (active-jobs-db)...")
        jobs = fetch_from_fantastic(fantastic_key)
        new_jobs.extend(jobs)
        print(f"  → Fantastic إجمالي: {len(jobs)} وظيفة")
    else:
        print("⏭️ FANTASTIC_API_KEY غير موجود، تم التخطي")

    if rapid_key:
        print("\n📡 [2/2] JSearch API (RAPID_API_KEY)...")
        jobs = fetch_from_jsearch(rapid_key)
        new_jobs.extend(jobs)
        print(f"  → JSearch إجمالي: {len(jobs)} وظيفة")
    else:
        print("⏭️ RAPID_API_KEY غير موجود، تم التخطي")

    if not new_jobs:
        print("\n❌ لم يتم جلب أي وظائف — لا تغييرات.")
        return

    before   = len(new_jobs)
    new_jobs = remove_duplicates(new_jobs)
    print(f"\n🔄 إزالة المكررات: {before} ← {len(new_jobs)} وظيفة")

    print("\n🔀 دمج مع jobs.json الحالي...")
    final_jobs = merge_with_existing(new_jobs, jobs_path, max_jobs=MAX_JOBS)

    try:
        with open(jobs_path, 'w', encoding='utf-8') as f:
            json.dump(final_jobs, f, indent=2, ensure_ascii=False)
        size = os.path.getsize(jobs_path)
        print(f"\n💾 jobs.json محفوظ: {len(final_jobs)} وظيفة | حجم: {size:,} bytes")
    except Exception as e:
        print(f"\n❌ خطأ في حفظ jobs.json: {e}")
        return

    print("\n📦 تحديث الأرشيف...")
    update_archive(new_jobs, archive_path, max_jobs=MAX_JOBS)

    print("\n🗺️ تحديث sitemap.xml...")
    update_sitemap(final_jobs, sitemap_path)

    print("\n" + "=" * 55)
    print(f"✅ اكتمل: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"📊 jobs.json:   {len(final_jobs)} وظيفة")
    print(f"🗺️ sitemap.xml: محدّث")
    print(f"📦 الأرشيف:     محدّث")
    print("=" * 55)


if __name__ == "__main__":
    main()
