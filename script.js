const OPENAI_API_KEY = "YOUR_API_KEY";
const TO_EMAIL = "ankurray561@gmail.com";

function fetchAndSendAINews() {

  // STEP 1: Fetch real AI news
  const rssUrl = "https://news.google.com/rss/search?q=OpenAI+Anthropic+LLM+AI+model&hl=en-IN&gl=IN&ceid=IN:en";
  const response = UrlFetchApp.fetch(rssUrl);
  const xml = response.getContentText();

  const document = XmlService.parse(xml);
  const items = document.getRootElement().getChild("channel").getChildren("item");

  let articles = [];

  for (let i = 0; i < Math.min(5, items.length); i++) {
    const item = items[i];

    articles.push({
      title: item.getChildText("title"),
      link: item.getChildText("link").split("&")[0],
      source: item.getChildText("source") || "Google News"
    });
  }

  // STEP 2: AI enrichment (summary + why it matters + trend)
  const prompt = `
Return ONLY JSON:

{
  "trend": "1 line AI trend today",
  "news": [
    {
      "summary": "1 sentence",
      "why": "why it matters in 1 line"
    }
  ]
}

For this news:
${JSON.stringify(articles)}
`;

  const aiResponse = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + OPENAI_API_KEY
    },
    payload: JSON.stringify({
      model: "gpt-4o-mini",
      input: prompt
    })
  });

  const raw = aiResponse.getContentText();
  const data = JSON.parse(raw);

  let text = "";
  if (data.output && data.output.length > 0) {
    data.output[0].content.forEach(block => {
      if (block.type === "output_text") {
        text += block.text;
      }
    });
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const aiData = JSON.parse(text.slice(start, end + 1));

  const enriched = articles.map((a, i) => ({
    ...a,
    summary: aiData.news[i]?.summary || "",
    why: aiData.news[i]?.why || ""
  }));

  const topStory = enriched[0];
  const others = enriched.slice(1);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  function cleanUrl(url) {
    return url.split("?")[0];
  }

  const otherHTML = others.map((a, i) => `
    <div style="padding:14px 0;border-bottom:1px solid #eee;">
      <div style="font-weight:600;">${i + 2}. ${a.title}</div>
      <div style="color:#666;font-size:13px;">${a.source}</div>
      <div style="margin:6px 0;">${a.summary}</div>
      <div style="font-size:13px;color:#444;"><b>Why it matters:</b> ${a.why}</div>
      <a href="${cleanUrl(a.link)}" style="color:#1a73e8;text-decoration:none;font-size:13px;">
        Read full article →
      </a>
    </div>
  `).join("");

  const htmlBody = `
    <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px;background:#f4f6f8;">
      
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="margin:0;">AI News Daily</h2>
        <div style="color:#888;font-size:13px;">${today}</div>
      </div>

      <div style="background:#fff;padding:12px;border-radius:8px;margin-bottom:20px;">
        <b>Trend of the Day:</b> ${aiData.trend}
      </div>

      <div style="background:#fff;padding:16px;border-radius:10px;margin-bottom:20px;">
        <div style="color:#d93025;font-weight:bold;font-size:12px;">TOP STORY</div>
        <div style="font-size:18px;font-weight:700;margin:6px 0;">
          ${topStory.title}
        </div>
        <div style="color:#666;font-size:13px;">${topStory.source}</div>
        <div style="margin:8px 0;">${topStory.summary}</div>
        <div style="font-size:13px;"><b>Why it matters:</b> ${topStory.why}</div>
        <a href="${cleanUrl(topStory.link)}" style="color:#1a73e8;font-weight:600;text-decoration:none;">
          Read full article →
        </a>
      </div>

      <div style="background:#fff;padding:16px;border-radius:10px;">
        <div style="font-weight:600;margin-bottom:10px;">Other Headlines</div>
        ${otherHTML}
      </div>

      <div style="text-align:center;color:#aaa;font-size:11px;margin-top:20px;">
        AI-powered daily intelligence • Built by Ankur
      </div>

    </div>
  `;

  GmailApp.sendEmail(
    TO_EMAIL,
    "AI News Daily",
    "Fallback",
    { htmlBody: htmlBody }
  );
}
