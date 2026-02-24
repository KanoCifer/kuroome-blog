function toggleReplyForm(commentId) {
  const $form = $("#reply-form-" + commentId);
  if ($form.length) {
    $form.toggleClass("hidden");
  }
}

$(function () {
  // 使用事件委托，确保动态内容也能响应
  $(document).on("click", ".reply-btn, .cancel-reply-btn", function (e) {
    e.preventDefault();
    const commentId = $(this).data("comment-id");
    toggleReplyForm(commentId);
  });
});
