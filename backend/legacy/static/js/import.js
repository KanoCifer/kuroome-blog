function ImportBooks() {
  $("#submit-button").on("click", function (e) {
    e.preventDefault();

    const formData = $(this).closest("form").serialize();
    // AJAX提交表单
    $.ajax({
      url: "/import",
      type: "POST",
      data: formData,
      success: function (response) {
        if (response.status === "success") {
          alert("Successfully imported " + response.imported_count + " books.");
        } 
        if (response.status === "fail") {
          alert("Import failed. Reason: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        var msg = "Unknown error";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          msg = xhr.responseJSON.message;
        }
        alert("Error: " + msg);
      },
    });
  });
}

$(document).ready(function () {
  ImportBooks();
});
