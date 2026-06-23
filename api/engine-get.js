// 🚀 كاش الرام المستمر لتطبيق استراتيجية السرعة القصوى
let localMemoryCache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' || req.method === 'POST') {
    
    // 1️⃣ السحر الأول: نأمر شبكة فيرسل بحفظ الكاش لمدة 30 ثانية، 
    // وإذا انتهت، اعطِ المستخدم النسخة القديمة فوراً (0ms) وحدّثها خلف الكواليس خلال 10 ثوانٍ
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=10');
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

    // 2️⃣ السحر الثاني (في ذاكرة السيرفر): 
    // إذا كانت البيانات موجودة في الرام، أرسلها فوراً للمستخدم (سرعة صفر!)
    // ثم اذهب لتحديثها من جيت هب في الخلفية دون جعل المستخدم ينتظر
    if (localMemoryCache[cacheKey]) {
      const cachedTime = localMemoryCache[cacheKey].timestamp;
      const now = Date.now();

      // إذا مر أكثر من 30 ثانية على الكاش، نقوم بتحديثه "خلف الكواليس"
      if (now - cachedTime > 30 * 1000) {
        // تشغيل دالة جلب البيانات في الخلفية (Background Fetch) بدون await
        fetchAndUpdateGitHubData(path, cacheKey);
      }

      // العميل يأخذ النتيجة فوراً بـ 0ms ويمضي، بينما السيرفر يحدّث نفسه بهدوء
      return res.status(200).json(localMemoryCache[cacheKey].data);
    }

    // 3️⃣ هذه الحالة تحدث فقط "مرة واحدة تاريخياً" عندما يشتغل السيرفر لأول مرة تماماً ولا يوجد أي كاش
    try {
      const parsedData = await fetchFromGitHub(path);
      
      localMemoryCache[cacheKey] = {
        data: parsedData,
        timestamp: Date.now()
      };

      return res.status(200).json(parsedData);
    } catch (err) {
      return res.status(500).json({ success: false, error: "فشل تحميل البيانات الأولية", details: err.message });
    }
  }
  return res.status(405).json({ success: false, error: 'طريقة الطلب غير مدعومة' });
}

// 🛠️ دالة مساعدة لجلب البيانات من جيت هب بشكل متزامن (تُستخدم لأول مرة فقط)
async function fetchFromGitHub(path) {
  const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
  const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
  const token = process.env.NAWAH_GITHUB_TOKEN;
  const encodedPath = encodeURIComponent(path);
  const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

  const response = await fetch(githubUrl, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });

  if (response.status === 200) {
    const fileData = await response.json();
    const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    return JSON.parse(decodedContent);
  }
  return [];
}

// 🛠️ دالة الخلفية السحرية: تحدّث الرام بهدوء دون تعطيل المستخدم
async function fetchAndUpdateGitHubData(path, cacheKey) {
  try {
    const freshData = await fetchFromGitHub(path);
    localMemoryCache[cacheKey] = {
      data: freshData,
      timestamp: Date.now()
    };
    console.log(`⚡ Background Cache Updated for: ${path}`);
  } catch (e) {
    console.error("Background fetch failed", e.message);
  }
}
