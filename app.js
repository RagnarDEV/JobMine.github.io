/* ==========================================================================
   JobMine - Core Application Logic (Premium SEO & Dynamic Schema Ecosystem)
   ========================================================================== */

let allJobs = [];

// عدادات التقطيع الافتراضية للوظائف
let displayedLatestCount = 20;
let displayedFeaturedCount = 20;

// 1. جلب البيانات من ملف JSON الافتراضي
async function fetchJobsData() {
    try {
        const response = await fetch('jobs.json');
        if (!response.ok) {
            throw new Error('Failed to fetch jobs database');
        }
        allJobs = await response.json();
        
        updateStatsDashboard(allJobs);
        filterAndRenderJobs();
        
    } catch (error) {
        console.error("Error loading JobMine database:", error);
        const container = document.getElementById('jobsContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-results" style="text-align:center; padding:20px; color:#8b949e; width: 100%;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #ffc107; font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Failed to load opportunities. Please try refreshing the page later.</p>
                </div>
            `;
        }
    }
}

// 2. تحديث لوحة الإحصائيات الذكية
function updateStatsDashboard(jobs) {
    const totalJobsElement = document.getElementById('statTotalJobs');
    const totalCompaniesElement = document.getElementById('statTotalCompanies');
    
    if (totalJobsElement) totalJobsElement.innerText = jobs.length.toLocaleString() + '+';
    
    if (totalCompaniesElement) {
        const uniqueCompanies = [...new Set(jobs.map(job => job.company))];
        totalCompaniesElement.innerText = uniqueCompanies.length.toLocaleString() + '+';
    }
}

// دالة الخلط العشوائي ثنائية الثبات لكسر الرتابة البصرية
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 🌐 محرك الـ SEO المتقدم: حقن الـ Structured Data (Google Jobs Schema) ديناميكياً
function injectJobSchema(job) {
    // بناء الهيكل البرمجي المعتمد لدى عناكب بحث جوجل للوظائف عن بعد
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": job.title,
        "description": `Premium remote career opportunity for a talented ${job.title} to join ${job.company || 'a global enterprise'}. This position is 100% remote working worldwide.`,
        "datePosted": job.date || new Date().toISOString().split('T')[0],
        "validThrough": new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // صالحة لمدة 60 يوماً
        "employmentType": "FULL_TIME",
        "hiringOrganization": {
            "@type": "Organization",
            "name": job.company || "Verified Global Enterprise",
            "sameAs": "https://www.jobmine.site.je/"
        },
        "jobLocationType": "TELECOMMUTE", // إشارة صريحة لجوجل أن الوظيفة عن بعد بالكامل
        "applicantLocationRequirements": {
            "@type": "Country",
            "name": "Anywhere"
        },
        "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": {
                "@type": "QuantitativeValue",
                "unitText": "MONTH"
            }
        }
    };

    // إنشاء العنصر برمجياً وحقنه في الـ <head>
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.className = 'dynamic-job-schema'; // فئة مميزة لتسهيل تنظيفها لاحقاً
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
}

// دالة تنظيف الـ Schema القديمة عند إعادة التصفية والبحث لمنع التضارب
function clearOldSchemas() {
    const oldScripts = document.querySelectorAll('.dynamic-job-schema');
    oldScripts.forEach(script => script.remove());
}

// 3. المحرك المطور للفلترة والفرز الفوري
function filterAndRenderJobs() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";

    // تصفية المصفوفة بناءً على البحث والقطاع المختار
    const filteredList = allJobs.filter(job => {
        const tagsArray = Array.isArray(job.tags) ? job.tags : [];
        
        const matchesSearch = job.title.toLowerCase().includes(searchQuery) || 
                              job.company.toLowerCase().includes(searchQuery) ||
                              tagsArray.some(tag => tag.toLowerCase().includes(searchQuery));
                              
        const matchesCategory = selectedCategory === 'all' || job.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // تنظيف أكواد الأرشفة السابقة قبل طباعة النتائج المحدثة
    clearOldSchemas();

    // خلط النتائج المفلترة لكسر التكرار بصرياً
    const randomizedList = shuffleArray(filteredList);

    // تقسيم العناصر المفلترة بالتساوي بين الأقسام المتاحة
    const featuredJobs = randomizedList.slice(0, 5); 
    const latestJobs = randomizedList.slice(5); 

    renderFeaturedSection(featuredJobs);
    renderLatestSection(latestJobs);
}

// 4. عرض الوظائف المميزة (Executive Placements)
function renderFeaturedSection(jobs) {
    const container = document.getElementById('featuredJobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreFeaturedBtn');
    if (!container) return;

    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = '<div class="loading-status" style="font-size:0.9rem; color:#8b949e; text-align:center; padding:15px; width:100%;">No premium corporate placements matching this criteria.</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    const jobsToDisplay = jobs.slice(0, displayedFeaturedCount);

    jobsToDisplay.forEach(job => {
        container.appendChild(createJobCard(job, true));
        injectJobSchema(job); // أرشفة الوظيفة المميزة لدى جوجل تلقائياً
    });

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (displayedFeaturedCount >= jobs.length) ? 'none' : 'block';
    }
}

// 5. عرض أحدث الوظائف المفتوحة (Global Openings)
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
        injectJobSchema(job); // أرشفة الوظيفة العامة لدى جوجل تلقائياً
    });

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (displayedLatestCount >= jobs.length) ? 'none' : 'block';
    }
}

// 6. بناء كرت الوظيفة الموحد المنسق
function createJobCard(job, isFeatured = false) {
    const card = document.createElement('div');
    card.className = `job-card ${isFeatured ? 'featured-job-style' : ''}`;
    if (isFeatured) {
        card.style.borderLeft = '4px solid #ffc107';
        card.style.backgroundColor = 'rgba(255, 193, 7, 0.01)';
    }

    let categoryIcon = '<i class="fa-solid fa-briefcase"></i>';
    if (job.category === 'Development') categoryIcon = '<i class="fa-solid fa-code"></i>';
    if (job.category === 'Design') categoryIcon = '<i class="fa-solid fa-paint-brush"></i>';
    if (job.category === 'Marketing') categoryIcon = '<i class="fa-solid fa-chart-line"></i>';
    if (job.category === 'Product') categoryIcon = '<i class="fa-solid fa-box-open"></i>';

    const tagsArray = Array.isArray(job.tags) ? job.tags : [];
    const tagsHTML = tagsArray.map(tag => `<span class="tag">${tag}</span>`).join('');

    const rawUrl = job.apply_url || job.apply_link || job.url || job.link || '#';
    const targetId = job.id ? encodeURIComponent(job.id) : encodeURIComponent(job.title);
    const internalJobLink = `job.html?id=${targetId}&url=${encodeURIComponent(rawUrl)}`;

    // ==========================================
    // 📊 معالجة الأدوات التفاعلية الذكية الجديدة
    // ==========================================
    let newBadgeHTML = '';
    let highPayBadgeHTML = '';
    let experienceBadgeHTML = '';
    let timeAgoText = job.type || 'Full-time'; // النص الافتراضي في حال غياب التاريخ

    if (job.date) {
        const jobDateObj = new Date(job.date);
        const todayObj = new Date();
        
        jobDateObj.setHours(0,0,0,0);
        todayObj.setHours(0,0,0,0);
        
        const diffTime = todayObj - jobDateObj;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // 1. حساب الوقت المنقضي ديناميكياً (نقطة رقم 2)
        if (diffDays === 0) {
            timeAgoText = 'Posted Today';
            
            // شارة NEW التفاعلية للوظائف المنشورة اليوم فقط
            newBadgeHTML = `
                <span class="new-badge" style="
                    background: linear-gradient(135deg, #ff5722, #ff9800);
                    color: #ffffff;
                    font-size: 0.72rem;
                    font-weight: 800;
                    padding: 3px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    animation: pulseBadge 1.8s infinite;
                    box-shadow: 0 2px 8px rgba(255, 87, 34, 0.4);
                    display: inline-block;
                ">New</span>
            `;
        } else if (diffDays === 1) {
            timeAgoText = 'Posted Yesterday';
        } else if (diffDays > 1) {
            timeAgoText = `Posted ${diffDays} days ago`;
        } else {
            timeAgoText = `Posted on ${job.date}`;
        }
    }

    // 2. فحص مستوى الخبرة تلقائياً من العنوان (نقطة رقم 4)
    const titleLower = job.title.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('expert') || titleLower.includes('principal')) {
        experienceBadgeHTML = `<span style="background: rgba(56, 139, 253, 0.15); color: #58a6ff; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid rgba(56, 139, 253, 0.3);">Senior Level</span>`;
    } else if (titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('intern')) {
        experienceBadgeHTML = `<span style="background: rgba(46, 160, 67, 0.15); color: #56d364; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid rgba(46, 160, 67, 0.3);">Entry Level</span>`;
    }

    // 3. فحص مستويات الرواتب المرتفعة تلقائياً (نقطة رقم 1)
    if (job.salary) {
        const salaryNumbers = job.salary.replace(/,/g, '').match(/\d+/g);
        if (salaryNumbers) {
            const maxNum = Math.max(...salaryNumbers.map(Number));
            if (maxNum >= 90000) {
                highPayBadgeHTML = `<span style="background: rgba(218, 165, 32, 0.15); color: #f1e05a; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid rgba(218, 165, 32, 0.3); display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-fire" style="color: #ff9800;"></i> High Pay</span>`;
            }
        }
    }

    card.innerHTML = `
        <div class="job-details">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div class="job-icon-box" style="color: #ffc107; font-size: 1.1rem;">${categoryIcon}</div>
                <div>
                    <div class="job-title" style="font-weight: 600; color: #ffffff; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${job.title} ${newBadgeHTML}
                    </div>
                    <div class="job-company" style="color: #8b949e; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                        <span>${job.company}</span>
                        ${experienceBadgeHTML}
                        ${highPayBadgeHTML}
                    </div>
                </div>
            </div>
            <div class="job-meta" style="font-size: 0.85rem; color: #8b949e; display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
                <span><i class="fa-solid fa-earth-americas"></i> ${job.location || 'Remote Worldwide'}</span>
                <span><i class="fa-solid fa-clock"></i> ${timeAgoText}</span>
                <span><i class="fa-solid fa-wallet"></i> ${job.salary || 'Competitive'}</span>
            </div>
            <div class="job-tags" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px;">
                ${tagsHTML}
            </div>
        </div>
        <div style="margin-top: 15px; text-align: right;">
            <a href="${internalJobLink}" class="apply-btn" style="background-color: #ffc107; color: #0d1117; padding: 8px 16px; border-radius: 6px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 0.88rem;">View Details <i class="fa-solid fa-arrow-right" style="font-size: 0.75rem; margin-left: 4px;"></i></a>
        </div>
        
        <style>
            @keyframes pulseBadge {
                0% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.05); opacity: 1; box-shadow: 0 4px 12px rgba(255, 87, 34, 0.6); }
                100% { transform: scale(1); opacity: 0.9; }
            }
        </style>
    `;
    return card;
}

// 7. ربط أحداث الـ Pagination (مشاهدة المزيد)
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

// 8. الاستماع الفوري لمدخلات البحث والفلترة وإعادة تصفير العدادات تلقائياً
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
