$(document).ready(function () {
  let page = 1;
  const loadMoreBtn = $("#load-more-btn");
  const bookList = $("#user-book-list");
  const loadingSpinner = $("#loading-spinner");
  const btnText = $("#btn-text");

  const showFlash = (message) => {
    const flashContainer = $("#flash-messages");
    const flashHtml = `
      <div class="alert flex items-center justify-between rounded-xl bg-blue-100/20 p-4 text-blue-700 shadow-2xl backdrop-blur-sm transition-opacity duration-500 ease-in-out select-none dark:bg-blue-900/50 dark:text-blue-200">
        <span class="align-middle">${message}</span>
        <div class="close-icon cursor-pointer rounded-lg p-1 hover:bg-blue-200/50 dark:hover:bg-blue-700/50">
          <svg class="inline-block text-blue-500 dark:text-blue-200" width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 8L40 40" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 40L40 8" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;
    const $flash = $(flashHtml);
    flashContainer.append($flash);

    setTimeout(() => {
      $flash.fadeOut(500, function () {
        $(this).remove();
      });
    }, 3000);
  };

  loadMoreBtn.on("click", function () {
    page++;
    loadMoreBtn.prop("disabled", true);
    btnText.addClass("hidden");
    loadingSpinner.removeClass("hidden");

    $.ajax({
      url: "/api/load-more",
      data: { page: page },
      method: "GET",
      success: function (response) {
        if (response.html) {
          bookList.append(response.html);
        }
        if (!response.has_next) {
          loadMoreBtn.hide();
        }
      },
      error: function () {
        alert("Failed to load more books.");
      },
      complete: function () {
        loadMoreBtn.prop("disabled", false);
        btnText.removeClass("hidden");
        loadingSpinner.addClass("hidden");
      },
    });
  });

  bookList.on("submit", ".delete-form", function (e) {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this book?")) {
      return;
    }

    const form = $(this);
    const listItem = form.closest("li");
    const url = form.attr("action");

    $.ajax({
      url: url,
      method: "POST",
      data: form.serialize(),
      success: function (response) {
        if (response.status === "success") {
          showFlash(response.message || "Item deleted.");
          listItem.fadeOut(300, function () {
            $(this).remove();
          });
        } else {
          showFlash(response.message || "Failed to delete item.");
        }
      },
      error: function (xhr) {
        const errorMsg = xhr.responseJSON?.message || "Failed to delete item.";
        alert(errorMsg);
      },
    });
  });
});
