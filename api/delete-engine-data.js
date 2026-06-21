export default async function handler(req, res) {
  // 1. تفعيل الـ CORS ومنع الكاش لضمان الفورية
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // إعدادات مستودع GitHub
  const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
  const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
  const token = process.env.NAWAH_GITHUB_TOKEN;

  if (req.method === 'POST') {
    try {
      // استقبال اسم القسم والمعرف (والذي قد يكون الـ id أو الـ lastUpdated أو رابط الفيديو)
      const module_name = req.body?.page || req.body?.module_name;
      const target_id = req.body?.id || req.body?.record_id; // القيمة المراد حذفها من الواجهة

      if (!module_name || !target_id) {
        return res.status(400).json({ success: false, error: 'برجاء تحديد اسم القسم (page) والعنصر المراد حذفه' });
      }

      // تحديد مسار ملف القسم الفعلي داخل مستودع جيت هب (مثال: مملكة الاسترخاء.json أو ملاذ الأمومة.json)
      // تأكدي من توافق الامتداد والصيغة مع ملف الحفظ لديكِ
      const path = `${module_name}.json`;
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      // الخطوة 1: جلب محتوى الملف الحالي والـ SHA الخاص به من GitHub
      let sha = null;
      let currentDataArray = [];
      
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
        sha = checkData.sha;
        // فك تشفير النص القادم من جيت هب (Base64) وتحويله لمصفوفة كائنات JSON
        const contentText = Buffer.from(checkData.content, 'base64').toString('utf-8');
        currentDataArray = JSON.parse(contentText);
      } else {
        return res.status(404).json({ success: false, error: 'لم يتم العثور على ملف هذا القسم في المستودع' });
      }

      // التحقق من أن البيانات المحملة هي بالفعل مصفوفة
      if (!Array.isArray(currentDataArray)) {
        return res.status(500).json({ success: false, error: 'بنية بيانات الملف السحابي ليست مصفوفة صالحة للحذف الموجه' });
      }

      // الخطوة 2: الفلترة الذكية (حذف العنصر المطلوب)
      // نبحث في المصفوفة ونستبعد العنصر إذا تطابق معرفه مع: id، lastUpdated، أو رابط الفيديو المباشر
      const cleanTarget = target_id.trim();
      const updatedDataArray = currentDataArray.filter(item => {
        const itemId = item.id ? String(item.id).trim() : '';
        const itemTime = item.lastUpdated ? String(item.lastUpdated).trim() : '';
        const itemVideo = item.media?.videoUrl ? String(item.media.videoUrl).trim() : '';
        
        // إذا تطابق أي حقل مع المدخلات، سيتم حذفه (استبعاده من المصفوفة الجديدة)
        return itemId !== cleanTarget && itemTime !== cleanTarget && itemVideo !== cleanTarget;
      });

      // التحقق إذا لم يتم العثور على أي عنصر متطابق لتنبيه المشرف
      if (currentDataArray.length === updatedDataArray.length) {
        return res.status(200).json({ success: false, message: 'لم يتم العثور على أي عنصر يطابق هذا المعرف أو الرابط' });
      }

      // الخطوة 3: إعادة تشفير البيانات الجديدة ورفع التحديث إلى GitHub
      const updatedContentBase64 = Buffer.from(JSON.stringify(updatedDataArray, null, 2), 'utf-8').toString('base64');
      
      const updateBody = {
        message: `🗑️ Raqqa App: Deleted item from ${module_name}`,
        content: updatedContentBase64,
        sha: sha // الـ SHA ضروري لتحديث نفس الملف دون تضارب
      };

      const updateResponse = await fetch(githubUrl, {
        method: 'PUT', // ميثود التحديث المعتمدة لملفات جيت هب
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateBody)
      });

      if (updateResponse.status === 200 || updateResponse.status === 201) {
        return res.status(200).json({ success: true, message: 'تم حذف العنصر من المصفوفة وتحديث قاعدة البيانات السحابية بنجاح 🗑️✨' });
      } else {
        const errorData = await updateResponse.json();
        return res.status(updateResponse.status).json({ success: false, error: 'فشل جيت هب في حفظ التعديلات بعد الحذف', details: errorData });
      }

    } catch (err) {
      return res.status(500).json({ success: false, error: 'خطأ داخلي في الخادم أثناء معالجة الحذف المصفوفي', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
