export function BasicFooter() {
  return (
    // Footer
    <footer className="transition-colors duration-1000">
      <p>Copyright &copy; 2026 All Rights Reserved.</p>
      <div className="flex items-end justify-center">
        <a
          href="https://github.com/KanoCifer/Flask-Example"
          aria-label="Kuroome on GitHub"
          className="hover:opacity-90"
          target="_blank"
        >
          <img
            alt="Powered by Flask"
            src="https://github.githubassets.com/favicons/favicon.svg"
            className="cover aspect-square w-6 object-cover align-bottom"
          />
        </a>
        <a
          className="hover:underline"
          href="https://github.com/KanoCifer/Flask-Example "
          target="_blank"
        >
          &nbsp;Github: KanoCifer
        </a>
        <a
          className="hover:underline"
          href="https://beian.miit.gov.cn/#/Integrated/index"
          target="_blank"
        >
          &nbsp;粤ICP备2026018113号
        </a>
      </div>
    </footer>
  );
}
