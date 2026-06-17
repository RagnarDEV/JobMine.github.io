/* ==========================================================================
   JobMine - Core Application Logic
   ========================================================================== */

// مصفوفة عالمية لتخزين الوظائف بعد جلبها
let allJobs = [];

// 1. دالة جلب البيانات من ملف JSON
async function fetchJobsData() {
    const container = document.getElementById('jobsContainer');
    try {
        // جلب ملف البيانات الساكن
        const response = await fetch('jobs.json');
        if (!response.ok) {
            throw new Error('Failed to fetch jobs database');
        }
        allJobs = await response.json();
        
        // تحديث لوحة الإحصائيات الحية بناءً على البيانات المستلمة
        updateStatsDashboard(allJobs);
        
        // عرض الوظائف في الواجهة
        displayJobs(allJobs);
        
    } catch (error) {
        console.error("Error loading JobMine database:", error);
        container.innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ffc107; font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Failed to load jobs. Please try refreshing the page later.</p>
            </div>
        `;
    }
}

// 2. دالة تحديث الإحصائيات حياً في أعلى الصفحة
function updateStatsDashboard(jobs) {
    const totalJobsElement = document.getElementById('statTotalJobs');
    const totalCompaniesElement = document.getElementById('statTotalCompanies');
    
    // حساب عدد الوظائف الكلي
    totalJobsElement.innerText = jobs.length;
    
    // حساب عدد الشركات الفريدة بدون تكرار
    const uniqueCompanies = [...new Set(jobs.map(job => job.company))];
    totalCompaniesElement.innerText = uniqueCompanies.length;
}

// 3. دالة بناء وعرض كروت الوظائف في الصفحة
function displayJobs(jobs) {
    const container = document.getElementById('jobsContainer');
    container.innerHTML = ''; // تنظيف حاوية العرض قبل الطباعة

    // في حال عدم وجود وظائف تطابق البحث
    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-magnifying-glass-blur" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No remote jobs found matching your criteria. Try another keyword!</p>
            </div>
        `;
        return;
    }

    // بناء الكروت لكل وظيفة متاح في المصفوفة
    jobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';

        // توليد كود الـ HTML الخاص بالمهارات (Tags)
        const tagsHTML = job.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

        card.innerHTML = `
            <div class="job-details">
                <div class="job-title">${job.title}</div>
                <div class="job-company">${job.company}</div>
                <div class="job-meta">
                    <span><i class="fa-solid fa-earth-americas"></i> ${job.location}</span>
                    <span><i class="fa-solid fa-clock"></i> ${job.type}</span>
                    <span><i class="fa-solid fa-wallet"></i> ${job.salary}</span>
                </div>
                <div class="job-tags" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
                    ${tagsHTML}
                </div>
            </div>
            <div>
                <a href="${job.apply_link}" target="_blank" class="apply-btn">Apply Now <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8rem; margin-left: 4px;"></i></a>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. محرك البحث والفلترة الفورية
function filterJobsFeed() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedCategory = document.getElementById('categoryFilter').value;

    const filteredList = allJobs.filter(job => {
        // البحث بالاسم، الشركة، أو الكلمات الدلالية للـ Tags
        const matchesSearch = job.title.toLowerCase().includes(searchQuery) || 
                              job.company.toLowerCase().includes(searchQuery) ||
                              job.tags.some(tag => tag.toLowerCase().includes(searchQuery));
                              
        // التصفية حسب القسم المختار
        const matchesCategory = selectedCategory === 'all' || job.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayJobs(filteredList);
}

// 5. ربط أحداث الإدخال (Event Listeners) بصندوق البحث والقائمة المنسدلة
document.getElementById('searchInput').addEventListener('input', filterJobsFeed);
document.getElementById('categoryFilter').addEventListener('change', filterJobsFeed);

// تشغيل جلب البيانات بمجرد اكتمال تحميل عناصر الصفحة
window.addEventListener('DOMContentLoaded', fetchJobsData);
