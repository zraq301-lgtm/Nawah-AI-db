export default async function handler(req, res) {
  // تفعيل الـ CORS بشكل كامل لفتح الأبواب لتطبيق Maamoul
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET' || req.method === 'POST') {
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    const module_name = searchParams.get('module_name') || req.query?.module_name || req.body?.module_name;
    const record_id = searchParams.get('record_id') || req.query?.record_id || req.body?.record_id;

    if (!module_name || !record_id) {
      return res.status(200).json({ 
        status: "online", 
        message: "محرك نـواة السحابي يعمل بكفاءة ومستعد لسحب البيانات 🚀" 
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
        
        // 🎯 الحسم هنا: نقوم بتحويل النص إلى كائن جافا سكريبت حقيقي قبل إرساله بـ json() ليفهمه موديول الأندرويد فوراً
        const parsedData = JSON.parse(decodedContent);
        
        return res.status(200).json(parsedData);
      } else {
        // إذا كان الملف غير موجود بعد، نرسل مصفوفة فارغة آمنة
        return res.status(200).json([]);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      return res.status(200).json([]); // نرسل مصفوفة فارغة حتى في الخطأ لمنع كراش الواجهة
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
