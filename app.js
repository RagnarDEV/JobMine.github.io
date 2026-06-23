/* ==========================================================================
   JobMine - Core Application Logic
   ========================================================================== */

let allJobs = [];
let displayedLatestCount = 20;
let displayedFeaturedCount = 20;

// 1. جلب البيانات
async function fetchJobsData() {
    try {
        const basePath = window.location.pathname.includes('/JobMine.github.io') 
            ? '/JobMine.github.io' 
            : '';
        const response = await fetch(`${basePath}/jobs.json`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const rawData = await response.json();
        
        if (Array.isArray(rawData)) {
            allJobs = rawData;
        } else if (rawData.jobs) {
            allJobs = rawData.jobs;
        } else if (rawData.data) {
            allJobs = rawData.data;
        } else {
            allJobs = [];
        }

        // تطبيع ثم تصفية الوظائف الفارغة
        allJobs = allJobs
            .map(job => normalizeJob(job))
            .filter(job => job !== null && job.title && job.company);

        updateStatsDashboard(allJobs);
        filterAndRenderJobs();
        
    } catch (error) {
        console.error("Error loading JobMine database:", error);
        const container = document.getElementById('jobsContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-results" style="text-align:center;padding:20px;color:#8b949e;width:100%;">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#ffc107;font-size:2rem;margin-bottom:10px;"></i>
                    <p>Failed to load opportunities. Please try refreshing the page later.</p>
                </div>
            `;
        }
    }
}

// 2. تطبيع البيانات — يدعم Fantastic API و JSearch API
function normalizeJob(job) {
    // ✅ العنوان — Fantastic: title | JSearch: job_title
    const title = job.title || job.job_title || job.position || null;

    // ✅ الشركة — Fantastic: organization | JSearch: employer_name
    const company = job.organization || job.employer_name || job.company_name || job.company || null;

    // تخطي الوظائف بدون عنوان أو شركة
    if (!title || !company) return null;

    // ✅ الموقع — Fantastic: locations_derived | JSearch: job_city + job_country
    let location = 'Remote Worldwide';
    if (job.locations_derived && job.locations_derived.length > 0) {
        location = job.locations_derived[0];
    } else if (job.job_city && job.job_country) {
        location = `${job.job_city}, ${job.job_country}`;
    } else if (job.job_country) {
        location = job.job_country;
    } else if (
        job.ai_work_arrangement === 'Remote Solely' ||
        job.location_type === 'TELECOMMUTE' ||
        job.job_is_remote === true
    ) {
        location = 'Remote Worldwide';
    }

    // ✅ الراتب — Fantastic: ai_salary_* | JSearch: job_min_salary + job_max_salary
    let salary = null;
    if (job.ai_salary_min_value && job.ai_salary_max_value) {
        const cur  = job.ai_salary_currency || 'USD';
        const unit = job.ai_salary_unit_text === 'YEAR'  ? '/yr' :
                     job.ai_salary_unit_text === 'HOUR'  ? '/hr' :
                     job.ai_salary_unit_text === 'MONTH' ? '/mo' : '';
        salary = `${cur} ${job.ai_salary_min_value.toLocaleString()} - ${job.ai_salary_max_value.toLocaleString()}${unit}`;
    } else if (job.ai_salary_value) {
        const cur  = job.ai_salary_currency || 'USD';
        const unit = job.ai_salary_unit_text === 'HOUR' ? '/hr' :
                     job.ai_salary_unit_text === 'YEAR' ? '/yr' : '';
        salary = `${cur} ${job.ai_salary_value.toLocaleString()}${unit}`;
    } else if (job.job_min_salary && job.job_max_salary) {
        const cur  = job.job_salary_currency || 'USD';
        const unit = job.job_salary_period === 'YEAR' ? '/yr' :
                     job.job_salary_period === 'HOUR' ? '/hr' : '';
        salary = `${cur} ${Number(job.job_min_salary).toLocaleString()} - ${Number(job.job_max_salary).toLocaleString()}${unit}`;
    }

    // ✅ نوع العمل — Fantastic: ai_work_arrangement | JSearch: job_is_remote
    const arrangement = job.ai_work_arrangement || '';
    const isRemote    = job.job_is_remote || false;
    let workType = 'Full-time';
    if (arrangement === 'Remote Solely' || isRemote) workType = '🌍 Remote';
    else if (arrangement === 'Remote OK')             workType = '🌐 Remote OK';
    else if (arrangement === 'Hybrid')                workType = '🏢 Hybrid';
    else if (arrangement === 'On-site')               workType = '🏙️ On-site';

    // ✅ التاريخ — Fantastic: date_posted | JSearch: job_posted_at_datetime_utc
    const date = job.date_posted ||
                 job.date_created ||
                 job.job_posted_at_datetime_utc ||
                 null;

    // ✅ الرابط — Fantastic: url | JSearch: job_apply_link
    const applyLink = job.url || job.job_apply_link || job.apply_link || '#';

    // ✅ الشعار — Fantastic: organization_logo | JSearch: employer_logo
    const logo = job.organization_logo || job.employer_logo || null;

    // ✅ المهارات — Fantastic: ai_key_skills | JSearch: job_required_skills
    const tags = normalizeTags(
        job.ai_key_skills ||
        job.ai_keywords ||
        job.job_required_skills ||
        (job.job_highlights && job.job_highlights.Qualifications) ||
        []
    );

    // ✅ المتطلبات والمسؤوليات
    const qualifications = job.ai_requirements_summary
        ? [job.ai_requirements_summary]
        : ((job.job_highlights && job.job_highlights.Qualifications) || []);

    const responsibilities = job.ai_core_responsibilities
        ? [job.ai_core_responsibilities]
        : ((job.job_highlights && job.job_highlights.Responsibilities) || []);

    // ✅ المزايا — Fantastic: ai_benefits | JSearch: job_highlights.Benefits
    const benefits = job.ai_benefits ||
                     (job.job_highlights && job.job_highlights.Benefits) ||
                     [];

    // ✅ نوع التوظيف
    let employmentType = '';
    if (Array.isArray(job.ai_employment_type)) {
        employmentType = job.ai_employment_type.join(', ');
    } else if (Array.isArray(job.job_employment_type)) {
        employmentType = job.job_employment_type.join(', ');
    } else if (typeof job.employment_type === 'string') {
        employmentType = job.employment_type;
    }

    return {
        id:               job.id || job.job_id || Math.random().toString(36).substr(2, 9),
        title:            title,
        company:          company,
        company_logo:     logo,
        location:         location,
        salary:           salary,
        date:             date,
        type:             workType,
        category:         normalizeCategory(title),
        tags:             tags,
        qualifications:   qualifications,
        responsibilities: responsibilities,
        apply_link:       applyLink,
        experience_level: job.ai_experience_level || null,
        benefits:         benefits,
        visa_sponsorship: job.ai_visa_sponsorship || false,
        employment_type:  employmentType,
        industries:       job.ai_taxonomies_a || [],
        education:        job.ai_education || [],
    };
}

// تطبيع الفئة
function normalizeCategory(value) {
    const v = (value || '').toLowerCase();
    if (v.includes('develop') || v.includes('engineer') || v.includes('software') ||
        v.includes('backend') || v.includes('frontend') || v.includes('fullstack') ||
        v.includes('full stack') || v.includes('java') || v.includes('python') ||
        v.includes('ruby') || v.includes('rails') || v.includes('php') ||
        v.includes('ios') || v.includes('android') || v.includes('mobile') ||
        v.includes('devops') || v.includes('platform') || v.includes('qa') ||
        v.includes('test') || v.includes('automation') || v.includes('cloud') ||
        v.includes('data') || v.includes('ai') || v.includes('ml')) return 'Development';
    if (v.includes('design') || v.includes('ui') || v.includes('ux') ||
        v.includes('graphic') || v.includes('creative')) return 'Design';
    if (v.includes('market') || v.includes('seo') || v.includes('growth') ||
        v.includes('content') || v.includes('social') || v.includes('brand')) return 'Marketing';
    if (v.includes('product') || v.includes('pm ') || v.includes('manager') ||
        v.includes('director') || v.includes('lead') || v.includes('head of')) return 'Product';
    return 'Other';
}

// تحويل التاغات
function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string').slice(0, 6);
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 6);
    return [];
}

// 3. لوحة الإحصائيات
function updateStatsDashboard(jobs) {
    const totalJobsEl     = document.getElementById('statTotalJobs');
    const totalCompaniesEl = document.getElementById('statTotalCompanies');
    if (totalJobsEl) totalJobsEl.innerText = jobs.length.toLocaleString() + '+';
    if (totalCompaniesEl) {
        const unique = [...new Set(jobs.map(j => j.company).filter(Boolean))];
        totalCompaniesEl.innerText = unique.length.toLocaleString() + '+';
    }
    document.title = `JobMine - ${jobs.length}+ Remote Jobs`;
}

// ترتيب بالتاريخ
function sortJobsByDate(jobs) {
    return [...jobs].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });
}

// 4. الفلترة والفرز
function filterAndRenderJobs() {
    const searchInput    = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchQuery    = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCat    = categoryFilter ? categoryFilter.value : "all";

    const filtered = allJobs.filter(job => {
        const tags = Array.isArray(job.tags) ? job.tags : [];
        const matchesSearch =
            (job.title    || '').toLowerCase().includes(searchQuery) ||
            (job.company  || '').toLowerCase().includes(searchQuery) ||
            (job.location || '').toLowerCase().includes(searchQuery) ||
            tags.some(t => t.toLowerCase().includes(searchQuery));
        const matchesCat = selectedCat === 'all' || job.category === selectedCat;
        return matchesSearch && matchesCat;
    });

    clearOldSchemas();
    const sorted   = sortJobsByDate(filtered);
    renderFeaturedSection(sorted.slice(0, 5));
    renderLatestSection(sorted.slice(5));
}

// SEO Schema
function injectJobSchema(job) {
    let desc = `Career opportunity for ${job.title} at ${job.company}. Location: ${job.location}.`;
    if (job.qualifications?.length)   desc += ` Requirements: ${job.qualifications.join(' ')}`;
    if (job.responsibilities?.length) desc += ` Responsibilities: ${job.responsibilities.join(' ')}`;

    const schema = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": job.title,
        "description": desc,
        "datePosted": job.date ? job.date.split('T')[0] : new Date().toISOString().split('T')[0],
        "validThrough": new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "employmentType": job.employment_type || "FULL_TIME",
        "hiringOrganization": {
            "@type": "Organization",
            "name": job.company || "Global Enterprise",
            "sameAs": "https://www.jobmine.site.je/"
        },
        "jobLocation": { "@type": "Place", "address": job.location },
        "jobLocationType": job.type.includes('Remote') ? "TELECOMMUTE" : undefined,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.className = 'dynamic-job-schema';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
}

function clearOldSchemas() {
    document.querySelectorAll('.dynamic-job-schema').forEach(s => s.remove());
}

// 5. عرض المميزة
function renderFeaturedSection(jobs) {
    const container  = document.getElementById('featuredJobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreFeaturedBtn');
    if (!container) return;
    container.innerHTML = '';
    if (jobs.length === 0) {
        container.innerHTML = '<div class="loading-status" style="font-size:0.9rem;color:#8b949e;text-align:center;padding:15px;width:100%;">No premium placements matching this criteria.</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }
    jobs.slice(0, displayedFeaturedCount).forEach(job => {
        container.appendChild(createJobCard(job, true));
        injectJobSchema(job);
    });
    if (loadMoreBtn) loadMoreBtn.style.display = displayedFeaturedCount >= jobs.length ? 'none' : 'block';
}

// 6. عرض الأحدث
function renderLatestSection(jobs) {
    const container  = document.getElementById('jobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreLatestBtn');
    if (!container) return;
    container.innerHTML = '';
    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="text-align:center;padding:20px;color:#8b949e;width:100%;">
                <i class="fa-solid fa-magnifying-glass" style="font-size:2rem;margin-bottom:10px;color:#ffc107;"></i>
                <p>No openings found matching your criteria.</p>
            </div>`;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }
    jobs.slice(0, displayedLatestCount).forEach(job => {
        container.appendChild(createJobCard(job, false));
        injectJobSchema(job);
    });
    if (loadMoreBtn) loadMoreBtn.style.display = displayedLatestCount >= jobs.length ? 'none' : 'block';
}

// 7. كرت الوظيفة
function createJobCard(job, isFeatured = false) {
    const card = document.createElement('div');
    card.className = `job-card ${isFeatured ? 'featured-job-style' : ''}`;
    if (isFeatured) {
        card.style.borderLeft = '4px solid #ffc107';
        card.style.backgroundColor = 'rgba(255,193,7,0.01)';
    }

    let categoryIcon = '<i class="fa-solid fa-briefcase"></i>';
    if (job.category === 'Development') categoryIcon = '<i class="fa-solid fa-code"></i>';
    if (job.category === 'Design')      categoryIcon = '<i class="fa-solid fa-paint-brush"></i>';
    if (job.category === 'Marketing')   categoryIcon = '<i class="fa-solid fa-chart-line"></i>';
    if (job.category === 'Product')     categoryIcon = '<i class="fa-solid fa-box-open"></i>';

    const tagsHTML = (job.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
    const internalJobLink = `job.html?id=${encodeURIComponent(job.id)}&url=${encodeURIComponent(job.apply_link)}`;

    let newBadgeHTML = '';
    let timeAgoText  = job.type || 'Full-time';

    if (job.date) {
        const diff = Math.floor((new Date().setHours(0,0,0,0) - new Date(job.date).setHours(0,0,0,0)) / 86400000);
        if (diff === 0) {
            timeAgoText  = 'Posted Today';
            newBadgeHTML = `<span class="new-badge" style="background:linear-gradient(135deg,#ff5722,#ff9800);color:#fff;font-size:0.72rem;font-weight:800;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;animation:pulseBadge 1.8s infinite;box-shadow:0 2px 8px rgba(255,87,34,0.4);display:inline-block;">New</span>`;
        } else if (diff === 1) {
            timeAgoText = 'Posted Yesterday';
        } else if (diff > 1) {
            timeAgoText = `Posted ${diff}d ago`;
        }
    }

    const titleLower = (job.title || '').toLowerCase();
    let experienceBadgeHTML = '';
    if (titleLower.includes('senior') || titleLower.includes('lead') ||
        titleLower.includes('principal') || titleLower.includes('staff')) {
        experienceBadgeHTML = `<span style="background:rgba(56,139,253,0.15);color:#58a6ff;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(56,139,253,0.3);">Senior</span>`;
    } else if (titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('intern')) {
        experienceBadgeHTML = `<span style="background:rgba(46,160,67,0.15);color:#56d364;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(46,160,67,0.3);">Entry Level</span>`;
    }

    let highPayBadgeHTML = '';
    if (job.salary) {
        const nums = job.salary.replace(/,/g, '').match(/\d+/g);
        if (nums && Math.max(...nums.map(Number)) >= 90000) {
            highPayBadgeHTML = `<span style="background:rgba(218,165,32,0.15);color:#f1e05a;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(218,165,32,0.3);display:inline-flex;align-items:center;gap:4px;"><i class="fa-solid fa-fire" style="color:#ff9800;"></i> High Pay</span>`;
        }
    }

    const visaBadgeHTML = job.visa_sponsorship
        ? `<span style="background:rgba(46,160,67,0.15);color:#56d364;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(46,160,67,0.3);"><i class="fa-solid fa-passport"></i> Visa OK</span>`
        : '';

    const logoHTML = job.company_logo
        ? `<img src="${job.company_logo}" alt="${job.company}" style="width:36px;height:36px;border-radius:6px;object-fit:contain;background:#fff;padding:3px;" onerror="this.style.display='none'">`
        : `<div class="job-icon-box" style="color:#ffc107;font-size:1.1rem;">${categoryIcon}</div>`;

    let highlightsHTML = '';
    if ((job.responsibilities?.length > 0) || (job.qualifications?.length > 0)) {
        highlightsHTML = `<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid rgba(255,255,255,0.05);font-size:0.82rem;color:#c9d1d9;">`;
        if (job.responsibilities?.length > 0) {
            highlightsHTML += `<div style="margin-bottom:8px;"><strong style="color:#58a6ff;font-size:0.78rem;text-transform:uppercase;"><i class="fa-solid fa-list-check"></i> What You'll Do:</strong><p style="margin:4px 0 0 0;line-height:1.5;">${job.responsibilities[0]}</p></div>`;
        }
        if (job.qualifications?.length > 0) {
            highlightsHTML += `<div><strong style="color:#ffc107;font-size:0.78rem;text-transform:uppercase;"><i class="fa-solid fa-award"></i> Requirements:</strong><p style="margin:4px 0 0 0;line-height:1.5;">${job.qualifications[0]}</p></div>`;
        }
        highlightsHTML += `</div>`;
    }

    let benefitsHTML = '';
    if (job.benefits?.length > 0) {
        const shown = job.benefits.slice(0, 3).join(' • ');
        const extra = job.benefits.length > 3 ? ` <span style="color:#58a6ff;">+${job.benefits.length - 3} more</span>` : '';
        benefitsHTML = `<div style="margin-top:8px;font-size:0.78rem;color:#8b949e;"><i class="fa-solid fa-gift" style="color:#ffc107;margin-right:4px;"></i>${shown}${extra}</div>`;
    }

    let industriesHTML = '';
    if (job.industries?.length > 0) {
        industriesHTML = `<div style="margin-top:6px;font-size:0.76rem;color:#6e7681;"><i class="fa-solid fa-building" style="margin-right:4px;"></i>${job.industries.slice(0, 3).join(' · ')}</div>`;
    }

    card.innerHTML = `
        <div class="job-details">
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">
                ${logoHTML}
                <div style="flex:1;">
                    <div class="job-title" style="font-weight:600;color:#ffffff;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        ${job.title} ${newBadgeHTML}
                    </div>
                    <div class="job-company" style="color:#8b949e;font-size:0.9rem;display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        <span>${job.company}</span>
                        ${experienceBadgeHTML}
                        ${highPayBadgeHTML}
                        ${visaBadgeHTML}
                    </div>
                </div>
            </div>
            <div class="job-meta" style="font-size:0.83rem;color:#8b949e;display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
                <span><i class="fa-solid fa-location-dot"></i> ${job.location}</span>
                <span><i class="fa-solid fa-clock"></i> ${timeAgoText}</span>
                <span><i class="fa-solid fa-wallet"></i> ${job.salary || 'Competitive'}</span>
                <span><i class="fa-solid fa-briefcase"></i> ${job.type}</span>
                ${job.experience_level ? `<span><i class="fa-solid fa-chart-bar"></i> ${job.experience_level} yrs exp</span>` : ''}
            </div>
            ${highlightsHTML}
            ${benefitsHTML}
            ${industriesHTML}
            <div class="job-tags" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
                ${tagsHTML}
            </div>
        </div>
        <div style="margin-top:15px;text-align:right;">
            <a href="${internalJobLink}" class="apply-btn" style="background-color:#ffc107;color:#0d1117;padding:8px 16px;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block;font-size:0.88rem;">
                View Details <i class="fa-solid fa-arrow-right" style="font-size:0.75rem;margin-left:4px;"></i>
            </a>
        </div>
        <style>
            @keyframes pulseBadge {
                0%   { transform:scale(1); opacity:0.9; }
                50%  { transform:scale(1.05); opacity:1; box-shadow:0 4px 12px rgba(255,87,34,0.6); }
                100% { transform:scale(1); opacity:0.9; }
            }
        </style>
    `;
    return card;
}

// 8. Pagination
function setupPaginationEvents() {
    const loadMoreLatestBtn   = document.getElementById('loadMoreLatestBtn');
    const loadMoreFeaturedBtn = document.getElementById('loadMoreFeaturedBtn');
    if (loadMoreLatestBtn) {
        loadMoreLatestBtn.addEventListener('click', () => { displayedLatestCount += 20; filterAndRenderJobs(); });
    }
    if (loadMoreFeaturedBtn) {
        loadMoreFeaturedBtn.addEventListener('click', () => { displayedFeaturedCount += 20; filterAndRenderJobs(); });
    }
}

// 9. البحث والفلترة
function setupFilterListeners() {
    const searchInput    = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const reset = () => {
        displayedLatestCount   = 20;
        displayedFeaturedCount = 20;
        filterAndRenderJobs();
    };
    if (searchInput)    searchInput.addEventListener('input', reset);
    if (categoryFilter) categoryFilter.addEventListener('change', reset);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchJobsData();
    setupFilterListeners();
    setupPaginationEvents();
});
