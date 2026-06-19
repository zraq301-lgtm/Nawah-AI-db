// /api/engine-get.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' || req.method === 'POST') {
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

    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;

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
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const parsedData = JSON.parse(decodedContent);

        // 🎯 الحيلة الذكية: إذا كانت البيانات القادمة عبارة عن مصفوفة (أرشيف كامل)
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          
          // 1. نأخذ الميديا الرئيسية (الفيديو والصورة) من أحدث بوست تم رفعه
          const latestPost = parsedData[parsedData.length - 1];
          
          // 2. نقوم بدمج وتجميع كافة المقالات والنصوص والفيديوهات القديمة والجديدة في قالب HTML تراكمي واحد
          let combinedBody = "";
          
          // نقوم بلف عناصر المصفوفة من الأحدث للأقدم لدمجها
          parsedData.slice().reverse().forEach((item, idx) => {
            const title = item.article?.title || "";
            const body = item.article?.body || "";
            const vUrl = item.media?.videoUrl || "";
            
            combinedBody += `
              <div class="embedded-post-block" style="border-bottom: 2px dashed #e0d5cd; padding-bottom: 20px; margin-bottom: 25px; text-align: right;">
                ${title ? `<h3 style="color: #8d6e63; font-size: 1.2rem; margin-bottom: 8px;">📊 ${title}</h3>` : ''}
                ${body ? `<p style="line-height: 1.7; color: #4a3f35;">${body.replace(/\n/g, '<br />')}</p>` : ''}
                ${(vUrl && idx > 0) ? `
                  <p><iframe src="${vUrl.includes('youtu.be/') ? `https://www.youtube.com/embed/${vUrl.split('youtu.be/')[1]?.split('?')[0]}` : vUrl}" width="100%" height="240" frameborder="0" allowfullscreen style="border-radius:10px; margin-top:5px;"></iframe></p>
                ` : ''}
              </div>
            `;
          });

          // 3. نركب الكائن المدمج النهائي لخدعة كود الواجهة دون تعديله
          const combinedPayload = {
            pageName: latestPost.pageName || targetPageName,
            media: latestPost.media || { videoUrl: '', imageUrl: '', audioUrl: '' },
            article: {
              title: latestPost.article?.title || targetPageName,
              body: combinedBody, // هنا تظهر كل البوستات السابقة مدمجة ومصممة داخل حقل الـ body
              embeddedMedia: { type: 'none', url: '' }
            }
          };

          return res.status(200).json(combinedPayload);
        }

        return res.status(200).json(parsedData);
      } else {
        return res.status(200).json({
          pageName: targetPageName,
          media: { videoUrl: '', imageUrl: '', audioUrl: '' },
          article: { title: '', body: '', embeddedMedia: { type: 'none', url: '' } }
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: "فشل الاتصال بقاعدة البيانات", details: err.message });
    }
  }
  return res.status(405).json({ success: false, error: 'طريقة الطلب غير مدعومة' });
}
