/* =========================================================
   entry1 — 갤러리 동작
   연속된 로컬 arch 사진을 읽고 실제 이미지 수만큼 프레임 생성
   ========================================================= */
window.__sbdGalleryReady = (async () => {
  const IMG_DIR = "../assets/img/";
  const DESIGN_W = 1713, DESIGN_H = 1024;   // 기존 기준 화면 크기
  const STRIP_HEIGHT_RATIO = 252 / 1024;    // 사진띠 최대 높이: 브라우저 화면 높이의 약 24.6%
  const STRIP_TOP = 300;                    // 사진 띠 y 위치
  const LARGE_TOP = 112;                    // 확대 사진 y 위치
  const QUOTE_GAP = 30;                     // 확대 사진과 인용문 사이 간격
  const DUR = 700;                          // 애니메이션 시간(ms) — style.css 의 --dur 와 맞추기

  const view  = document.getElementById("gallery");
  const strip = document.getElementById("strip");
  const quote = document.getElementById("quote");
  const quoteLink = document.getElementById("quote-link");
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");
  const library = typeof QUOTE_LIBRARY !== "undefined" ? QUOTE_LIBRARY : { sources: {}, quotes: [] };
  const quotes = (library.quotes || []).filter(q =>
    typeof q.text === "string" && q.text.trim() && library.sources?.[q.source]?.href
  );
  let previousQuote = -1;
  let currentQuote = null;
  let quoteRevealTimer = null;

  function showRandomQuote() {
    if (!quotes.length) {
      currentQuote = null;
      quoteText.textContent = "";
      quoteAuthor.textContent = "";
      quoteLink.removeAttribute("href");
      quoteLink.tabIndex = -1;
      return;
    }
    const candidates = quotes.map((_, i) => i).filter(i => quotes.length === 1 || i !== previousQuote);
    previousQuote = candidates[Math.floor(Math.random() * candidates.length)];
    currentQuote = quotes[previousQuote];
    const source = library.sources[currentQuote.source];
    quoteText.textContent = `“${currentQuote.text}”`;
    quoteAuthor.textContent = source.author ? `— ${source.author}` : "";
    quoteLink.href = source.href;
    quoteLink.tabIndex = -1;
  }

  // 링크 클릭을 갤러리 배경 클릭(확대 닫기)으로 처리하지 않음.
  quote.addEventListener("click", e => e.stopPropagation());

  let s = 1, oy = 0;          // 배율, 세로 여백
  let active = null;            // 확대된 가상 사진 번호 (null = 없음)
  let offset = 0;             // 띠의 가로 이동값
  let thumbX = [];            // 기본 상태에서 각 썸네일의 x
  let totalW = 0;

  /* ---------- 로컬 사진 자동 탐색 ---------- */
  const status = document.getElementById("status");
  function loadPhoto(file) {
    return new Promise(resolve => {
      const img = new Image();
      img.alt = file.replace(/\.[^.]+$/, "");
      img.decoding = "async";
      img.className = "is-local";
      img.onload = () => resolve({
        ...(GALLERY_CONFIG.metadata[file] || {}),
        id: file.replace(/\.[^.]+$/, ""),
        file,
        // 파일의 실제 크기 사용. 별도 프레임 크기/크롭 계산 없음.
        w: img.naturalWidth,
        h: img.naturalHeight,
        image: img
      });
      img.onerror = () => resolve(null);
      img.src = IMG_DIR + file;
    });
  }

  const PHOTOS = [];
  for (let n = 1; ; n++) {
    const file = `${GALLERY_CONFIG.prefix}${String(n).padStart(2, "0")}.${GALLERY_CONFIG.extension}`;
    const photo = await loadPhoto(file);
    if (!photo) break; // 첫 없는 번호에서 종료. 실패한 이미지는 프레임 생성 안 함.
    PHOTOS.push(photo);
  }
  PHOTOS.sort((a, b) => a.file.localeCompare(b.file, "en", { numeric: true }));
  if (!PHOTOS.length) {
    status.textContent = `No photos found. Check ${IMG_DIR}${GALLERY_CONFIG.prefix}01.${GALLERY_CONFIG.extension}`;
    return;
  }
  status.hidden = true;
  const maxSourceHeight = Math.max(...PHOTOS.map(p => p.h));
  const maxSourceWidth = Math.max(...PHOTOS.map(p => p.w));

  /* ---------- 반복되는 사진 띠 ---------- */
  // 실제 파일은 한 번만 읽고, 화면 근처에 필요한 사진만 반복 배치.
  // 음수 번호도 허용하므로 첫 사진의 왼쪽에도 마지막 사진이 이어짐.
  const items = new Map();
  const photoIndex = i => ((i % PHOTOS.length) + PHOTOS.length) % PHOTOS.length;
  const photoAt = i => PHOTOS[photoIndex(i)];
  const baseX = i => Math.floor(i / PHOTOS.length) * totalW + thumbX[photoIndex(i)];

  function positionItem(el, i) {
    const p = photoAt(i);
    const top = oy + STRIP_TOP * s;
    let x = baseX(i);
    let y = top;
    let [w, h] = thumbSize(p);
    if (active !== null) {
      const [largeW, largeH] = largeSize(photoAt(active));
      if (i === active) {
        y = oy + LARGE_TOP * s;
        w = largeW;
        h = largeH;
      } else if (i > active) {
        x += largeW - thumbSize(photoAt(active))[0];
      }
    }
    place(el, x, y, w, h);
    el.classList.toggle("is-active", i === active);
    el.classList.toggle("is-dim", active !== null && i !== active);
  }

  function createItem(i) {
    const p = photoAt(i);
    const el = document.createElement("div");
    el.className = "photo";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", p.quote ? `Photo: ${p.quote}` : `Photo ${photoIndex(i) + 1}`);
    el.appendChild(p.image.cloneNode(true));
    if (p.caption) {
      const cap = document.createElement("span");
      cap.className = "photo__caption";
      cap.textContent = p.caption;
      el.appendChild(cap);
    }
    el.addEventListener("click", e => {
      if (moved) return;
      e.stopPropagation();
      active === i ? close() : open(i);
    });
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
    // 새 사진이 화면 끝에서 날아오지 않도록 초기 위치 확정.
    el.style.transition = "none";
    positionItem(el, i);
    strip.appendChild(el);
    items.set(i, el);
    return el;
  }

  function ensureItems(from = offset, to = from) {
    const margin = window.innerWidth + 1000;
    const firstCycle = Math.floor((-Math.max(from, to) - margin) / totalW);
    const lastCycle = Math.floor((-Math.min(from, to) + window.innerWidth + margin) / totalW);
    const first = firstCycle * PHOTOS.length;
    const last = (lastCycle + 1) * PHOTOS.length - 1;
    const added = [];
    for (let i = first; i <= last; i++) {
      if (!items.has(i)) added.push(createItem(i));
    }
    if (added.length) {
      void strip.offsetWidth;
      added.forEach(el => { el.style.transition = ""; });
    }
    items.forEach((el, i) => {
      if ((i < first || i > last) && i !== active && !el.contains(document.activeElement)) {
        el.remove();
        items.delete(i);
      }
    });
  }

  /* ---------- 사진 전체의 대표색 → quote hover ---------- */
  const HOVER_PALETTE = [
    { hue: 0, color: "#d81717" },   // 빨강
    { hue: 60, color: "#ffc800" },  // 노랑
    { hue: 240, color: "#0d6dd4" }, // 파랑
    { hue: 120, color: "#8dc00e" }  // 초록
  ];
  const DEFAULT_HOVER = "#ffdd00"; // 무채색 / 분석 불가 사진

  function dominantHoverColor(image) {
    try {
      // 전체 사진을 작게 읽어 색상 분포 계산. 원본 이미지는 변경하지 않음.
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return DEFAULT_HOVER;
      ctx.drawImage(image, 0, 0, 96, 96);
      const pixels = ctx.getImageData(0, 0, 96, 96).data;
      const bins = Array.from({ length: 36 }, () => ({ count: 0, x: 0, y: 0 }));

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 128) continue;
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        // 무채색과 매우 어두운 픽셀 제외.
        const saturation = max ? delta / max : 0;
        if (max < 0.12 || saturation < 0.20) continue;
        // 면적에 채도·밝기를 반영: 탁한 배경보다 선명한 색에 무게.
        const weight = saturation ** 2 * Math.sqrt(max);
        let hue;
        if (max === r) hue = 60 * ((g - b) / delta);
        else if (max === g) hue = 60 * ((b - r) / delta + 2);
        else hue = 60 * ((r - g) / delta + 4);
        hue = (hue + 360) % 360;
        const bin = bins[Math.floor(hue / 10)];
        bin.count += weight;
        bin.x += Math.cos(hue * Math.PI / 180) * weight;
        bin.y += Math.sin(hue * Math.PI / 180) * weight;
      }

      // 가까운 색조들을 묶어 면적과 선명도가 두드러지는 색상군 선택.
      let best = null;
      for (let i = 0; i < bins.length; i++) {
        const group = [bins[(i + 35) % 36], bins[i], bins[(i + 1) % 36]];
        const count = group.reduce((sum, bin) => sum + bin.count, 0);
        if (!best || count > best.count) {
          best = {
            count,
            x: group.reduce((sum, bin) => sum + bin.x, 0),
            y: group.reduce((sum, bin) => sum + bin.y, 0)
          };
        }
      }
      if (!best.count) return DEFAULT_HOVER;
      const hue = (Math.atan2(best.y, best.x) * 180 / Math.PI + 360) % 360;
      const distance = target => {
        const difference = Math.abs(hue - target);
        return Math.min(difference, 360 - difference);
      };
      return HOVER_PALETTE.reduce((chosen, candidate) =>
        distance(candidate.hue) < distance(chosen.hue) ? candidate : chosen
      ).color;
    } catch {
      // 파일 접근 제한이나 외부 이미지 보안 제한이 있으면 기본색 사용.
      return DEFAULT_HOVER;
    }
  }

  function updateQuoteHover(i) {
    const p = photoAt(i);
    if (!p.hoverColor) p.hoverColor = dominantHoverColor(p.image);
    quote.style.setProperty("--quote-hover", p.hoverColor);
  }

  /* ---------- 크기 계산 ---------- */
  function thumbSize(p) {
    // 전체 띠에 공통 배율 적용: 사진별 높이 차이와 가로/세로 비율 유지.
    // 화면 높이에만 비례하고, 확대 크기 계산에 쓰는 원본 치수는 보존.
    const maxHeight = window.innerHeight * STRIP_HEIGHT_RATIO;
    const k = Math.min(1, maxHeight / maxSourceHeight);
    return [p.w * k, p.h * k];
  }

  function measure() {
    s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    s = Math.max(0.45, Math.min(s, 1.25));
    oy = Math.max(0, (window.innerHeight - DESIGN_H * s) / 2);
    document.documentElement.style.setProperty("--s", s);
    let x = 0;
    thumbX = PHOTOS.map((p) => { const cx = x; x += thumbSize(p)[0]; return cx; });
    totalW = x;
  }

  function largeSize(p) {
    // 모든 사진에 공통 확대 배율 적용.
    // 원본 이미지 위에서 아치 윗끝까지 650px로 맞춰져 있으므로,
    // 확대 후 아치 윗끝은 모두 LARGE_TOP 화면 위치 + 650 * sharedScale에 놓임.
    const baseScale = Math.min(628 / maxSourceHeight, 860 / maxSourceWidth) * s;
    const maxW = Math.max(1, window.innerWidth - 32);
    const maxH = Math.max(1, window.innerHeight - (oy + LARGE_TOP * s) - 120 * s);
    const sharedScale = Math.min(baseScale, maxW / maxSourceWidth, maxH / maxSourceHeight);
    return [p.w * sharedScale, p.h * sharedScale];
  }

  function place(el, x, y, w, h) {
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
  }

  function clampOffset(o) {
    return o; // 무한 사진 띠는 양쪽 끝에서 멈추지 않음.
  }

let scrollTarget = 0;
let scrollFrame = null;

function setOffset(o, animate, smooth = false) {
  scrollTarget = o;

  // 휠 스크롤: 목표 위치를 부드럽게 따라가기
  if (smooth) {
    strip.classList.remove("is-animating");
    clearTimeout(setOffset.t);

    if (scrollFrame !== null) return;

    let previousTime = performance.now();

    function tick(now) {
      const dt = Math.min(now - previousTime, 50);
      previousTime = now;

      // 숫자가 클수록 묵직하고, 작을수록 빠르게 반응
      const softness = 120;
      const follow = 1 - Math.exp(-dt / softness);

      offset += (scrollTarget - offset) * follow;

      if (Math.abs(scrollTarget - offset) < 0.2) {
        offset = scrollTarget;
        scrollFrame = null;
      } else {
        scrollFrame = requestAnimationFrame(tick);
      }

      ensureItems();
      strip.style.transform = `translate3d(${offset}px,0,0)`;
    }

    scrollFrame = requestAnimationFrame(tick);
    return;
  }

  // 사진 확대·닫기·드래그 시에는 진행 중인 스크롤 정리
  cancelAnimationFrame(scrollFrame);
  scrollFrame = null;

  clearTimeout(setOffset.t);
  ensureItems(offset, o);
  offset = o;
  strip.classList.toggle("is-animating", !!animate);
  strip.style.transform = `translate3d(${offset}px,0,0)`;

  if (animate) {
    setOffset.t = setTimeout(
      () => {
        strip.classList.remove("is-animating");
        ensureItems();
      },
      DUR
    );
  }
}

  /* ---------- 레이아웃 ---------- */
  function layout(animate) {
    measure();
    const top = oy + STRIP_TOP * s;
    const destination = active === null
      ? offset
      : (window.innerWidth - largeSize(photoAt(active))[0]) / 2 - baseX(active);
    ensureItems(offset, destination);

    // 기본 상태: 썸네일이 한 줄로 이어짐
    if (active === null) {
      items.forEach((el, i) => {
        const p = photoAt(i);
        place(el, baseX(i), top, ...thumbSize(p));
        el.classList.remove("is-dim", "is-active");
      });
      quote.classList.remove("is-visible");
      quoteLink.tabIndex = -1;
      setOffset(clampOffset(offset), animate);
      return;
    }

    // 확대 상태: 선택한 사진은 크게, 나머지는 양옆으로 밀림
    const p = photoAt(active);
    const [LW, LH] = largeSize(p);
    const ax = baseX(active);
    items.forEach((el, i) => {
      const q = photoAt(i);
      if (i === active) place(el, ax, oy + LARGE_TOP * s, LW, LH);
      else place(el, i < active ? baseX(i) : baseX(i) + (LW - thumbSize(p)[0]), top, ...thumbSize(q));
      el.classList.toggle("is-active", i === active);
      el.classList.toggle("is-dim", i !== active);
    });
    setOffset((window.innerWidth - LW) / 2 - ax, animate);

    // 인용문 위치
    const qWidth = Math.min(Math.max(LW - 10 * s, 280), window.innerWidth - 32);
    const qLeft = Math.max(16, Math.min((window.innerWidth - LW) / 2 + (LW > 360 ? 10 * s : 0), window.innerWidth - qWidth - 16));
    const qTop = oy + LARGE_TOP * s + LH + QUOTE_GAP * s;
    quote.style.left = qLeft + "px";
    quote.style.top = qTop + "px";
    quote.style.width = qWidth + "px";
    quote.style.maxHeight = Math.max(0, window.innerHeight - qTop - 16) + "px";
  }

  /* ---------- 열기 / 닫기 ---------- */
  function open(i, animate = true) {
    if (active === i) return;
    clearTimeout(quoteRevealTimer);
    quoteRevealTimer = null;
    quote.classList.remove("is-visible");
    quoteLink.tabIndex = -1;
    active = i;
    updateQuoteHover(i);
    showRandomQuote();
    layout(animate);
    if (currentQuote) {
      const revealQuote = () => {
        quoteRevealTimer = null;
        if (active !== i) return;
        quote.classList.add("is-visible");
        quoteLink.tabIndex = 0;
      };
      // 사진 확대(700ms)가 끝난 뒤 인용문을 표시.
      if (animate) quoteRevealTimer = setTimeout(revealQuote, DUR);
      else revealQuote();
    }
    const p = photoAt(i);
    history.replaceState(null, "", "#" + p.id);
  }

  function close() {
    clearTimeout(quoteRevealTimer);
    quoteRevealTimer = null;
    if (active === null) return;
    const i = active;
    active = null;
    measure();
    offset = window.innerWidth / 2 - (baseX(i) + thumbSize(photoAt(i))[0] / 2);  // 보던 사진을 가운데로
    layout(true);
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ---------- 휠 / 드래그 / 키보드 ---------- */
  let wheelLock = 0;
  view.addEventListener("wheel", (e) => {
    if (e.target.closest(".quote")) return;
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (active !== null) {
      const now = Date.now();
      if (now - wheelLock < DUR || Math.abs(d) < 8) return;
      wheelLock = now;
      open(active + (d > 0 ? 1 : -1));
      return;
    }
    setOffset(clampOffset(scrollTarget - d), false, true);
  }, { passive: false });

  let down = false, moved = false, startX = 0, startOffset = 0;
  view.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".quote")) return;
    down = true; moved = false;
    startX = e.clientX; startOffset = offset;
  });
  window.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; view.classList.add("is-dragging"); }
    if (moved && active === null) setOffset(clampOffset(startOffset + dx), false);
  });
  window.addEventListener("pointerup", (e) => {
    if (!down) return;
    down = false;
    view.classList.remove("is-dragging");
    const dx = e.clientX - startX;
    if (moved && active !== null && Math.abs(dx) > 50) open(active + (dx < 0 ? 1 : -1));
    setTimeout(() => (moved = false), 0);
  });

  // 빈 공간 클릭 → 닫기
  view.addEventListener("click", () => { if (!moved) close(); });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") active !== null ? open(active + 1) : setOffset(clampOffset(offset - 300 * s), true);
    else if (e.key === "ArrowLeft")  active !== null ? open(active - 1) : setOffset(clampOffset(offset + 300 * s), true);
  });

  window.addEventListener("resize", () => layout(false));

  /* ---------- 시작 ---------- */
  measure();
  offset = -444 * s;   // 기존처럼 사진 띠가 화면 밖에서 이어지게 시작
  layout(false);

  // 현재 페이지의 사진 주소로 열면 바로 확대 (예: #arch03)
  const start = PHOTOS.findIndex((p) => p.id === location.hash.slice(1));
  if (start >= 0) requestAnimationFrame(() => open(start, false));
})();
