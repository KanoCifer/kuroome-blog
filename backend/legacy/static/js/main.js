document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("light-dark-mode");
  const sunIcon = document.getElementById("icon-sun");
  const moonIcon = document.getElementById("icon-moon");
  const htmlElement = document.documentElement;

  const setTheme = (isDark) => {
    if (isDark) {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
    } else {
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      sunIcon.classList.add("hidden");
      moonIcon.classList.remove("hidden");
    }
  };

  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    setTheme(true);
  } else {
    setTheme(false);
  }

  toggleBtn.addEventListener("click", () => {
    const isDark = htmlElement.classList.contains("dark");
    setTheme(!isDark);
  });

  const flashMessages = document.querySelectorAll(".alert");
  if (flashMessages.length > 0) {
    setTimeout(() => {
      flashMessages.forEach((msg) => {
        msg.style.opacity = "0";
        setTimeout(() => {
          msg.remove();
        }, 500);
      });
    }, 3000);
  }

  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.remove("opacity-0", "pointer-events-none");
        backToTopBtn.classList.add("opacity-100", "pointer-events-auto");
      } else {
        backToTopBtn.classList.add("opacity-0", "pointer-events-none");
        backToTopBtn.classList.remove("opacity-100", "pointer-events-auto");
      }
    });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
});

$(document).on("click", ".alert .close-icon", function () {
  $(this)
    .closest(".alert")
    .fadeOut(0, function () {
      $(this).remove();
    });
});

if (
  localStorage.getItem("theme") === "dark" ||
  (!("theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}
