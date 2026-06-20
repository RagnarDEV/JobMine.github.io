/* ==========================================================================
   JobMine - Advanced Analytics & Market Intelligence Engine (Self-Healing)
   ========================================================================== */

async function fetchTrendsData() {
    try {
        const response = await fetch('jobs.json');
        if (!response.ok) throw new Error('Failed to fetch corporate database');
        const jobs = await response.json();
        
        // تشغيل محرك التنظيف الذكي وتصحيح البيانات قبل رندرتها
        const sanitizedJobs = sanitizeAndFixJobs(jobs);
        analyzeAndRenderTrends(sanitizedJobs);
    } catch (error) {
        console.error("Analytics Error:", error);
        const leaderboard = document.getElementById('skillsLeaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = `
                <div style="color: #ffc107; text-align:center; padding:20px; font-size:0.9rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error compiling market metrics.
                </div>
            `;
        }
    }
}

/**
 * دالة الإصلاح الذاتي وتنظيف البيانات المشوهة والتصنيفات الخاطئة
 */
function sanitizeAndFixJobs(jobs) {
    if (!jobs || !Array.isArray(jobs)) return [];

    return jobs.map(job => {
        // 1. إصلاح نصوص المواقع والشركات المشوهة الناتجة عن ترميز الحروف الغريب
        if (job.location) {
            if (job.location.includes('Ø§ÙØ±ÙØ§Ø¶')) job.location = 'الرياض، المملكة العربية السعودية';
            if (job.location.includes('ÙØ¨ÙØ§Ù')) job.location = 'لبنان';
            if (job.location.includes('RepÃºblica')) job.location = 'Dominican Republic';
        }
        if (job.company) {
            job.company = job.company.replace(/â¢/g, '™').replace(/JÃ¤germeister/g, 'Jägermeister').replace(/&amp;/g, '&');
        }

        // تحضير الوسوم وتوحيد حالتها الأحرف (Lowercase) للتحليل الدقيق
        let tagsArray = Array.isArray(job.tags) ? job.tags.map(t => t.trim()) : [];
        
        // تصفية واستبعاد الوسوم العامة غير المفيدة في التحليل الإحصائي للمهارات
        const ignoredTags = ['remote', 'full time', 'non tech', 'exec', 'senior', 'junior'];
        tagsArray = tagsArray.filter(tag => !ignoredTags.includes(tag.toLowerCase()));

        // 2. محرك إعادة التصنيف الذكي (Smart Re-Categorization)
        // فحص عنوان الوظيفة والوسوم لنقل الوظيفة لقطاعها الصحيح وحل التضارب البصري
        const titleLower = job.title.toLowerCase();
        const tagsJoined = tagsArray.join(' ').toLowerCase();

        if (titleLower.includes('design') || titleLower.includes('ux') || titleLower.includes('ui') || titleLower.includes('creative') || tagsJoined.includes('design') || tagsJoined.includes('ui/ux')) {
            job.category = 'Design';
        } else if (titleLower.includes('marketing') || titleLower.includes('seo') || titleLower.includes('growth') || tagsJoined.includes('marketing') || tagsJoined.includes('seo')) {
            job.category = 'Marketing';
        } else if (titleLower.includes('product manager') || titleLower.includes('product management') || tagsJoined.includes('product manager')) {
            job.category = 'Product';
        } else if (titleLower.includes('engineer') || titleLower.includes('developer') || titleLower.includes('software') || tagsJoined.includes('dev') || tagsJoined.includes('python') || tagsJoined.includes('golang')) {
            job.category = 'Development';
        }

        // إعادة الوسوم النظيفة إلى الكائن
        job.tags = tagsArray;
        return job;
    });
}

function analyzeAndRenderTrends(jobs) {
    if (!jobs || jobs.length === 0) return;

    const totalJobs = jobs.length;
    const tagCounts = {};
    const categoryCounts = { Development: 0, Design: 0, Marketing: 0, Product: 0 };

    // حساب الإحصائيات الدقيقة بعد التنظيف
    jobs.forEach(job => {
        if (categoryCounts[job.category] !== undefined) {
            categoryCounts[job.category]++;
        }
        
        job.tags.forEach(tag => {
            if (tag.length > 1) {
                // جعل الحرف الأول كبير لإعطاء مظهر احترافي في اللوحة (مثال: Python بدلاً من python)
                let formattedTag = tag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                tagCounts[formattedTag] = (tagCounts[formattedTag] || 0) + 1;
            }
        });
    });

    const sortedSkills = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    const totalUniqueSkills = sortedSkills.length;

    // تحديث الخانات العلوية بالبيانات الدقيقة والمصححة
    const trendTotalSkillsElem = document.getElementById('trendTotalSkills');
    if (trendTotalSkillsElem) {
        trendTotalSkillsElem.innerText = totalUniqueSkills.toLocaleString() + '+';
    }

    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
        let topCatName = sortedCategories[0][0];
        if (topCatName === 'Development') topCatName = 'Engineering';
        if (topCatName === 'Design') topCatName = 'Creative & UI/UX';
        if (topCatName === 'Marketing') topCatName = 'Growth Marketing';
        if (topCatName === 'Product') topCatName = 'Product Management';
        
        const trendTopCategoryElem = document.getElementById('trendTopCategory');
        if (trendTopCategoryElem) trendTopCategoryElem.innerText = topCatName;
    }

    // بناء وحقن لوحة متصدرة المهارات (Top 6 Skills Leaderboard)
    const leaderboardContainer = document.getElementById('skillsLeaderboard');
    if (leaderboardContainer) {
        leaderboardContainer.innerHTML = '';
        const top6Skills = sortedSkills.slice(0, 6);
        const maxSkillCount = top6Skills.length > 0 ? top6Skills[0][1] : 1;

        top6Skills.forEach(([skillName, count]) => {
            const percentage = Math.round((count / maxSkillCount) * 100);
            leaderboardContainer.innerHTML += `
                <div class="skill-item">
                    <div class="skill-info">
                        <span class="skill-name"><i class="fa-solid fa-square-poll-vertical" style="font-size:0.8rem; color:#ffc107; margin-right:6px;"></i> ${skillName}</span>
                        <span class="skill-count" style="color: #ffc107; font-weight:600;">${count} Postings</span>
                    </div>
                    <div class="skill-bar-bg">
                        <div class="skill-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
    }

    // بناء وحقن نسب التوزيع على القطاعات المحدثة بدقة وبدون تضارب
    const categoryContainer = document.getElementById('categoriesShare');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';

        sortedCategories.forEach(([catName, count]) => {
            const catPercentage = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
            let displayName = catName;
            let catIcon = 'fa-briefcase';
            let barColor = '#ffc107';

            if (catName === 'Development') { displayName = 'Engineering & Dev'; catIcon = 'fa-code'; barColor = '#2f81f7'; }
            if (catName === 'Design') { displayName = 'Creative & UI/UX'; catIcon = 'fa-bezier-curve'; barColor = '#56d364'; }
            if (catName === 'Marketing') { displayName = 'Growth & Marketing'; catIcon = 'fa-bullhorn'; barColor = '#ff9800'; }
            if (catName === 'Product') { displayName = 'Product Management'; catIcon = 'fa-cubes'; barColor = '#db61a2'; }

            categoryContainer.innerHTML += `
                <div class="skill-item">
                    <div class="skill-info">
                        <span class="skill-name"><i class="fa-solid ${catIcon}" style="margin-right:6px; width:15px; color: ${barColor};"></i> ${displayName}</span>
                        <span class="skill-count" style="color:#ffffff;">${catPercentage}% <span style="color:#8b949e; font-size:0.8rem;">(${count})</span></span>
                    </div>
                    <div class="skill-bar-bg">
                        <div class="skill-bar-fill" style="width: ${catPercentage}%; background-color: ${barColor};"></div>
                    </div>
                </div>
            `;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchTrendsData();
});
