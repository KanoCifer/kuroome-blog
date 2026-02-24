import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

/**
 * Tiptap Editor for ReadingList blog post editor.
 * Replaces EasyMDE with a rich-text WYSIWYG editor.
 */

import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

document.addEventListener("DOMContentLoaded", function () {
  const editorElement = document.getElementById("tiptap-editor");
  const hiddenInput = document.getElementById("editor");
  if (!editorElement || !hiddenInput) return;

  // Load initial content from hidden textarea
  const initialContent = hiddenInput.value || "";

  const editor = new Editor({
    element: editorElement,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        enableTabIndentation: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "tiptap-link" },
      }),
      Image.configure({
        HTMLAttributes: { class: "tiptap-image" },
      }),
      Placeholder.configure({
        placeholder: "Write your post content here...",
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] px-6 py-4",
      },
    },
    onUpdate({ editor }) {
      hiddenInput.value = editor.getHTML();
    },
  });

  // Sync on form submit
  const form = document.getElementById("post-form");
  if (form) {
    form.addEventListener("submit", () => {
      hiddenInput.value = editor.getHTML();
    });
  }

  setupToolbar(editor);
});

function setupToolbar(editor) {
  // Map button data-action to editor commands
  const actions = {
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    strike: () => editor.chain().focus().toggleStrike().run(),
    code: () => editor.chain().focus().toggleCode().run(),
    h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    h4: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    paragraph: () => editor.chain().focus().setParagraph().run(),
    bulletList: () => editor.chain().focus().toggleBulletList().run(),
    orderedList: () => editor.chain().focus().toggleOrderedList().run(),
    blockquote: () => editor.chain().focus().toggleBlockquote().run(),
    codeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
    horizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
    alignLeft: () => editor.chain().focus().setTextAlign("left").run(),
    alignCenter: () => editor.chain().focus().setTextAlign("center").run(),
    alignRight: () => editor.chain().focus().setTextAlign("right").run(),
    link: () => {
      const previousUrl = editor.getAttributes("link").href;
      const url = window.prompt("Enter URL:", previousUrl || "https://");
      if (url === null) return; // cancelled
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      }
    },
    image: () => {
      const url = window.prompt("Enter image URL:", "https://");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    undo: () => editor.chain().focus().undo().run(),
    redo: () => editor.chain().focus().redo().run(),
    clearFormat: () =>
      editor.chain().focus().clearNodes().unsetAllMarks().run(),
  };

  // Active state checkers
  const activeChecks = {
    bold: () => editor.isActive("bold"),
    italic: () => editor.isActive("italic"),
    underline: () => editor.isActive("underline"),
    strike: () => editor.isActive("strike"),
    code: () => editor.isActive("code"),
    h1: () => editor.isActive("heading", { level: 1 }),
    h2: () => editor.isActive("heading", { level: 2 }),
    h3: () => editor.isActive("heading", { level: 3 }),
    h4: () => editor.isActive("heading", { level: 4 }),
    paragraph: () => editor.isActive("paragraph"),
    bulletList: () => editor.isActive("bulletList"),
    orderedList: () => editor.isActive("orderedList"),
    blockquote: () => editor.isActive("blockquote"),
    codeBlock: () => editor.isActive("codeBlock"),
    alignLeft: () => editor.isActive({ textAlign: "left" }),
    alignCenter: () => editor.isActive({ textAlign: "center" }),
    alignRight: () => editor.isActive({ textAlign: "right" }),
  };

  // Bind click handlers
  document.querySelectorAll("[data-action]").forEach((btn) => {
    const action = btn.dataset.action;
    if (actions[action]) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        actions[action]();
      });
    }
  });

  editor.on("transaction", () => {
    document.querySelectorAll("[data-action]").forEach((btn) => {
      const action = btn.dataset.action;
      if (activeChecks[action]) {
        btn.classList.toggle("is-active", activeChecks[action]());
      }
    });
  });
}
