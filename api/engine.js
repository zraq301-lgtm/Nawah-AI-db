// 📤 ثانياً: محرك الرفع والتحديث والحفظ المطور (POST) بنفس الهيكلية الجديدة
  if (req.method === 'POST') {
    try {
      // 1. قراءة مرنة للبيانات سواء أرسلت كمسميات قديمة أو مسميات لوحة التحكم الجديدة
      const module_name = req.body.module_name || req.body.section || 'bouh-display-1';
      const record_id = req.body.record_id || 'raqqa_posts_records';
      
      // تجهيز الـ jsondata الذكي: يدمج المحتوى النصي والرابط أو الملف القادم من الواجهة
      let jsondata = req.body.jsondata || null;
      
      if (!jsondata) {
        jsondata = {
          content: req.body.content || '',
          type: req.body.type || 'نصي',
          media_url: req.body.file || req.body.external_url || '', // استقبال الرابط المباشر أو الفديو
          updated_at: new Date().toISOString()
        };
      }

      // 2. فحص الأمان المحدث: الآن لن يعطي 400 طالما يوجد محتوى نصي أو رابط ميديا
      if (!jsondata.content && !jsondata.media_url) {
        return res.status(400).json({ success: false, error: 'البيانات المرسلة غير مكتملة، يرجى كتابة نص أو إرفاق رابط' });
      }

      // ضبط المسار ليكون متطابقاً مع مستندات المستودع
      const path = `${module_name}/${record_id}.json`;
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

      // 3. فحص هل الملف موجود مسبقاً للحصول على الـ sha للتحديث
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
          sha = checkData.sha;
        }
      } catch (e) {
        console.log("ملف جديد سيتم إنشاؤه لأول مرة");
      }

      // 4. تحويل مصفوفة البيانات إلى نص وتشفيرها بصيغة Base64 لـ GitHub
      const contentString = JSON.stringify(jsondata, null, 2);
      const base64Content = Buffer.from(contentString, 'utf-8').toString('base64');

      // 5. إعداد جسم الطلب لـ GitHub
      const putBody = {
        message: `🤖 Raqqa Admin Auto-Sync: Updated ${module_name}/${record_id}`,
        content: base64Content
      };
      if (sha) putBody.sha = sha; 

      // 6. تنفيذ عملية الحفظ الفعلي داخل المستودع
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
        return res.status(200).json({ success: true, message: 'تم حفظ وتأمين مصفوفة البيانات سحابياً بنجاح 🔐' });
      } else {
        const errorData = await saveResponse.json();
        return res.status(saveResponse.status).json({ success: false, error: 'فشل الحفظ في مستودع GitHub', details: errorData });
      }

    } catch (err) {
      return res.status(500).json({ success: false, error: 'خطأ داخلي في خادم الحفظ السحابي', details: err.message });
    }
  }
