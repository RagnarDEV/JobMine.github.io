/* ==========================================================================
   JobMine - Advanced Analytics & Market Intelligence Engine
   ========================================================================== */

async function fetchTrendsData() {
    try {
        const response = await fetch('jobs.json');
        if (!response.ok) throw new Error('Failed to fetch corporate database');
        const jobs = await response.json();
        analyzeAndRenderTrends(jobs);
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

function analyzeAndRenderTrends(jobs) {
    if (!jobs || jobs.length === 0) return;

    const totalJobs = jobs.length;
    const tagCounts = {};
    const categoryCounts = { Development: 0, Design: 0, Marketing: 0, Product: 0 };

    // تحليل قطاعات العمل والتقنيات المطلوبة ديناميكياً
    jobs.forEach(job => {
        if (categoryCounts[job.category] !== undefined) {
            categoryCounts[job.category]++;
        }
        const tagsArray = Array.isArray(job.tags) ? job.tags : [];
        tagsArray.forEach(tag => {
            let cleanTag = tag.trim();
            if (cleanTag.length > 1) {
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
        });
    });

    const sortedSkills = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    const totalUniqueSkills = sortedSkills.length;

    // 1. تحديث لوحة الإحصائيات العلوية (المعرفات الجديدة)
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

    // 2. بناء وحقن لوحة متصدرة المهارات (Skills Leaderboard)
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

    // 3. بناء وحقن نسب التوزيع على القطاعات (Sector Distribution)
    const categoryContainer = document.getElementById('categoriesShare');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';

        sortedCategories.forEach(([catName, count]) => {
            const catPercentage = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
            let displayName = catName;
            let catIcon = 'fa-briefcase';
            let barColor = '#ffc107'; // الحفاظ على توحيد النمط الفخم الذهبي مع تدرجات ذكية

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
