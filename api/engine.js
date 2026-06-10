// 📤 ثانياً: محرك الرفع والتحديث والحفظ المطور (POST) الاحترافي لدعم أسماء الملفات العربية
  if (req.method === 'POST') {
    try {
      // 1. إعداد متغيرات البيئة الحاكمة للمستودع المستهدف
      const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
      const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
      const token = process.env.NAWAH_GITHUB_TOKEN; // التوكن السري الخاص بجيت هاب

      // فحص أمني سريع للتأكد من وجود التوكن لتجنب انهيار السيرفر
      if (!token) {
        return res.status(500).json({ success: false, error: 'خطأ في السيرفر: التوكن السري NAWAH_GITHUB_TOKEN غير معرف في البيئة' });
      }

      // 2. استخراج البيانات من كود الـ Service
      const { page, content } = req.body;

      // فحص الأمان: التحقق من وجود بيانات فعلية في الـ content المرسل
      if (!content) {
        return res.status(400).json({ success: false, error: 'البيانات المرسلة غير مكتملة، حقل content مفقود' });
      }

      // 3. محرك ديناميكي ذكي لتحديد اسم الملف بناءً على القيم المطلوبة
      let targetPageName = page || req.body.module_name || req.body.section || 'بيانات_عامة';
      
      // تنظيف اسم الصفحة وإزالة العلامات الزائدة إن وجدت لضمان تطابق الأسماء العربية
      targetPageName = targetPageName.replace(/['"]/g, '').trim();

      // بناء المسار للملف داخل مجلد مخصص للأقسام
      const path = `raqqa_sections/${targetPageName}.json`;

      // تشفير المسار ليكون متوافقاً مع روابط الويب والحروف العربية (UTF-8 URL Encoding)
      const encodedPath = encodeURIComponent(path);
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

      // 4. معالجة الـ Content وتحويله سحابياً إلى JSON نظيف ومقروء
      let finalDataToSave;
      if (typeof content === 'object') {
        finalDataToSave = content;
      } else {
        try {
          // إذا كان الـ content المرسل عبارة عن نص مصفوفة أو كائن نصي، نقوم بعمل Parse له
          finalDataToSave = JSON.parse(content);
        } catch (e) {
          // إذا كان نصاً خاماً (مثل رابط فيديو أو نص عادي)، نحفظه في هيكل منظم لكي لا ينهار الملف
          finalDataToSave = {
            section_name: targetPageName,
            content_data: content,
            type: req.body.type || 'raw_data',
            updated_at: new Date().toISOString()
          };
        }
      }

      // 5. فحص ذكي: هل الملف موجود مسبقاً في المستودع؟ (لجلب الـ sha لتجنب أخطاء التحديث)
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
          sha = checkData.sha; // حفظ الـ sha الخاص بالملف الحالي ليتم التعديل عليه بسلام
        }
      } catch (e) {
        console.log(`إنشاء ملف جديد لأول مرة باسم: ${path}`);
      }

      // 6. تحويل البيانات وتحويلها إلى نظام التشفير العالمي Base64 المطلوب من قبل جيت هاب
      const contentString = JSON.stringify(finalDataToSave, null, 2);
      const base64Content = Buffer.from(contentString, 'utf-8').toString('base64');

      // 7. بناء كائن الطلب (Payload) الموجه لـ GitHub API
      const putBody = {
        message: `✨ Raqqa Admin Auto-Sync: Updated ${path}`,
        content: base64Content
      };
      if (sha) putBody.sha = sha; // نرفق الـ sha فقط إذا كانت العملية تحديث لملف قائم

      // 8. تنفيذ عملية الحفظ والرفع الفعلي داخل مستودع جيت هاب
      const saveResponse = await fetch(githubUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (saveResponse.status === 200 || saveResponse.status === 201) {
        return res.status(200).json({ 
          success: true, 
          message: `تم حفظ صفحة [${targetPageName}] وتأمينها في جيت هاب بنجاح 🔐` 
        });
      } else {
        const errorData = await saveResponse.json();
        return res.status(saveResponse.status).json({ success: false, error: 'فشل جيت هاب في معالجة الملف', details: errorData });
      }

    } catch (err) {
      return res.status(500).json({ success: false, error: 'خطأ مباغت في سيرفر فيرسيل الداخلي', details: err.message });
    }
  }
