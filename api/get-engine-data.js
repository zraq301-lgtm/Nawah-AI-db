export default async function handler(req, res) {
  // تفعيل الـ CORS لتطبيق الـ Maamoul على الأندرويد
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // إنهاء طلبات OPTIONS فوراً لمنع التعليق
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { module_name, record_id } = req.body;

    // حماية: إنهاء الطلب فوراً إذا كانت البيانات ناقصة
    if (!module_name || !record_id) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;
    const tenant = 'nawah-core';

    const path = `database/${tenant}/${module_name}/${record_id}.json`;
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 💡 طوق النجاة: كسر الاتصال تلقائياً بعد 10 ثوانٍ لمنع الـ Timeout (300s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); 

    try {
      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal // ربط الـ fetch بمؤقت الإلغاء
      });

      // تنظيف المؤقت فوراً بمجرد وصول الرد
      clearTimeout(timeoutId);

      if (response.status === 200) {
        const fileData = await response.json();
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return res.status(200).json(JSON.parse(decodedContent));
      } else {
        // إذا كان الملف غير موجود (404) نغلق الطلب بمصفوفة فارغة منعاً لكراش الواجهة
        return res.status(200).json([]);
      }
    } catch (err) {
      clearTimeout(timeoutId); // تنظيف احتياطي عند حدوث الخطأ
      return res.status(500).json({ 
        error: 'انتهت مهلة الطلب أو حدث خطأ في الاتصال بجيت هب', 
        details: err.message 
      });
    }
  }

  // 💡 حماية نهائية: إذا جاء أي طلب آخر غير الـ POST لا يترك السيرفر معلقاً
  return res.status(405).json({ error: 'Method not allowed' });
}
