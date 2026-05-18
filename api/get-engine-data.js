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
    // قراءة المتغيرات القادمة من الطلب، وإذا لم تكن موجودة (كالمتصفح) نضع قيم المخزن الافتراضية التي حددتها
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const searchParams = new URLSearchParams(queryString);

    // دمج موديول المخزن واسم السجل بناءً على بنيتك الجديدة المباشرة
    const module_name = searchParams.get('module_name') || req.query?.module_name || 'inventory_module';
    const record_id = searchParams.get('record_id') || req.query?.record_id || 'stock_records';

    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;

    // 🎯 المسار المباشر الجديد تماماً المطابق لبنية مستودعك الفعلي
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
        // فك تشفير Base64 القادم من GitHub وتحويله لنص مقروء
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        // تحويل النص المقروء إلى مصفوفة JSON حقيقية
        const parsedData = JSON.parse(decodedContent);
        
        // 🚀 الضخ المباشر: إرسال المصفوفة الصافية لتظهر في المتصفح والواجهة فوراً
        return res.status(200).json(parsedData);
      } else {
        // إذا كان الملف غير موجود بعد في المستودع نرجع مصفوفة فارغة جاهزة للاستقبال
        return res.status(200).json([]);
      }
    } catch (err) {
      return res.status(200).json({ error: "فشل الاتصال بقاعدة البيانات السحابية", details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
