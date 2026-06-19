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

        // 🎯 الخدعة السحرية لتوليد إطارات (Cards) منفصلة لكل منشور بدون لمس الواجهة
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          
          // نأخذ المنشور الأول كغطاء أساسي
          const basePost = parsedData[parsedData.length - 1]; 
          let combinedBody = "";

          // التكرار على المنشورات لإنشاء إطارات وأزرار تفاعل منفصلة لكل منشور محقونة بالـ HTML
          parsedData.slice().reverse().forEach((item, idx) => {
            const title = item.article?.title || `منشور رقم ${parsedData.length - idx}`;
            const body = item.article?.body || "";
            const imageUrl = item.media?.imageUrl || "";
            const videoUrl = item.media?.videoUrl || "";
            const audioUrl = item.media?.audioUrl || "";
            const mockId = item.lastUpdated || `post_${idx}`;

            // إذا كان المنشور الأول (الرئيسي)، نضع المحتوى فقط لأن كود الواجهة سيقوم ببناء الإطار الخارجي له تلقائياً
            if (idx === 0) {
              combinedBody += `
                <div class="server-card-title" style="display:none;">${title}</div>
                <p>${body.replace(/\n/g, '<br />')}</p>
                ${imageUrl ? `<p><img src="${imageUrl}" style="width:100%; border-radius:10px; margin-top:10px;" /></p>` : ''}
                ${audioUrl ? `<p style="text-align:center; margin-top:15px;"><audio src="${audioUrl}" controls style="width:100%;"></audio></p>` : ''}
              `;
            } else {
              // 🚀 هنا السحر: نقوم بإغلاق البطاقة الحالية الخاصة بالواجهة، وفتح بطاقة (Card) جديدة تماماً ومحاكاة أزرار التفاعل!
              const isYouTube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
              let embedVideo = videoUrl;
              if (isYouTube) {
                let videoId = videoUrl.includes('youtu.be/') ? videoUrl.split('youtu.be/')[1]?.split('?')[0] : videoUrl.split('v=')[1]?.split('&')[0];
                embedVideo = `https://www.youtube.com/embed/${videoId}`;
              }

              combinedBody += `
                </div></div></div></div> <!-- إغلاق ديفات الواجهة للبطاقة السابقة بالكامل -->
                
                <!-- بناء بطاقة سيرفر جديدة مستقلة بنفس تصميم الواجهة تماماً -->
                <div class="article-container" style="width:100%; display:flex; justify-content:center;">
                  <div class="card" style="background:#ffffff; max-width:500px; width:95%; border-radius:20px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,0.06); margin-bottom:30px; border:1px solid #f0e6e0;">
                    
                    <div class="card-header-title" style="padding:20px 15px; text-align:center; background-color:#fff;">
                      <h2 style="color:#8d6e63; margin:0; font-size:1.4rem; font-family:'Tajawal';">${title}</h2>
                    </div>

                    ${videoUrl ? `
                      <div class="main-featured-video" style="width:100%; padding:0;">
                        ${isYouTube ? `
                          <iframe src="${embedVideo}" width="100%" height="280" frameborder="0" allowfullscreen style="display:block;"></iframe>
                        ` : `
                          <video src="${videoUrl}" controls style="width:100%; display:block; height:auto;"></video>
                        `}
                      </div>
                    ` : ''}

                    ${(!videoUrl && imageUrl) ? `
                      <div class="main-featured-image" style="width:100%;">
                        <img src="${imageUrl}" style="width:100%; display:block; height:auto;" />
                      </div>
                    ` : ''}

                    <div class="content" style="padding:20px; text-align:center;">
                      <div class="wp-html-content" style="text-align:right; color:#4a3f35; font-size:1.1rem; font-family:'Tajawal';">
                        <p style="line-height:1.8; margin-bottom:15px;">${body.replace(/\n/g, '<br />')}</p>
                        ${audioUrl ? `<p style="text-align:center; margin-top:15px;"><audio src="${audioUrl}" controls style="width:100%;"></audio></p>` : ''}
                      </div>
                      <div class="app-download-box" style="margin-top:25px; padding:15px; background:#fdfaf8; border:1px dashed #b08968; border-radius:15px;">
                        <a href="https://raqa-1zhm.vercel.app/" target="_blank" rel="noreferrer" style="color:#8d6e63; text-decoration:none; font-weight:700;">✨ حملي التطبيق الآن من هنا ✨</a>
                      </div>
                    </div>

                    <!-- أزرار تفاعل مضافة ومستقلة لكل منشور مبنية ديناميكياً بنفس الهوية البصرية للواجهة -->
                    <div class="interaction-buttons" style="display:flex; justify-content:space-around; padding:15px; border-top:1px solid #fcf6f2; background:#fffcfb;">
                      <button onclick="alert('شكراً لتفاعلكِ ❤️')" style="background:none; border:none; cursor:pointer; font-family:'Tajawal'; font-size:1rem; color:#8d6e63;">❤️ <span id="like_${mockId}">0</span></button>
                      <button onclick="let box = document.getElementById('comment_box_${mockId}'); box.style.display = box.style.display === 'none' ? 'block' : 'none';" style="background:none; border:none; cursor:pointer; font-family:'Tajawal'; font-size:1rem; color:#8d6e63;">💬 تعليق</button>
                      <button onclick="if(navigator.share){navigator.share({title:'${title}', url:'https://raqa-1zhm.vercel.app/'})}else{window.open('https://wa.me/?text='+encodeURIComponent('${title} https://raqa-1zhm.vercel.app/'))}" style="background:none; border:none; cursor:pointer; font-family:'Tajawal'; font-size:1rem; color:#8d6e63;">🔗 مشاركة</button>
                    </div>

                    <!-- منطقة التعليقات الخاصة بالمنشور المحقون -->
                    <div id="comment_box_${mockId}" class="comments-area" style="padding:15px; background:#fff; border-top:1px solid #eee; display:none;">
                      <div class="comment-input-wrap" style="display:flex; gap:8px; margin-bottom:12px;">
                        <input id="input_${mockId}" type="text" placeholder="أضيفي لمستكِ..." style="flex:1; padding:10px 15px; border-radius:20px; border:1px solid #ddd; outline:none; font-family:'Tajawal';" />
                        <button onclick="let inp = document.getElementById('input_${mockId}'); if(inp.value.trim()){ let lst = document.getElementById('list_${mockId}'); let d = document.createElement('div'); d.className='single-comment'; d.style.background='#fdf8f5'; d.style.padding='10px 12px'; d.style.borderRadius='12px'; d.style.marginBottom='8px'; d.style.fontSize='0.9rem'; d.style.borderRight='4px solid #b08968'; d.style.textAlign='right'; d.innerText=inp.value; lst.insertBefore(d, lst.firstChild); inp.value=''; }}" style="background:#b08968; color:white; border:none; padding:8px 18px; border-radius:20px; cursor:pointer;">نشر</button>
                      </div>
                      <div id="list_${mockId}" class="comments-list"></div>
                    </div>

                  </div>
                </div>

                <!-- فتح ديفات وهمية موازية لكي تظن الواجهة أنها ما زالت تغلق بطاقتها الأصلية بشكل سليم دون انهيار -->
                <div class="article-container" style="display:none;"><div class="card" style="display:none;"><div class="content" style="display:none;"><div class="wp-html-content" style="display:none;">
              `;
            }
          });

          // تركيب رد الهيكل النهائي المخادع للواجهة الحالية
          const finalPayload = {
            pageName: basePost.pageName || targetPageName,
            media: basePost.media || { videoUrl: '', imageUrl: '', audioUrl: '' },
            article: {
              title: basePost.article?.title || targetPageName,
              body: combinedBody, 
              embeddedMedia: { type: 'none', url: '' }
            }
          };

          return res.status(200).json(finalPayload);
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
