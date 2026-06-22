import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' || req.method === 'POST') {
    // نمنع كاش المتصفح العادي لأننا سنعتمد على كاش KV المضمون والأحدث دائماً
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

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

    // مفتاح فريد لحفظ هذه الصفحة بالتحديد داخل Vercel KV
    const cacheKey = `cache:${path}`;

    try {
      // 1. محاولة جلب البيانات من كاش Vercel KV أولاً
      const cachedData = await kv.get(cacheKey);

      if (cachedData) {
        // 🔥 إذا كانت البيانات موجودة في KV (Cache Hit) نعيدها فوراً ونوفر طلب GitHub
        return res.status(200).json(cachedData);
      }

      // 2. إذا لم تكن موجودة (Cache Miss)، نذهب لـ GitHub
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

        // 3. تخزين البيانات في Vercel KV مع تحديد وقت انتهاء (مثلاً 600 ثانية = 10 دقائق)
        // هذا يعني أننا لن نكلم جيت هب لهذه الصفحة مجدداً إلا بعد 10 دقائق
        await kv.set(cacheKey, parsedData, { ex: 600 });

        return res.status(200).json(parsedData);
      } else {
        return res.status(200).json([]);
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: "فشل الاتصال بقاعدة البيانات", details: err.message });
    }
  }
  return res.status(405).json({ success: false, error: 'طريقة الطلب غير مدعومة' });
}
