"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const genderInputs = document.querySelectorAll('input[name="gender"]');
  let previousValue = null;
  const checkedInput = document.querySelector('input[name="gender"]:checked');
  if (checkedInput) {
    previousValue = checkedInput.value;
  }
  genderInputs.forEach((input) => {
    input.addEventListener("click", function () {
      if (this.value === previousValue) {
        this.checked = false;
        previousValue = null;
      } else {
        previousValue = this.value;
      }
    });
  });
});

function uploadPhoto() {
  $("#photo").on("change", function (event) {
    const file = event.target.files[0];
    console.log(file);
    if (!file) {
      return;
    }

    const formData = new FormData($("#avatar-form")[0]);

    // Upload the photo via AJAX
    $.ajax({
      url: "/api/upload_pic",
      type: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (response) {
        if (response.status === "success") {
          $("#avatar-image").attr("src", "/api/media/" + response.filename);
          console.log(response);
        } else {
          let errorMsg = "Upload failed: ";
          if (response.errors) {
            for (let key in response.errors) {
              errorMsg += key + ": " + response.errors[key].join(", ") + "\n";
            }
          } else if (response.message) {
            errorMsg += response.message;
          }
          alert(errorMsg);
          console.log(response.errors);
        }
      },
      error: function (err) {
        console.log(err);
        alert("An error occurred.");
      },
    });
  });
}

$(function () {
  uploadPhoto();
});
