/* 글 레이아웃 공통 동작. 내용은 같은 폴더의 data.js에서 편집하세요. */
(() => {
  const title = document.getElementById("essay-title");
  const author = document.getElementById("essay-author");
  const body = document.getElementById("essay-body");
  const date = document.getElementById("essay-date");
  if (typeof ARTICLE === "undefined") {
    title.textContent = "Article unavailable";
    body.textContent = "Check that data.js is in the same folder as entry4.html.";
    return;
  }
  title.textContent = ARTICLE.title || "Untitled";
  author.textContent = ARTICLE.author ? `by ${ARTICLE.author}` : "";
  author.hidden = !ARTICLE.author;
  const dateText = String(ARTICLE.date || "").trim();
  date.hidden = !dateText;
  date.textContent = dateText
    ? (ARTICLE.publication
      ? `First published in ${ARTICLE.publication} in ${dateText}.`
      : dateText)
    : "";
  document.title = [ARTICLE.title || "Untitled", ARTICLE.author].filter(Boolean).join(" — ");

  // 본문을 텍스트로 표시하므로 HTML 문자도 실행하지 않고 그대로 표시합니다.
  const text = String(ARTICLE.body || "").replace(/\r\n?/g, "\n").trim();
  const paragraphs = text ? text.split(/\n[ \t]*\n+/) : [];
  body.replaceChildren();
  for (const paragraph of paragraphs) {
    const p = document.createElement("p");
    p.textContent = paragraph;
    body.appendChild(p);
  }
})();
