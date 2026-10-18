// تنظیمات: آی‌دی تلگرام (بدون @) را اینجا بنویس تا فرم ثبت‌نام کار کند.
const CONFIG = {
  telegram: "",
};

(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const faNum = new Intl.NumberFormat("fa-IR", { useGrouping: false });

  /* ---------- Hero headline: word by word ---------- */
  const h1 = document.querySelector(".hero h1");
  if (h1 && !reduce) {
    const text = h1.textContent.trim();
    h1.setAttribute("aria-label", text);
    h1.innerHTML = text
      .split(/\s+/)
      .map((w, i) => '<span class="w" aria-hidden="true"><span class="wi" style="--i:' + i + '">' + w + "</span></span>")
      .join(" ");
  }

  /* ---------- Typewriter ---------- */
  const typed = document.getElementById("typed");
  if (typed && !reduce) {
    const words = ["هوش مصنوعی", "ابزارهای ساخت تصویر", "ChatGPT و Gemini", "ابزارهای ساخت ویدیو", "تحلیل داده با AI"];
    let wi = 0;
    let ci = words[0].length;
    let deleting = true;
    typed.textContent = words[0];
    const tick = () => {
      const w = words[wi];
      ci += deleting ? -1 : 1;
      typed.textContent = w.slice(0, ci);
      let delay = deleting ? 35 : 75;
      if (!deleting && ci === w.length) {
        deleting = true;
        delay = 1500;
      } else if (deleting && ci === 0) {
        deleting = false;
        wi = (wi + 1) % words.length;
        delay = 350;
      }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2600);
  }

  /* ---------- Marquee ---------- */
  const track = document.querySelector(".marquee-track");
  if (track) track.innerHTML += track.innerHTML;

  /* ---------- Reveal on scroll ---------- */
  const targets =
    ".gap h2,.compare tbody tr,.aside,.ai h2,.ai-intro,.timeline li,.sources,.bridge," +
    ".classes h2,.classes-grid > div > p,.modules li,.register h2,.register-grid > div > p,.form";
  const revealEls = Array.from(document.querySelectorAll(targets));
  const seen = new Map();
  revealEls.forEach((el) => {
    el.setAttribute("data-reveal", "");
    if (el.matches(".compare tbody tr,.modules li")) {
      const n = seen.get(el.parentElement) || 0;
      seen.set(el.parentElement, n + 1);
      el.style.setProperty("--d", Math.min(n, 5) * 100 + "ms");
    }
  });

  function countUp(el) {
    const end = parseInt(el.getAttribute("data-year"), 10);
    if (!end || reduce) return;
    const start = end - 60;
    const t0 = performance.now();
    const dur = 1000;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = faNum.format(Math.round(start + (end - start) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  document.querySelectorAll(".timeline .year").forEach((el) => {
    const m = toEnglishDigits(el.textContent.trim()).match(/^\d{4}$/);
    if (m) el.setAttribute("data-year", m[0]);
  });

  function show(el) {
    el.classList.add("in");
    const y = el.querySelector && el.querySelector(".year[data-year]");
    if (y) countUp(y);
  }

  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Scroll progress and timeline line ---------- */
  const timeline = document.querySelector(".timeline");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    doc.style.setProperty("--sp", max > 0 ? clamp(window.scrollY / max, 0, 1).toFixed(4) : 0);
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.62 - r.top) / r.height, 0, 1);
      timeline.style.setProperty("--tp", p.toFixed(4));
    }
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Diploma tilt ---------- */
  const hero = document.querySelector(".hero");
  const art = document.querySelector(".art");
  const tilt = document.querySelector(".art-tilt");
  if (hero && art && tilt && !reduce && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      const r = art.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      tilt.style.setProperty("--ry", clamp(dx * 22, -12, 12).toFixed(2) + "deg");
      tilt.style.setProperty("--rx", clamp(-dy * 18, -10, 10).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", () => {
      tilt.style.setProperty("--ry", "0deg");
      tilt.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------- Neural network canvas ---------- */
  const cv = document.querySelector(".net");
  const aiSection = document.querySelector(".ai");
  if (cv && aiSection && !reduce) {
    const ctx = cv.getContext("2d");
    let w = 0;
    let h = 0;
    let nodes = [];
    let running = false;
    const mouse = { x: -1000, y: -1000 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 20000, 22, 72));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1.2 + Math.random() * 1.8,
        hot: Math.random() < 0.12,
      }));
    };

    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const D = 140;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < D) {
            ctx.strokeStyle = "rgba(255,255,255," + ((1 - d / D) * 0.32).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < 190) {
          ctx.strokeStyle = "rgba(255,210,63," + ((1 - dm / 190) * 0.7).toFixed(3) + ")";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.hot ? "#FFD23F" : "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.hot ? n.r + 0.8 : n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    };

    aiSection.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    aiSection.addEventListener("pointerleave", () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(aiSection);
    else window.addEventListener("resize", resize);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        const vis = entries[0].isIntersecting;
        if (vis && !running) {
          running = true;
          requestAnimationFrame(frame);
        } else if (!vis) {
          running = false;
        }
      }).observe(aiSection);
    } else {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) {
    try {
      yearEl.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
    } catch (e) {
      /* اگر مرورگر تقویم فارسی نداشت، همان مقدار پیش‌فرض می‌ماند */
    }
  }

  /* ---------- Registration form ---------- */
  const form = document.getElementById("register-form");
  const statusEl = document.getElementById("form-status");

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function shake(input) {
    const field = input.closest(".field");
    if (!field || reduce) return;
    field.classList.remove("shake");
    void field.offsetWidth;
    field.classList.add("shake");
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = form.elements.name.value.trim();
      const phone = toEnglishDigits(form.elements.phone.value.trim()).replace(/[\s-]/g, "");
      const level = form.elements.level.value;

      form.elements.name.removeAttribute("aria-invalid");
      form.elements.phone.removeAttribute("aria-invalid");

      if (name.length < 3) {
        form.elements.name.setAttribute("aria-invalid", "true");
        form.elements.name.focus();
        shake(form.elements.name);
        setStatus("نام و نام خانوادگی رو کامل بنویس.", true);
        return;
      }
      if (!/^(\+98|0098|0)?9\d{9}$/.test(phone)) {
        form.elements.phone.setAttribute("aria-invalid", "true");
        form.elements.phone.focus();
        shake(form.elements.phone);
        setStatus("شماره‌ی موبایل معتبر نیست. نمونه: 09123456789", true);
        return;
      }

      const message =
        "سلام، می‌خوام در کلاس‌های هوش مصنوعی ثبت‌نام کنم.\n" +
        "نام: " + name + "\n" +
        "شماره‌ی تماس: " + phone + "\n" +
        "سطح: " + level;

      if (!CONFIG.telegram) {
        setStatus("ثبت‌نام هنوز فعال نشده. لطفاً کمی بعد دوباره امتحان کن.", true);
        return;
      }

      try {
        await navigator.clipboard.writeText(message);
      } catch (e) {
        /* کپی در کلیپ‌بورد اختیاری است */
      }

      const url = "https://t.me/" + encodeURIComponent(CONFIG.telegram) + "?text=" + encodeURIComponent(message);
      window.open(url, "_blank", "noopener");
      setStatus("تلگرام باز شد. اگه پیام خودکار وارد نشد، همین متن کپی شده؛ فقط توی گفتگو بچسبون و بفرست.", false);
    });
  }

  /* ---------- helpers ---------- */
  function toEnglishDigits(value) {
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    const ar = "٠١٢٣٤٥٦٧٨٩";
    return value
      .replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
  }
})();
