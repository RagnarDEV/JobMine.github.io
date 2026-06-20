import json
import os
from datetime import datetime, timedelta

# تحميل ملف الوظائف الخاص بك
with open('jobs.json', 'r') as f:
    data = json.load(f)

# فرضاً أن أول وظيفة في الملف هي الأحدث
latest_job_date = datetime.strptime(data[0]['date'], '%Y-%m-%d')
time_threshold = datetime.now() - timedelta(hours=6) # إذا مر أكثر من 6 ساعات ولم يتحدث الملف

if latest_job_date < time_threshold:
    print("تنبيه: لم يتم تحديث الوظائف منذ فترة!")
    # هنا يمكنك إضافة كود لفتح Issue في GitHub تلقائياً
else:
    print("نظام التحديث يعمل بشكل سليم.")
