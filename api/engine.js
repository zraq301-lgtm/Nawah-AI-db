export default async function handler(req, res) {
  // 1. تفعيل الـ CORS لحل أي حظر وتدمير الكاش نهائياً لضمان بيانات حية
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // إعدادات مستودع GitHub المشتركة بين الجلب والحفظ
  const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
  const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
  const token = process.env.NAWAH_GITHUB_TOKEN;

  // 📥 أولاً: محرك الجلب والسحب الذكي المستقر (GET)
  if (req.method === 'GET') {
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    // الهيكلية الجديدة المباشرة: موديول المخزن الافتراضي عند فتح الرابط بالمتصفح
    const module_name = searchParams.get('module_name') || req.query?.module_name || 'inventory_module';
    const record_id = searchParams.get('record_id') || req.query?.record_id || 'stock_records';

    const path = `${module_name}/${record_id}.json`;
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      if (response.status === 200) {
        const fileData = await response.json();
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return res.status(200).json(JSON.parse(decodedContent));
      } else {
        return res.status(200).json([]);
      }
    } catch (err) {
      return res.status(200).json({ error: 'خطأ أثناء جلب البيانات السحابية', details: err.message });
    }
  }

  // 📤 ثانياً: محرك الرفع والتحديث والحفظ المطور (POST) بنفس الهيكلية الجديدة
  if (req.method === 'POST') {
    try {
      // استقبال البيانات القادمة من الواجهة (تطبيق الأندرويد Maamoul)
      const { module_name, record_id, jsondata } = req.body;

      if (!module_name || !record_id || !jsondata) {
        return res.status(400).json({ success: false, error: 'البيانات المرسلة غير مكتملة' });
      }

      // ضبط المسار ليكون متطابقاً 100% مع مسار الجلب الجديد
      const path = `${module_name}/${record_id}.json`;
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      // 1. خطوة ذكية: فحص هل الملف موجود مسبقاً للحصول على الـ sha (مطلوب للتحديث في GitHub)
      let sha = null;
      try {
        const checkRes = await fetch(githubUrl, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        });
        if (checkRes.status === 200) {
          const checkData = await checkRes.json();
          sha = checkData.sha; // جلب المعرف الخاص بالملف الحالي للتعديل عليه
        }
      } catch (e) {
        console.log("ملف جديد سيتم إنشاؤه لأول مرة");
      }

      // 2. تحويل مصفوفة الـ ERP المرسلة إلى نص وتشفيرها بصيغة Base64 المطلوبة في GitHub API
      const contentString = JSON.stringify(jsondata, null, 2);
      const base64Content = Buffer.from(contentString, 'utf-8').toString('base64');

      // 3. إعداد جسم الطلب لـ GitHub
      const putBody = {
        message: `🤖 Maamoul ERP Auto-Sync: Updated ${module_name}/${record_id}`,
        content: base64Content
      };
      if (sha) putBody.sha = sha; // إرفاق الـ sha فقط إذا كان الملف موجوداً مسبقاً (عملية تحديث وليس إنشاء أول مرة)

      // 4. تنفيذ عملية الحفظ الفعلي داخل المستودع
      const saveResponse = await fetch(githubUrl, {
        method: 'PUT', // جيت هب يستخدم PUT للإنشاء والتحديث
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (saveResponse.status === 200 || saveResponse.status === 201) {
        return res.status(200).json({ success: true, message: 'تم حفظ وتأمين مصفوفة البيانات سحابياً بنجاح 🔐' });
      } else {
        const errorData = await saveResponse.json();
        return res.status(saveResponse.status).json({ success: false, error: 'فشل الحفظ في مستودع GitHub', details: errorData });
      }

    } catch (err) {
      return res.status(500).json({ success: false, error: 'خطأ داخلي في خادم الحفظ السحابي', details: err.message });
    }
  }

  // في حال تم استخدام Method غير GET أو POST
  return res.status(405).json({ error: 'Method not allowed' });
}
