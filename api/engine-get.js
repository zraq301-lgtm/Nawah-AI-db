// 🚀 كاش داخل ذاكرة السيرفر اللحظية لفيرسل (مجاني وبدون مكتبات)
let localMemoryCache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' || req.method === 'POST') {
    
    // 1️⃣ خط الدفاع الأول: كاش شبكة فيرسل (CDN) تم ضبطه على 30 ثانية للتطوير
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=5');
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    let pageName = searchParams.get('page') || req.query?.page || req.body?.page;

    if (!pageName) {
      const module_name = searchParams.get('module_name') || req.query?.module_name || req.body?.module_name || req.body?.section;
      const record_id = searchParams.get('record_id') || req.query?.record_id || req.body?.record_id;
      pageName = (module_name && record_id) ? `${module_name}/${record_id}` : (module_name || 'بيانات_عامة');
    }

    let targetPageName = pageName.replace(/['"]/g, '').trim();
    let path = targetPageName.endsWith('.json') || targetPageName.includes('/') ? targetPageName : `raqqa_sections/${targetPageName}.json`;

    const cacheKey = `cache:${path}`;
    const now = Date.now();

    // 2️⃣ خط الدفاع الثاني: كاش ذاكرة الرام اللحظية (Memory Cache) تم ضبطه أيضاً على 30 ثانية
    // (30 * 1000 مللي ثانية)
    if (localMemoryCache[cacheKey] && (now - localMemoryCache[cacheKey].timestamp < 30 * 1000)) {
      return res.status(200).json(localMemoryCache[cacheKey].data);
    }

    try {
      const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
      const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
      const token = process.env.NAWAH_GITHUB_TOKEN;

      const encodedPath = encodeURIComponent(path);
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 200) {
        const fileData = await response.json();
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const parsedData = JSON.parse(decodedContent);

        // حفظ النسخة في ذاكرة الرام المؤقتة مع التوقيت الحالي
        localMemoryCache[cacheKey] = {
          data: parsedData,
          timestamp: now
        };

        return res.status(200).json(parsedData);
      } else {
        return res.status(200).json([]);
      }

    } catch (err) {
      if (localMemoryCache[cacheKey]) {
        return res.status(200).json(localMemoryCache[cacheKey].data);
      }
      return res.status(500).json({ success: false, error: "فشل الاتصال بقاعدة البيانات", details: err.message });
    }
  }
  return res.status(405).json({ success: false, error: 'طريقة الطلب غير مدعومة' });
}
