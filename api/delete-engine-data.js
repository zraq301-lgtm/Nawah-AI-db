export default async function handler(req, res) {
  // 1. تفعيل الـ CORS لتأمين الاتصال وحظر الكاش نهائياً لضمان الفورية
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // إعدادات مستودع GitHub الثابتة والمؤمنة بالبيئة
  const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
  const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
  const token = process.env.NAWAH_GITHUB_TOKEN;

  // 🗑️ تحويل استقبال المحرك ليعمل على ميثود POST المتوافقة مع التطبيق والخدمة
  if (req.method === 'POST') {
    try {
      // استقبال المتغيرات المطابقة تماماً لكود الخدمة (page و id) أو القديمة للاحتياط
      const module_name = req.body?.page || req.query?.module_name || req.body?.module_name;
      const record_id = req.body?.id || req.query?.record_id || req.body?.record_id;

      if (!module_name || !record_id) {
        return res.status(400).json({ success: false, error: 'برجاء تحديد اسم القسم (page) والمعرف (id) المطلوب حذفه' });
      }

      // المسار المباشر الموحد والمطابق تماماً للبنية المخزنة (اسم القسم كفولدر أو اسم الملف)
      // إذا كان القسم يخزن كملف جيسون منفرد، تأكدي من المسار. هنا تم ضبطه كـ: page/id.json
      const path = `${module_name}/${record_id}.json`;
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      // الخطوة 1: الفحص السريع عن الملف في GitHub لجلب الـ sha الخاص به
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
          sha = checkData.sha; // الإمساك بمعرف النسخة بنجاح
        } else {
          // إذا كان الملف غير موجود أصلاً بسيرفر جيت هب، نعتبر العملية ناجحة تلافياً للمشاكل
          return res.status(200).json({ success: true, message: 'الملف غير موجود بالفعل في قاعدة البيانات السحابية' });
        }
      } catch (e) {
        return res.status(404).json({ success: false, error: 'تعذر العثور على الملف المستهدف في السحابة' });
      }

      // الخطوة 2: إرسال أمر التدمير والحذف الفعلي إلى GitHub API
      const deleteBody = {
        message: `🗑️ Raqqa App Auto-Sync: Deleted ${module_name}/${record_id}`,
        sha: sha // إرسال الـ sha إجباري هنا ليوافق جيت هب على الحذف
      };

      const deleteResponse = await fetch(githubUrl, {
        method: 'DELETE', // نترك جيت هب يستقبلها DELETE داخلياً
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteBody)
      });

      if (deleteResponse.status === 200) {
        return res.status(200).json({ success: true, message: 'تم تدمير وحذف السجل السحابي بنجاح تام 🗑️🔐' });
      } else {
        const errorData = await deleteResponse.json();
        return res.status(deleteResponse.status).json({ success: false, error: 'فشل جيت هب في معالجة طلب الحذف', details: errorData });
      }

    } catch (err) {
      return res.status(500).json({ success: false, error: 'خطأ داخلي في خادم الحذف السحابي', details: err.message });
    }
  }

  // في حال استخدام ميثود أخرى غير مدعومة في هذا الرابط
  return res.status(405).json({ error: 'Method not allowed' });
}
