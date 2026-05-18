export default async function handler(req, res) {
  // 1. تفعيل الـ CORS لتأمين استقبال طلبات هاتف الأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 🎯 طوق النجاة الأول: منع فيرسل والمتصفح والأندرويد من كاش البيانات نهائياً
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET' || req.method === 'POST') {
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    const module_name = searchParams.get('module_name') || req.query?.module_name;
    const record_id = searchParams.get('record_id') || req.query?.record_id;

    // إذا تم فتح الرابط في المتصفح بدون متغيرات (مثل صورتك الأخيرة)
    if (!module_name || !record_id) {
      return res.status(200).json({ 
        status: "online", 
        message: "محرك نواة السحابي يعمل بكفاءة ومستعد لسحب البيانات الحية 🚀" 
      });
    }

    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;
    const tenant = 'nawah-core';

    const path = `database/${tenant}/${module_name}/${record_id}.json`;
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // 🎯 طوق النجاة الثاني: إجبار الـ fetch على جلب البيانات حية من جيت هب وتخطي كاش السيرفر
      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store', // منع كاش الـ fetch نفسه
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 200) {
        const fileData = await response.json();
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        // تحويل النص المشفر الصافي إلى مصفوفة جافا سكريبت حقيقية
        const parsedData = JSON.parse(decodedContent);
        
        // إرجاع المصفوفة الخام الصافية كما كانت تخرج من جيت هب مباشرة
        return res.status(200).json(parsedData);
      } else {
        return res.status(200).json([]);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      return res.status(200).json([]); // إرجاع مصفوفة فارغة لحماية الواجهة من الانهيار
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
