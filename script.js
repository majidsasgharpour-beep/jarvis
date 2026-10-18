// تنظیمات: آی‌دی تلگرام (بدون @) را اینجا بنویس تا فرم ثبت‌نام کار کند.
const CONFIG = {
  telegram: "",
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toEnglishDigits(value) {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

const yearEl = document.getElementById("year");
if (yearEl) {
  try {
    yearEl.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
  } catch (e) {
    /* اگر مرورگر تقویم فارسی نداشت، همان مقدار پیش‌فرض می‌ماند */
  }
}

const form = document.getElementById("register-form");
const statusEl = document.getElementById("form-status");

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", Boolean(isError));
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
      setStatus("نام و نام خانوادگی رو کامل بنویس.", true);
      return;
    }
    if (!/^(\+98|0098|0)?9\d{9}$/.test(phone)) {
      form.elements.phone.setAttribute("aria-invalid", "true");
      form.elements.phone.focus();
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
