/* ==========================================================================
   JobMine Trends - المحرك الذكي لتحليل اتجاهات سوق العمل
   ========================================================================== */

// دالة جلب البيانات من ملف الـ JSON الأساسي للموقع
async function fetchTrendsData() {
    try {
        const response = await fetch('jobs.json');
        if (!response.ok) {
            throw new Error('Failed to fetch jobs database for analysis');
        }
        const jobs = await response.json();
        
        // تشغيل محرك التحليل وحقن النتائج في الواجهة
        analyzeAndRenderTrends(jobs);
        
    } catch (error) {
        console.error("Error analyzing JobMine database:", error);
        document.getElementById('skillsLeaderboard').innerHTML = `
            <div style="color: #ffc107; text-align:center; padding:20px;">
                <i class="fa-solid fa-triangle-exclamation"></i> عذراً، فشل تحميل منجم البيانات للتحليل.
            </div>
        `;
    }
}

// الدالة الرئيسية لمعالجة البيانات وحساب النسب
function analyzeAndRenderTrends(jobs) {
    if (!jobs || jobs.length === 0) return;

    const totalJobs = jobs.length;
    const tagCounts = {};
    const categoryCounts = { Development: 0, Design: 0, Marketing: 0, Product: 0 };

    // 1. المرور على جميع الوظائف وتفكيك البيانات
    jobs.forEach(job => {
        // حساب أعداد كل قسم
        if (categoryCounts[job.category] !== undefined) {
            categoryCounts[job.category]++;
        } else {
            // كخيار احتياطي إذا كان هناك أقسام مسمياتها مختلفة قليلاً
            if (job.category) {
                categoryCounts[job.category] = (categoryCounts[job.category] || 0) + 1;
            }
        }

        // حساب وتكرار الكلمات المفتاحية (Tags)
        const tagsArray = Array.isArray(job.tags) ? job.tags : [];
        tagsArray.forEach(tag => {
            let cleanTag = tag.trim();
            if (cleanTag.length > 1) { // تجنب الرموز أو الحروف المنفردة
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
        });
    });

    // 2. تحديث العدادات الرقمية السريعة في أعلى الصفحة
    document.getElementById('trendTotalJobs').innerText = totalJobs.toLocaleString() + '+';

    // العثور على المهارة الأكثر تكراراً (الأكثر طلباً)
    const sortedSkills = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (sortedSkills.length > 0) {
        document.getElementById('trendHotSkill').innerText = sortedSkills[0][0]; // اسم المهارة المتصدرة
    }

    // العثور على القسم الأكثر توظيفاً
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
        // ترجمة مريحة للقسم الأكثر توظيفاً ليظهر بالعربية
        let topCatName = sortedCategories[0][0];
        if (topCatName === 'Development') topCatName = 'البرمجة والتطوير';
        if (topCatName === 'Design') topCatName = 'التصميم والإبداع';
        if (topCatName === 'Marketing') topCatName = 'التسويق والمبيعات';
        if (topCatName === 'Product') topCatName = 'إدارة المنتجات';
        document.getElementById('trendTopCategory').innerText = topCatName;
    }

    // 3. بناء واجهة "قائمة المتصدرين للمهارات الساخنة" (Hot Skills Leaderboard)
    const leaderboardContainer = document.getElementById('skillsLeaderboard');
    leaderboardContainer.innerHTML = '';

    // سنأخذ أعلى 6 مهارات مطلوبة في السوق حالياً لعرضها
    const top6Skills = sortedSkills.slice(0, 6);
    const maxSkillCount = top6Skills.length > 0 ? top6Skills[0][1] : 1; // لأخذ أعلى رقم كنسبة 100% لضبط شريط التقدم

    top6Skills.forEach(([skillName, count]) => {
        const percentage = Math.round((count / maxSkillCount) * 100);
        
        const skillHTML = `
            <div class="skill-item">
                <div class="skill-info">
                    <span class="skill-name"><i class="fa-solid fa-tag" style="font-size:0.8rem; color:var(--text-muted); margin-left:5px;"></i> ${skillName}</span>
                    <span class="skill-count">${count} وظيفة نشطة</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        leaderboardContainer.innerHTML += skillHTML;
    });

    // 4. بناء واجهة "توزيع الفرص حسب المجالات" (Category Share)
    const categoryContainer = document.getElementById('categoriesShare');
    categoryContainer.innerHTML = '';

    // ترتيب الأقسام حسب الحجم
    sortedCategories.forEach(([catName, count]) => {
        const catPercentage = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
        
        // مسميات الأيقونات والأسماء بالعربية للأقسام الرئيسية الأربعة
        let arabicName = catName;
        let catIcon = 'fa-briefcase';
        let barColor = 'var(--accent-green)'; // اللون الافتراضي

        if (catName === 'Development') { arabicName = 'تطوير وبرمجة'; catIcon = 'fa-code'; barColor = '#4caf50'; }
        if (catName === 'Design') { arabicName = 'تصميم وفنون'; catIcon = 'fa-paint-brush'; barColor = '#2196f3'; }
        if (catName === 'Marketing') { arabicName = 'تسويق ومبيعات'; catIcon = 'fa-chart-line'; barColor = '#ff9800'; }
        if (catName === 'Product') { arabicName = 'إدارة منتجات'; catIcon = 'fa-box-open'; barColor = '#9c27b0'; }

        const categoryHTML = `
            <div class="skill-item">
                <div class="skill-info">
                    <span class="skill-name"><i class="fa-solid ${catIcon}" style="margin-left:5px; width:15px; color: ${barColor};"></i> ${arabicName}</span>
                    <span class="skill-count">${catPercentage}% (${count})</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${catPercentage}%; background: ${barColor};"></div>
                </div>
            </div>
        `;
        categoryContainer.innerHTML += categoryHTML;
    });
}

// تشغيل المحرك فورا عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    fetchTrendsData();
});
