/* ==========================================================================
   JobMine - Core Application Logic (Premium SEO & Dynamic Schema Ecosystem)
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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

// 2. تطبيع البيانات لتتوافق مع بنية الـ API الحقيقية
function normalizeJob(job) {
    // استخراج الموقع
    let location = 'Remote Worldwide';
    if (job.locations_derived && job.locations_derived.length > 0) {
        location = job.locations_derived[0];
    } else if (job.ai_work_arrangement === 'Remote Solely' || job.location_type === 'TELECOMMUTE') {
        location = 'Remote Worldwide';
    }

    // بناء نص الراتب
    let salary = null;
    if (job.ai_salary_min_value && job.ai_salary_max_value) {
        const currency = job.ai_salary_currency || 'USD';
        const unit = job.ai_salary_unit_text === 'YEAR' ? '/yr' :
                     job.ai_salary_unit_text === 'HOUR' ? '/hr' :
                     job.ai_salary_unit_text === 'MONTH' ? '/mo' : '';
        salary = `${currency} ${job.ai_salary_min_value.toLocaleString()} - ${job.ai_salary_max_value.toLocaleString()}${unit}`;
    } else if (job.ai_salary_value) {
        const currency = job.ai_salary_currency || 'USD';
        const unit = job.ai_salary_unit_text === 'HOUR' ? '/hr' :
                     job.ai_salary_unit_text === 'YEAR' ? '/yr' : '';
        salary = `${currency} ${job.ai_salary_value.toLocaleString()}${unit}`;
    }

    // نوع ترتيب العمل
    const arrangement = job.ai_work_arrangement || '';
    let workType = 'Full-time';
    if (arrangement === 'Remote Solely') workType = '🌍 Remote';
    else if (arrangement === 'Remote OK') workType = '🌐 Remote OK';
    else if (arrangement === 'Hybrid') workType = '🏢 Hybrid';
    else if (arrangement === 'On-site') workType = '🏙️ On-site';

    return {
        id: job.id || Math.random().toString(36).substr(2, 9),
        title: job.title || 'Unknown Position',
        company: job.organization || 'Unknown Company',
        company_logo: job.organization_logo || null,
        location: location,
        salary: salary,
        date: job.date_posted || job.date_created || null,
        type: workType,
        category: normalizeCategory(job.title || ''),
        tags: normalizeTags(job.ai_key_skills || job.ai_keywords || []),
        qualifications: job.ai_requirements_summary ? [job.ai_requirements_summary] : [],
        responsibilities: job.ai_core_responsibilities ? [job.ai_core_responsibilities] : [],
        apply_link: job.url || '#',
        experience_level: job.ai_experience_level || null,
        benefits: job.ai_benefits || [],
        visa_sponsorship: job.ai_visa_sponsorship || false,
        employment_type: Array.isArray(job.ai_employment_type) 
            ? job.ai_employment_type.join(', ') 
            : (job.employment_type || ''),
        industries: job.ai_taxonomies_a || [],
        education: job.ai_education || [],
    };
}

// تطبيع الفئة بناءً على عنوان الوظيفة
function normalizeCategory(value) {
    const v = value.toLowerCase();
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

// تحويل التاغات إلى array نظيفة
function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string').slice(0, 6);
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 6);
    return [];
}

// 3. تحديث لوحة الإحصائيات
function updateStatsDashboard(jobs) {
    const totalJobsElement = document.getElementById('statTotalJobs');
    const totalCompaniesElement = document.getElementById('statTotalCompanies');
    
    if (totalJobsElement) totalJobsElement.innerText = jobs.length.toLocaleString() + '+';
    
    if (totalCompaniesElement) {
        const uniqueCompanies = [...new Set(jobs.map(job => job.company).filter(Boolean))];
        totalCompaniesElement.innerText = uniqueCompanies.length.toLocaleString() + '+';
    }
}

// ترتيب بالتاريخ (الأحدث أولاً)
function sortJobsByDate(jobs) {
    return [...jobs].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });
}

// 4. محرك الفلترة والفرز
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
            (job.location || '').toLowerCase().includes(searchQuery) ||
            tagsArray.some(tag => tag.toLowerCase().includes(searchQuery));
                              
        const matchesCategory = selectedCategory === 'all' || job.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    clearOldSchemas();

    const sortedList = sortJobsByDate(filteredList);

    const featuredJobs = sortedList.slice(0, 5); 
    const latestJobs = sortedList.slice(5); 

    renderFeaturedSection(featuredJobs);
    renderLatestSection(latestJobs);
}

// محرك SEO Schema
function injectJobSchema(job) {
    let descriptionText = `Career opportunity for ${job.title} at ${job.company}. Location: ${job.location}.`;
    if (job.qualifications && job.qualifications.length > 0) {
        descriptionText += ` Requirements: ${job.qualifications.join(' ')}`;
    }
    if (job.responsibilities && job.responsibilities.length > 0) {
        descriptionText += ` Responsibilities: ${job.responsibilities.join(' ')}`;
    }

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": job.title,
        "description": descriptionText,
        "datePosted": job.date ? job.date.split('T')[0] : new Date().toISOString().split('T')[0],
        "validThrough": new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "employmentType": job.employment_type || "FULL_TIME",
        "hiringOrganization": {
            "@type": "Organization",
            "name": job.company || "Global Enterprise",
            "sameAs": "https://www.jobmine.site.je/"
        },
        "jobLocation": {
            "@type": "Place",
            "address": job.location
        },
        "jobLocationType": job.type.includes('Remote') ? "TELECOMMUTE" : undefined,
    };

    if (job.salary) {
        schemaData["baseSalary"] = {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": {
                "@type": "QuantitativeValue",
                "unitText": "MONTH"
            }
        };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.className = 'dynamic-job-schema';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
}

function clearOldSchemas() {
    document.querySelectorAll('.dynamic-job-schema').forEach(s => s.remove());
}

// 5. عرض الوظائف المميزة
function renderFeaturedSection(jobs) {
    const container = document.getElementById('featuredJobsContainer');
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

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (displayedFeaturedCount >= jobs.length) ? 'none' : 'block';
    }
}

// 6. عرض أحدث الوظائف
function renderLatestSection(jobs) {
    const container = document.getElementById('jobsContainer');
    const loadMoreBtn = document.getElementById('loadMoreLatestBtn');
    if (!container) return;

    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="text-align:center;padding:20px;color:#8b949e;width:100%;">
                <i class="fa-solid fa-magnifying-glass" style="font-size:2rem;margin-bottom:10px;color:#ffc107;"></i>
                <p>No openings found matching your criteria.</p>
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

// 7. بناء كرت الوظيفة الكامل
function createJobCard(job, isFeatured = false) {
    const card = document.createElement('div');
    card.className = `job-card ${isFeatured ? 'featured-job-style' : ''}`;
    if (isFeatured) {
        card.style.borderLeft = '4px solid #ffc107';
        card.style.backgroundColor = 'rgba(255, 193, 7, 0.01)';
    }

    // أيقونة الفئة
    let categoryIcon = '<i class="fa-solid fa-briefcase"></i>';
    if (job.category === 'Development') categoryIcon = '<i class="fa-solid fa-code"></i>';
    if (job.category === 'Design') categoryIcon = '<i class="fa-solid fa-paint-brush"></i>';
    if (job.category === 'Marketing') categoryIcon = '<i class="fa-solid fa-chart-line"></i>';
    if (job.category === 'Product') categoryIcon = '<i class="fa-solid fa-box-open"></i>';

    // التاغات
    const tagsHTML = job.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    // رابط الوظيفة
    const targetId = encodeURIComponent(job.id);
    const internalJobLink = `job.html?id=${targetId}&url=${encodeURIComponent(job.apply_link)}`;

    // شارة "New"
    let newBadgeHTML = '';
    let timeAgoText = job.type || 'Full-time';

    if (job.date) {
        const jobDateObj = new Date(job.date);
        const todayObj = new Date();
        jobDateObj.setHours(0, 0, 0, 0);
        todayObj.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((todayObj - jobDateObj) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            timeAgoText = 'Posted Today';
            newBadgeHTML = `<span class="new-badge" style="background:linear-gradient(135deg,#ff5722,#ff9800);color:#fff;font-size:0.72rem;font-weight:800;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;animation:pulseBadge 1.8s infinite;box-shadow:0 2px 8px rgba(255,87,34,0.4);display:inline-block;">New</span>`;
        } else if (diffDays === 1) {
            timeAgoText = 'Posted Yesterday';
        } else if (diffDays > 1) {
            timeAgoText = `Posted ${diffDays}d ago`;
        }
    }

    // شارة مستوى الخبرة
    let experienceBadgeHTML = '';
    const titleLower = (job.title || '').toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('lead') || 
        titleLower.includes('principal') || titleLower.includes('staff') ||
        (job.experience_level && job.experience_level === '10+')) {
        experienceBadgeHTML = `<span style="background:rgba(56,139,253,0.15);color:#58a6ff;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(56,139,253,0.3);">Senior</span>`;
    } else if (titleLower.includes('junior') || titleLower.includes('entry') || titleLower.includes('intern') ||
               (job.experience_level && job.experience_level === '0-2')) {
        experienceBadgeHTML = `<span style="background:rgba(46,160,67,0.15);color:#56d364;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(46,160,67,0.3);">Entry Level</span>`;
    }

    // شارة الراتب المرتفع
    let highPayBadgeHTML = '';
    if (job.salary) {
        const numbers = job.salary.replace(/,/g, '').match(/\d+/g);
        if (numbers) {
            const maxNum = Math.max(...numbers.map(Number));
            if (maxNum >= 90000) {
                highPayBadgeHTML = `<span style="background:rgba(218,165,32,0.15);color:#f1e05a;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(218,165,32,0.3);display:inline-flex;align-items:center;gap:4px;"><i class="fa-solid fa-fire" style="color:#ff9800;"></i> High Pay</span>`;
            }
        }
    }

    // شارة Visa Sponsorship
    const visaBadgeHTML = job.visa_sponsorship 
        ? `<span style="background:rgba(46,160,67,0.15);color:#56d364;font-size:0.75rem;padding:2px 6px;border-radius:4px;font-weight:600;border:1px solid rgba(46,160,67,0.3);"><i class="fa-solid fa-passport"></i> Visa OK</span>`
        : '';

    // شعار الشركة
    const logoHTML = job.company_logo 
        ? `<img src="${job.company_logo}" alt="${job.company}" style="width:36px;height:36px;border-radius:6px;object-fit:contain;background:#fff;padding:3px;" onerror="this.style.display='none'">`
        : `<div class="job-icon-box" style="color:#ffc107;font-size:1.1rem;">${categoryIcon}</div>`;

    // قسم المتطلبات والمسؤوليات
    let highlightsHTML = '';
    if ((job.qualifications && job.qualifications.length > 0) || 
        (job.responsibilities && job.responsibilities.length > 0)) {
        highlightsHTML = `<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid rgba(255,255,255,0.05);font-size:0.82rem;color:#c9d1d9;">`;
        
        if (job.responsibilities && job.responsibilities.length > 0) {
            highlightsHTML += `
                <div style="margin-bottom:8px;">
                    <strong style="color:#58a6ff;font-size:0.78rem;text-transform:uppercase;">
                        <i class="fa-solid fa-list-check"></i> What You'll Do:
                    </strong>
                    <p style="margin:4px 0 0 0;line-height:1.5;">${job.responsibilities[0]}</p>
                </div>`;
        }

        if (job.qualifications && job.qualifications.length > 0) {
            highlightsHTML += `
                <div>
                    <strong style="color:#ffc107;font-size:0.78rem;text-transform:uppercase;">
                        <i class="fa-solid fa-award"></i> Requirements:
                    </strong>
                    <p style="margin:4px 0 0 0;line-height:1.5;">${job.qualifications[0]}</p>
                </div>`;
        }

        highlightsHTML += `</div>`;
    }

    // قسم المزايا
    let benefitsHTML = '';
    if (job.benefits && job.benefits.length > 0) {
        const shown = job.benefits.slice(0, 3).join(' • ');
        const extra = job.benefits.length > 3 
            ? ` <span style="color:#58a6ff;">+${job.benefits.length - 3} more</span>` 
            : '';
        benefitsHTML = `
            <div style="margin-top:8px;font-size:0.78rem;color:#8b949e;">
                <i class="fa-solid fa-gift" style="color:#ffc107;margin-right:4px;"></i>${shown}${extra}
            </div>`;
    }

    // قسم الصناعات
    let industriesHTML = '';
    if (job.industries && job.industries.length > 0) {
        industriesHTML = `
            <div style="margin-top:6px;font-size:0.76rem;color:#6e7681;">
                <i class="fa-solid fa-building" style="margin-right:4px;"></i>${job.industries.slice(0, 3).join(' · ')}
            </div>`;
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
                0% { transform:scale(1); opacity:0.9; }
                50% { transform:scale(1.05); opacity:1; box-shadow:0 4px 12px rgba(255,87,34,0.6); }
                100% { transform:scale(1); opacity:0.9; }
            }
        </style>
    `;
    return card;
}

// 8. Pagination
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

// 9. أحداث البحث والفلترة
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
