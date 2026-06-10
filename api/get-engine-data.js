// /api/engine-get.js (أو ادمجه داخل نفس ملف الـ engine حسب بنيتك)

export default async function handler(req, res) {
  // تفعيل ترويسات CORS وحماية تدمير الكاش لضمان جلب بيانات حية دائماً
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET' || req.method === 'POST') {
    // 1. قراءة مرنة للمتغيرات (سواء من الرابط Query Parameters أو من جسم الطلب body)
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    // استقبال اسم الصفحة/القسم (أولوية أولى لـ page لتطابق كود الحفظ والـ Service)
    let pageName = searchParams.get('page') || req.query?.page || req.body?.page;

    // إذا لم يرسل المتغير page، نعتمد على المسميات القديمة كخيار احتياطي (Fallback)
    if (!pageName) {
      const module_name = searchParams.get('module_name') || req.query?.module_name || req.body?.module_name || req.body?.section;
      const record_id = searchParams.get('record_id') || req.query?.record_id || req.body?.record_id;
      
      if (module_name && record_id) {
        pageName = `${module_name}/${record_id}`;
      } else {
        pageName = module_name || 'بيانات_عامة';
      }
    }

    // 2. تنظيف اسم الصفحة وإزالة علامات التنصيص الزائدة لضمان تطابق الأسماء العربية
    let targetPageName = pageName.replace(/['"]/g, '').trim();

    // بناء نفس المسار المطابق تماماً لكود الحفظ الجديد
    let path = targetPageName.endsWith('.json') || targetPageName.includes('/') 
      ? targetPageName 
      : `raqqa_sections/${targetPageName}.json`;

    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;

    // تشفير المسار ليكون متوافقاً مع الحروف العربية والمسافات (UTF-8 URL Encoding)
    const encodedPath = encodeURIComponent(path);
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

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
        
        // فك تشفير Base64 القادم من GitHub وتحويله لنص مقروء بدقة (UTF-8)
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        // تحويل النص المسترجع إلى كائن ومصفوفة JSON حقيقية
        const parsedData = JSON.parse(decodedContent);
        
        // 🚀 الضخ المباشر: إعادة الكائن المنظم بكامل تصنيفات اللوحة ليعرض في الواجهة فوراً
        return res.status(200).json(parsedData);
      } else {
        // إذا كان الملف غير موجود بعد في المستودع (قسم جديد أول مرة)، نرجع مصفوفة فارغة أو كائن مهيأ
        return res.status(200).json({
          pageName: targetPageName,
          message: "ملف جديد، لا توجد بيانات مخزنة حالياً",
          media: { videoUrl: '', imageUrl: '', audioUrl: '' },
          article: { title: '', body: '', embeddedMedia: { type: 'none', url: '' } }
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: "فشل الاتصال بقاعدة البيانات السحابية", details: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'طريقة الطلب غير مدعومة، مسموح بـ GET أو POST فقط' });
}
