def fetch_from_fantastic_jobs():
    print("🚀 Backup Mining Engine Active: Fetching via Active Jobs DB (Fantastic Jobs)...")
    api_key = os.getenv("FANTASTIC_API_KEY")
    if not api_key or len(api_key.strip()) < 10:
        print("⚠️ FANTASTIC_API_KEY missing or invalid. Skipping Active Jobs DB.")
        return []
        
    api_key = api_key.strip()
    jobs = []
    
    # 🎯 تم ضبط المعاملات حرفياً وتبسيطها لتطابق نظام طلبات RapidAPI الصارم الخاص بك
    params = {
        "time_frame": "all",
        "limit": "50",
        "offset": "0",
        "description_format": "text",
        "title": "Developer"
    }
    encoded_params = urllib.parse.urlencode(params)
    url = f"https://active-jobs-db.p.rapidapi.com/active-jobs?{encoded_params}"
    
    headers = {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": api_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
            job_entries = res_data if isinstance(res_data, list) else res_data.get('jobs', [])
            
            for j_data in job_entries:
                title = j_data.get('title', 'Remote Specialist')
                company = j_data.get('companyName', j_data.get('company', 'Tech Company'))
                tags = [title, j_data.get('category', '')]
                
                raw_date = j_data.get('postDate', datetime.now().strftime('%Y-%m-%d'))
                posted_at = raw_date.split('T')[0] if 'T' in raw_date else raw_date
                
                description = j_data.get('description', '')
                qualifications = []
                if description:
                    qualifications = [line.strip('- *') for line in description.split('\n') if len(line.strip()) > 10][:3]

                jobs.append({
                    "id": 0,
                    "title": title,
                    "company": company,
                    "category": map_category(tags),
                    "location": j_data.get('location', 'Worldwide Remote'),
                    "type": "Remote",
                    "salary": "Competitive",
                    "tags": tags[:3],
                    "apply_link": j_data.get('url', j_data.get('applyUrl', 'https://google.com/search?q=jobs')),
                    "date": posted_at,
                    "qualifications": qualifications,
                    "responsibilities": []
                })
        print(f"🎯 Successfully extracted {len(jobs)} vacancies via Active Jobs DB.")
    except Exception as e:
        print(f"⚠️ Active Jobs DB sync issue: {e}")
    return jobs
