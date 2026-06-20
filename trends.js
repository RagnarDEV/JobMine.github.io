async function fetchTrendsData() {
    try {
        const response = await fetch('jobs.json');
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const jobs = await response.json();
        analyzeAndRenderTrends(jobs);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('skillsLeaderboard').innerHTML = `
            <div style="color: #ffc107; text-align:center; padding:20px;">
                <i class="fa-solid fa-triangle-exclamation"></i> Error loading metrics.
            </div>
        `;
    }
}

function analyzeAndRenderTrends(jobs) {
    if (!jobs || jobs.length === 0) return;

    const totalJobs = jobs.length;
    const tagCounts = {};
    const categoryCounts = { Development: 0, Design: 0, Marketing: 0, Product: 0 };

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

    document.getElementById('trendTotalJobs').innerText = totalJobs.toLocaleString() + '+';

    const sortedSkills = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (sortedSkills.length > 0) {
        document.getElementById('trendHotSkill').innerText = sortedSkills[0][0];
    }

    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
        let topCatName = sortedCategories[0][0];
        if (topCatName === 'Development') topCatName = 'Development';
        if (topCatName === 'Design') topCatName = 'Design & UI/UX';
        if (topCatName === 'Marketing') topCatName = 'Marketing';
        if (topCatName === 'Product') topCatName = 'Product Management';
        document.getElementById('trendTopCategory').innerText = topCatName;
    }

    const leaderboardContainer = document.getElementById('skillsLeaderboard');
    leaderboardContainer.innerHTML = '';
    const top6Skills = sortedSkills.slice(0, 6);
    const maxSkillCount = top6Skills.length > 0 ? top6Skills[0][1] : 1;

    top6Skills.forEach(([skillName, count]) => {
        const percentage = Math.round((count / maxSkillCount) * 100);
        leaderboardContainer.innerHTML += `
            <div class="skill-item">
                <div class="skill-info">
                    <span class="skill-name"><i class="fa-solid fa-tag" style="font-size:0.8rem; color:#8b949e; margin-right:5px;"></i> ${skillName}</span>
                    <span class="skill-count">${count} Active Jobs</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });

    const categoryContainer = document.getElementById('categoriesShare');
    categoryContainer.innerHTML = '';

    sortedCategories.forEach(([catName, count]) => {
        const catPercentage = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
        let displayName = catName;
        let catIcon = 'fa-briefcase';
        let barColor = '#4caf50';

        if (catName === 'Development') { displayName = 'Development'; catIcon = 'fa-code'; barColor = '#4caf50'; }
        if (catName === 'Design') { displayName = 'Design & UI/UX'; catIcon = 'fa-paint-brush'; barColor = '#2196f3'; }
        if (catName === 'Marketing') { displayName = 'Marketing & Growth'; catIcon = 'fa-chart-line'; barColor = '#ff9800'; }
        if (catName === 'Product') { displayName = 'Product Management'; catIcon = 'fa-box-open'; barColor = '#9c27b0'; }

        categoryContainer.innerHTML += `
            <div class="skill-item">
                <div class="skill-info">
                    <span class="skill-name"><i class="fa-solid ${catIcon}" style="margin-right:5px; width:15px; color: ${barColor};"></i> ${displayName}</span>
                    <span class="skill-count">${catPercentage}% (${count})</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${catPercentage}%; background: ${barColor};"></div>
                </div>
            </div>
        `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchTrendsData();
});
