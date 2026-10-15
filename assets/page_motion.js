/* 모든 HTML의 head 안에 추가:
   <script src="../assets/page-motion.js" defer></script>
   이 파일은 SBD/assets/page-motion.js에 넣으세요.
*/
(() => {
  if (window.__sbdPageMotionLoaded) return;
  window.__sbdPageMotionLoaded = true;

  // 페이지 등장 / 퇴장 시간(ms). 여기에서만 수정하세요.
  const ENTER_MS = 300;
  const LEAVE_MS = 200;

  const style = document.createElement("style");
  style.textContent = `
    body { animation: sbd-page-enter ${ENTER_MS}ms ease-out both; }
    body.sbd-page-leaving {
      animation: sbd-page-leave ${LEAVE_MS}ms ease-in forwards;
      pointer-events: none;
    }
    @keyframes sbd-page-enter { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sbd-page-leave { from { opacity: 1; } to { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      body, body.sbd-page-leaving { animation: none; }
    }
  `;
  document.head.appendChild(style);

  let leaving = false;
  let navigationTimer = null;
  window.addEventListener("pageshow", (event) => {
  clearTimeout(navigationTimer);
  leaving = false;
  document.body.classList.remove("sbd-page-leaving");

  // 브라우저가 저장해둔 화면으로 복원한 경우
  if (event.persisted) {
    document.body.style.animation = "none";
    void document.body.offsetWidth;
    document.body.style.animation = "";
  }
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

    const destination = new URL(link.href, location.href);
    if (!["http:", "https:", "file:"].includes(destination.protocol)) return;
    if (destination.origin !== location.origin) return;
    const samePage =
    destination.pathname === location.pathname &&
    destination.search === location.search;

    // 같은 페이지 안의 특정 위치로 가는 링크는 기존대로 작동
    if (samePage && destination.hash) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    event.preventDefault();
    if (leaving) return;
    leaving = true;
    document.body.classList.add("sbd-page-leaving");
    navigationTimer = setTimeout(() => {
  if (samePage) {
    // 확대된 사진 주소(#circle03 등)를 지우고 다시 로드
    history.replaceState(null, "", destination.href);
    location.reload();
    } else {
    location.assign(destination.href);
    }
    }, LEAVE_MS);
  }, true);
})();
