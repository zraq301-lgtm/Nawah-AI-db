export default async function handler(req, res) {
  // 1. تفعيل الـ CORS بشكل كامل لفتح الأبواب لتطبيق Maamoul
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. استقبال طلب الـ GET المباشر الصريح من الواجهة
  if (req.method === 'GET' || req.method === 'POST') {
    
    // 💡 تفكيك الرابط يدوياً لضمان صيد المتغيرات حتى لو غلفها الأندرويد بطريقة معقدة
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    const module_name = searchParams.get('module_name') || req.query?.module_name;
    const record_id = searchParams.get('record_id') || req.query?.record_id;

    // فحص الفتح التجريبي (مثل فتح الرابط في المتصفح بدون موديول)
    if (!module_name || !record_id) {
      return res.status(200).json({ 
        status: "online", 
        message: "محرك الجلب السحابي المباشر داخل قاعدة البيانات يعمل ومستعد لاستقبال طلبات التطبيق 🚀" 
      });
    }

    // إعدادات مستودع جيت هب الخاص بك
    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;
    const tenant = 'nawah-core';

    const path = `database/${tenant}/${module_name}/${record_id}.json`;
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // مؤقت أمان يقتل الطلب بعد 10 ثوانٍ لو علق جيت هب لكي لا تظهر العلامة الصفراء في السجلات
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 200) {
        const fileData = await response.json();
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return res.status(200).json(JSON.parse(decodedContent));
      } else {
        // حماية الواجهة: إذا لم يجد الملف (404) يرسل مصفوفة فارغة فوراً ويقفل الاتصال بنجاح
        return res.status(200).json([]);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      return res.status(500).json({ error: 'فشل السحب السريع من السحابة', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
