/* ==========================================================================
   JobMine - Core Application Logic (Premium SEO & Dynamic Schema Ecosystem)
   ========================================================================== */

let allJobs = [];

let displayedLatestCount = 20;
let displayedFeaturedCount = 20;

// 1. جلب البيانات
async function fetchJobsData() {
    try {
        // ✅ مسار مطلق يعمل على GitHub Pages
        const basePath = window.location.pathname.includes('/JobMine.github.io') 
            ? '/JobMine.github.io' 
            : '';
        const response = await fetch(`${basePath}/jobs.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rawData = await response.json();
        
        // ✅ دعم صيغ متعددة من الـ API
        if (Array.isArray(rawData)) {
            allJobs = rawData;
        } else if (rawData.jobs) {
            allJobs = rawData.jobs;
        } else if (rawData.data) {
            allJobs = rawData.data;
        } else {
            allJobs = [];
        }

        // ✅ تطبيع الحقول لضمان التوافق مع الـ API
        allJobs = allJobs.map(job => normalizeJob(job));

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

// ✅ دالة تطبيع الحقول لضمان توافق بيانات الـ API مع الكود
function normalizeJob(job) {
    return {
        id: job.id || job._id || job.job_id || Math.random().toString(36).substr(2, 9),
        title: job.title || job.job_title || job.position || 'Unknown Position',
        company: job.company || job.company_name || job.employer || 'Unknown Company',
        location: job.location || job.job_location || 'Remote Worldwide',
        salary: job.salary || job.salary_range || job.compensation || null,
        date: job.date || job.posted_date || job.date_posted || job.created_at || null,
        type: job.type || job.job_type || job.employment_type || 'Full-time',
        category: normalizeCategory(job.category || job.job_category || job.department || job.title || ''),
        tags: normalizeTags(job.tags || job.skills || job.keywords || job.tech_stack || []),
        qualifications: job.qualifications || job.requirements || job.skills_required || [],
        responsibilities: job.responsibilities || job.duties || job.description_bullets || [],
        apply_link: job.apply_link || job.apply_url || job.application_url || job.url || job.link || '#',
    };
}

// ✅ تطبيع الفئة تلقائياً بناءً على العنوان أو القسم
function normalizeCategory(value) {
    const v = value.toLowerCase();
    if (v.includes('develop') || v.includes('engineer') || v.includes('software') || v.includes('backend') || v.includes('frontend') || v.includes('fullstack')) return 'Development';
    if (v.includes('design') || v.includes('ui') || v.includes('ux')) return 'Design';
    if (v.includes('market') || v.includes('seo') || v.includes('growth') || v.includes('content')) return 'Marketing';
    if (v.includes('product') || v.includes('pm') || v.includes('manager')) return 'Product';
    return 'Other';
}

// ✅ تحويل أي صيغة للتاغات إلى array نظيفة
function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string').slice(0, 5);
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    return [];
}

// 2. تحديث لوحة الإحصائيات
function updateStatsDashboard(jobs) {
    const totalJobsElement = document.getElementById('statTotalJobs');
    const totalCompaniesElement = document.getElementById('statTotalCompanies');
    
    if (totalJobsElement) totalJobsElement.innerText = jobs.length.toLocaleString() + '+';
    
    if (totalCompaniesElement) {
        const uniqueCompanies = [...new Set(jobs.map(job => job.company).filter(Boolean))];
        totalCompaniesElement.innerText = uniqueCompanies.length.toLocaleString() + '+';
    }
}

// ✅ ترتيب ثابت بدل الخلط العشوائي لتجربة أفضل للمستخدم
function sortJobsByDate(jobs) {
    return [...jobs].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });
}

// 3. محرك الفلترة والفرز
function filterAndRenderJobs() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";

    const filteredList = allJobs.filter(job => {
        const tagsArray = Array.isArray(job.tags) ? job.tags : [];
        
        const matchesSearch = 
            (job.title || '').toLowerCase().includes(searchQuery) || 
            (job.company || '').toLowerCase().includes(searchQuery) ||
            tagsArray.some(tag => tag.toLowerCase().includes(searchQuery));
                              
        const matchesCategory = selectedCategory === 'all' || job.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    clearOldSchemas();

    // ✅ ترتيب بالتاريخ بدل الخلط العشوائي
    const sortedList = sortJobsByDate(filteredList);

    const featuredJobs = sortedList.slice(0, 5); 
    const latestJobs = sortedList.slice(5); 

    renderFeaturedSection(featuredJobs);
    renderLatestSection(latestJobs);
}

// محرك SEO Schema
function injectJobSchema(job) {
    let descriptionText = `Premium remote career opportunity for a talented ${job.title} to join ${job.company || 'a global enterprise'}. This position is 100% remote working worldwide.`;
    
    if (job.qualifications && job.qualifications.length > 0) {
        descriptionText += ` Requirements: ${job.qualifications.join(', ')}.`;
    }

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": job.title,
        "description": descriptionText,
        "datePosted": job.date || new Date().toISOString().split('T')[0],
        "validThrough": new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "employmentType": "FULL_TIME",
        "hiringOrganization": {
            "@type": "Organization",
            "name": job.company || "Verified Global Enterprise",
            "sameAs": "https://www.jobmine.site.je/"
        },
        "jobLocationType": "TELECOMMUTE",
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

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.className = 'dynamic-job-schema';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
}

function clearOldSchemas() {
    document.querySelectorAll('.dynamic-job-schema').forEach(s => s.remove());
}

// 4. عرض الوظائف المميزة
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

    jobs.slice(0, displayedFeaturedCount).forEach(job => {
        container.appendChild(createJobCard(job, true));
        injectJobSchema(job);
    });

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (displayedFeaturedCount >= jobs.length) ? 'none' : 'block';
    }
}

// 5. عرض أحدث الوظائف
function renderLatestSection(jobs) {
    const container = document.getElementById('jobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreLatestBtn');
    if (!container) return;

    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="text-align:center; padding:20px; color:#8b949e; width: 100%;">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 10px; color:#ffc107;"></i>
                <p>No remote openings found matching your criteria.</p>
            </div>
        `;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    jobs.slice(0, displayedLatestCount).forEach(job => {
        container.appendChild(createJobCard(job, false));
        injectJobSchema(job);
    });

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (displayedLatestCount >= jobs.length) ? 'none' : 'block';
    }
}

// 6. بناء كرت الوظيفة
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

    const tagsHTML = job.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    const targetId = job.id ? encodeURIComponent(job.id) : encodeURIComponent(job.title);
    const internalJobLink = `job.html?id=${targetId}&url=${encodeURIComponent(job.apply_link)}`;

    let newBadgeHTML = '';
    let highPayBadgeHTML = '';
    let experienceBadgeHTML = '';
    let timeAgoText = job.type || 'Full-time';

    if (job.date) {
        const jobDateObj = new Date(job.date);
        const todayObj = new Date();
        jobDateObj.setHours(0,0,0,0);
        todayObj.setHours(0,0,0,0);
        const diffDays = Math.floor((todayObj - jobDateObj) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            timeAgoText = 'Posted Today';
            newBadgeHTML = `<span class="new-badge" style="background:linear-gradient(135deg,#ff5722,#ff9800);color:#fff;font-size:0.72rem;font-weight:800;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;animation:pulseBadge 1.8s infinite;box-shadow:0 2px 8px rgba(255,87,34,0.4);display:inline-block;">New</span>`;
        } else if (diffDays === 1) {
            timeAgoText = 'Posted Yesterday';
        } else if (diffDays > 1) {
            timeAgoText = `Posted ${diffDays} days ago`;
        }
    }

    const titleLower = (job.title || '').toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('expert') || titleLower.includes('principal')) {
        experienceBadgeHTML = `<span style="background:rgba(56,139,253,0.15);color:#58a6ff;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(56,139,253,0.3);">Senior Level</span>`;
    } else if (titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('intern')) {
        experienceBadgeHTML = `<span style="background:rgba(46,160,67,0.15);color:#56d364;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(46,160,67,0.3);">Entry Level</span>`;
    }

    if (job.salary) {
        const salaryNumbers = job.salary.replace(/,/g, '').match(/\d+/g);
        if (salaryNumbers && Math.max(...salaryNumbers.map(Number)) >= 90000) {
            highPayBadgeHTML = `<span style="background:rgba(218,165,32,0.15);color:#f1e05a;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(218,165,32,0.3);display:flex;align-items:center;gap:4px;"><i class="fa-solid fa-fire" style="color:#ff9800;"></i> High Pay</span>`;
        }
    }

    let highlightsHTML = '';
    if ((job.qualifications && job.qualifications.length > 0) || (job.responsibilities && job.responsibilities.length > 0)) {
        highlightsHTML = `<div class="job-highlights-preview" style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid rgba(255,255,255,0.05);font-size:0.82rem;color:#c9d1d9;">`;
        if (job.qualifications && job.qualifications.length > 0) {
            highlightsHTML += `<div style="margin-bottom:6px;"><strong style="color:#ffc107;font-size:0.8rem;text-transform:uppercase;"><i class="fa-solid fa-award"></i> Requirements:</strong><ul style="margin:4px 0 0 15px;padding:0;list-style-type:disc;">${job.qualifications.map(q => `<li style="margin-bottom:2px;">${q}</li>`).join('')}</ul></div>`;
        }
        if (job.responsibilities && job.responsibilities.length > 0) {
            highlightsHTML += `<div><strong style="color:#58a6ff;font-size:0.8rem;text-transform:uppercase;"><i class="fa-solid fa-list-check"></i> Core Tasks:</strong><ul style="margin:4px 0 0 15px;padding:0;list-style-type:disc;">${job.responsibilities.map(r => `<li style="margin-bottom:2px;">${r}</li>`).join('')}</ul></div>`;
        }
        highlightsHTML += `</div>`;
    }

    card.innerHTML = `
        <div class="job-details">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <div class="job-icon-box" style="color:#ffc107;font-size:1.1rem;">${categoryIcon}</div>
                <div>
                    <div class="job-title" style="font-weight:600;color:#ffffff;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        ${job.title} ${newBadgeHTML}
                    </div>
                    <div class="job-company" style="color:#8b949e;font-size:0.9rem;display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        <span>${job.company}</span>
                        ${experienceBadgeHTML}
                        ${highPayBadgeHTML}
                    </div>
                </div>
            </div>
            <div class="job-meta" style="font-size:0.85rem;color:#8b949e;display:flex;gap:15px;flex-wrap:wrap;margin-top:10px;">
                <span><i class="fa-solid fa-earth-americas"></i> ${job.location}</span>
                <span><i class="fa-solid fa-clock"></i> ${timeAgoText}</span>
                <span><i class="fa-solid fa-wallet"></i> ${job.salary || 'Competitive'}</span>
            </div>
            ${highlightsHTML}
            <div class="job-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
                ${tagsHTML}
            </div>
        </div>
        <div style="margin-top:15px;text-align:right;">
            <a href="${internalJobLink}" class="apply-btn" style="background-color:#ffc107;color:#0d1117;padding:8px 16px;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block;font-size:0.88rem;">View Details <i class="fa-solid fa-arrow-right" style="font-size:0.75rem;margin-left:4px;"></i></a>
        </div>
        <style>
            @keyframes pulseBadge {
                0% { transform:scale(1); opacity:0.9; }
                50% { transform:scale(1.05); opacity:1; box-shadow:0 4px 12px rgba(255,87,34,0.6); }
                100% { transform:scale(1); opacity:0.9; }
            }
        </style>
    `;
    return card;
}

// 7. Pagination
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

// 8. أحداث البحث والفلترة
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
