/* ==========================================================================
   JobMine - Core Application Logic (Pagination & Random Filtering)
   ========================================================================== */

// مصفوفة عالمية لتخزين جميع الوظائف بعد جلبها
let allJobs = [];

// متغيرات التحكم في أعداد الوظائف المعروضة والتقطيع (Pagination)
let displayedLatestCount = 20;
let displayedFeaturedCount = 20;

// 1. دالة جلب البيانات من ملف JSON
async function fetchJobsData() {
    try {
        const response = await fetch('jobs.json');
        if (!response.ok) {
            throw new Error('Failed to fetch jobs database');
        }
        allJobs = await response.json();
        
        // تحديث لوحة الإحصائيات الحية بناءً على إجمالي البيانات المستلمة
        updateStatsDashboard(allJobs);
        
        // التشغيل الأولي للفص والفلترة والعرض
        filterAndRenderJobs();
        
    } catch (error) {
        console.error("Error loading JobMine database:", error);
        const container = document.getElementById('jobsContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #ffc107; font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Failed to load jobs. Please try refreshing the page later.</p>
                </div>
            `;
        }
    }
}

// 2. دالة تحديث الإحصائيات حياً في أعلى الصفحة بأرقام حقيقية
function updateStatsDashboard(jobs) {
    const totalJobsElement = document.getElementById('statTotalJobs');
    const totalCompaniesElement = document.getElementById('statTotalCompanies');
    
    if (totalJobsElement) totalJobsElement.innerText = jobs.length.toLocaleString() + '+';
    
    if (totalCompaniesElement) {
        const uniqueCompanies = [...new Set(jobs.map(job => job.company))];
        totalCompaniesElement.innerText = uniqueCompanies.length.toLocaleString() + '+';
    }
}

// دالة مساعدة لعمل خلط عشوائي للمصفوفات (Fisher-Yates Shuffle Algorithm)
function shuffleArray(array) {
    const newArray = [...array]; // أخذ نسخة من المصفوفة لعدم تخريب الترتيب الأصلي الكلي
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 3. المحرك الرئيسي للفلترة، الفصل العشوائي، والعرض المتزامن
function filterAndRenderJobs() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedCategory = document.getElementById('categoryFilter').value;

    // أولاً: تطبيق فلاتر البحث والفلترة على مصفوفة الوظائف الكاملة
    const filteredList = allJobs.filter(job => {
        const tagsArray = Array.isArray(job.tags) ? job.tags : [];
        
        const matchesSearch = job.title.toLowerCase().includes(searchQuery) || 
                              job.company.toLowerCase().includes(searchQuery) ||
                              tagsArray.some(tag => tag.toLowerCase().includes(searchQuery));
                              
        const matchesCategory = selectedCategory === 'all' || job.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // ثانياً: خلط الوظائف المفلترة عشوائياً واقتطاع المميز منها
    const randomizedList = shuffleArray(filteredList);

    // سنأخذ 5 وظائف عشوائية تماماً من القائمة المخلوطة لتكون في قسم "المميزة"
    const featuredJobs = randomizedList.slice(0, 5); 
    
    // باقي الوظائف تذهب إلى قسم "أحدث الوظائف" بالترتيب العشوائي أيضاً لكسر التكرار
    const latestJobs = randomizedList.slice(5); 

    // ثالثاً: إرسال القوائم إلى دوال العرض مع تطبيق الـ Pagination
    renderFeaturedSection(featuredJobs);
    renderLatestSection(latestJobs);
}

// 4. دالة عرض قسم الوظائف المميزة (Featured Jobs)
function renderFeaturedSection(jobs) {
    const container = document.getElementById('featuredJobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreFeaturedBtn');
    if (!container) return;

    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = '<div class="loading-status" style="font-size:0.9rem; color:#8b949e; text-align:center; padding:15px;">No premium featured jobs matching this criteria.</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    const jobsToDisplay = jobs.slice(0, displayedFeaturedCount);

    jobsToDisplay.forEach(job => {
        container.appendChild(createJobCard(job, true));
    });

    if (loadMoreBtn) {
        if (displayedFeaturedCount >= jobs.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }
}

// 5. دالة عرض قسم أحدث الوظائف (Latest Openings)
function renderLatestSection(jobs) {
    const container = document.getElementById('jobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreLatestBtn');
    if (!container) return;

    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="text-align:center; padding:20px; color:#8b949e; width: 100%;">
                <i class="fa-solid fa-magnifying-glass-blur" style="font-size: 2rem; margin-bottom: 10px; color:#ffc107;"></i>
                <p>No remote openings found matching your criteria.</p>
            </div>
        `;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    const jobsToDisplay = jobs.slice(0, displayedLatestCount);

    jobsToDisplay.forEach(job => {
        container.appendChild(createJobCard(job, false));
    });

    if (loadMoreBtn) {
        if (displayedLatestCount >= jobs.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }
}

// 6. دالة بناء كرت الوظيفة الموحد (HTML Builder)
function createJobCard(job, isFeatured = false) {
    const card = document.createElement('div');
    card.className = `job-card ${isFeatured ? 'featured-job-style' : ''}`;
    if (isFeatured) {
        card.style.borderLeft = '4px solid #ffc107';
        card.style.backgroundColor = 'rgba(255, 193, 7, 0.02)';
    }

    let categoryIcon = '<i class="fa-solid fa-briefcase"></i>';
    if (job.category === 'Development') categoryIcon = '<i class="fa-solid fa-code"></i>';
    if (job.category === 'Design') categoryIcon = '<i class="fa-solid fa-paint-brush"></i>';
    if (job.category === 'Marketing') categoryIcon = '<i class="fa-solid fa-chart-line"></i>';
    if (job.category === 'Product') categoryIcon = '<i class="fa-solid fa-box-open"></i>';

    const tagsArray = Array.isArray(job.tags) ? job.tags : [];
    const tagsHTML = tagsArray.map(tag => `<span class="tag">${tag}</span>`).join('');

    const finalApplyLink = job.apply_link || job.url || '#';

    card.innerHTML = `
        <div class="job-details">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div class="job-icon-box" style="color: #ffc107; font-size: 1.1rem;">${categoryIcon}</div>
                <div>
                    <div class="job-title" style="font-weight: 600; color: #ffffff;">${job.title}</div>
                    <div class="job-company" style="color: #8b949e; font-size: 0.9rem;">${job.company}</div>
                </div>
            </div>
            <div class="job-meta" style="font-size: 0.85rem; color: #8b949e; display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
                <span><i class="fa-solid fa-earth-americas"></i> ${job.location || 'Remote Worldwide'}</span>
                <span><i class="fa-solid fa-clock"></i> ${job.type || 'Full-time'}</span>
                <span><i class="fa-solid fa-wallet"></i> ${job.salary || 'Competitive'}</span>
            </div>
            <div class="job-tags" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px;">
                ${tagsHTML}
            </div>
        </div>
        <div style="margin-top: 15px; text-align: right;">
            <a href="${finalApplyLink}" target="_blank" class="apply-btn" style="background-color: #ffc107; color: #0d1117; padding: 8px 16px; border-radius: 6px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 0.88rem;">Apply Now <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem; margin-left: 4px;"></i></a>
        </div>
    `;
    return card;
}

// 7. ربط أحداث الضغط على أزرار "Load More" لتوسيع نطاق العرض
function setupPaginationEvents() {
    const loadMoreLatestBtn = document.getElementById('loadMoreLatestBtn');
    const loadMoreFeaturedBtn = document.getElementById('loadMoreFeaturedBtn');

    if (loadMoreLatestBtn) {
        loadMoreLatestBtn.addEventListener('click', () => {
            displayedLatestCount += 20;
            filterAndRenderJobs();
        });
    }

    if (loadMoreFeaturedBtn) {
        loadMoreFeaturedBtn.addEventListener('click', () => {
            displayedFeaturedCount += 20;
            filterAndRenderJobs();
        });
    }
}

// 8. ربط أحداث الإدخال والبحث الفوري وتحديث العشوائية عند الفلترة الجديدة
function setupFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    const handleFilteringReset = () => {
        displayedLatestCount = 20; 
        displayedFeaturedCount = 20;
        filterAndRenderJobs();
    };

    if (searchInput) searchInput.addEventListener('input', handleFilteringReset);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilteringReset);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchJobsData();
    setupFilterListeners();
    setupPaginationEvents();
});
