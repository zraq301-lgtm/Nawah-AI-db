export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { module_name, record_id } = req.body; // قراءة آمنة ومباشرة من الـ body لتجنب مشاكل علامات الاستفهام

    if (!module_name || !record_id) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const owner = process.env.NAWAH_REPO_OWNER || 'zraq301-lgtm';
    const repo = process.env.NAWAH_REPO_NAME || 'Nawah-AI-db';
    const token = process.env.NAWAH_GITHUB_TOKEN;
    const tenant = 'nawah-core';

    const path = `database/${tenant}/${module_name}/${record_id}.json`;
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.status === 200) {
        const fileData = await response.json();
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return res.status(200).json(JSON.parse(decodedContent));
      } else {
        return res.status(200).json([]); // إرجاع مصفوفة فارغة لتفادي كراش الواجهات
      }
    } catch (err) {
      return res.status(500).json({ error: 'خطأ أثناء جلب البيانات السحابية', details: err.message });
    }
  }
}
