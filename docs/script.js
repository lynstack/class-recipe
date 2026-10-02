const THEME_KEY = "theme";
const COPIED_DURATION = 1500;
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const desktopQuery = matchMedia("(min-width: 64rem)");
const root = document.documentElement;

const TOKEN_PATTERNS = {
  sh: /(?<comment>#.*$)|(?<function>^[\w-]+)/gm,
  ts: new RegExp(
    [
      String.raw`(?<comment>\/\/.*$|\/\*[\s\S]*?\*\/)`,
      String.raw`(?<string>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|` +
        "`(?:[^`\\\\]|\\\\.)*`)",
      String.raw`(?<keyword>\b(?:as|const|export|from|function|import|return|type|typeof)\b)`,
      String.raw`(?<literal>\b(?:true|false|null|undefined|\d+(?:\.\d+)?)\b)`,
      String.raw`(?<tag>(?<=return\s+<\/?)[a-z][\w-]*)`,
      String.raw`(?<type>\b[A-Z][\w$]*\b)`,
      String.raw`(?<function>\b[a-zA-Z_$][\w$]*(?=\())`,
      String.raw`(?<punctuation>[{}()[\];,.:=<>|&?/]+)`,
    ].join("|"),
    "gm",
  ),
};
TOKEN_PATTERNS.tsx = TOKEN_PATTERNS.ts;

function readStoredTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === "light" || theme === "dark" ? theme : null;
  } catch {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Without storage, the theme still applies until the page reloads.
  }
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  const toggle = document.querySelector(".theme-toggle");
  const label =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  toggle.setAttribute("aria-label", label);
  toggle.title = label;
}

function setUpTheme() {
  const systemTheme = () => (darkQuery.matches ? "dark" : "light");
  applyTheme(readStoredTheme() ?? systemTheme());
  document.querySelector(".theme-toggle").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    storeTheme(next);
    applyTheme(next);
  });
  darkQuery.addEventListener("change", () => {
    if (!readStoredTheme()) {
      applyTheme(systemTheme());
    }
  });
}

function setUpDrawer() {
  const button = document.querySelector(".menu-button");
  const sidebar = document.querySelector("#sidebar");
  const content = document.querySelector("#content");
  const isOpen = () => document.body.classList.contains("nav-open");

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    content.inert = open;
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    if (open) {
      sidebar.querySelector(".nav-link").focus({ preventScroll: true });
    }
  };

  button.addEventListener("click", () => setOpen(!isOpen()));
  document
    .querySelector(".scrim")
    .addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
  for (const link of document.querySelectorAll(".skip-link, .nav-link")) {
    link.addEventListener("click", () => setOpen(false));
  }
  desktopQuery.addEventListener("change", () => setOpen(false));
}

function setUpScrollSpy() {
  const links = new Map(
    [...document.querySelectorAll(".nav-link")].map((link) => [
      link.hash.slice(1),
      link,
    ]),
  );
  const markCurrent = (id) => {
    for (const [linkId, link] of links) {
      if (linkId === id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          markCurrent(entry.target.id);
        }
      }
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  for (const id of links.keys()) {
    const section = document.getElementById(id);
    if (section) {
      observer.observe(section);
    }
  }
}

function highlight(code) {
  const pattern = TOKEN_PATTERNS[code.dataset.lang];
  if (!pattern) {
    return;
  }
  const source = code.textContent;
  const fragment = document.createDocumentFragment();
  let index = 0;
  for (const match of source.matchAll(pattern)) {
    fragment.append(source.slice(index, match.index));
    const [kind] = Object.entries(match.groups).find(
      ([, value]) => value !== undefined,
    );
    const span = document.createElement("span");
    span.className = `token-${kind}`;
    span.textContent = match[0];
    fragment.append(span);
    index = match.index + match[0].length;
  }
  fragment.append(source.slice(index));
  code.replaceChildren(fragment);
}

function createIcon(path, className) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("class", `icon ${className}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const shape = document.createElementNS(namespace, "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

function createCopyButton(block) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button copy-button";
  button.setAttribute("aria-label", "Copy code");
  button.title = "Copy code";
  button.append(
    createIcon(
      "M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333zM4.012 16.737A2 2 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1",
      "icon-copy",
    ),
    createIcon("M5 12l5 5L20 7", "icon-check"),
  );

  const announcer = document.querySelector("#announcer");
  let timer;
  button.addEventListener("click", async () => {
    const code = block.querySelector("pre:not([hidden]) code");
    try {
      await navigator.clipboard.writeText(code.textContent);
    } catch {
      announcer.textContent = "Copy failed";
      return;
    }
    button.classList.add("is-copied");
    announcer.textContent = "Copied to clipboard";
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove("is-copied");
      announcer.textContent = "";
    }, COPIED_DURATION);
  });
  return button;
}

function setUpCodeBlocks() {
  for (const code of document.querySelectorAll("pre code[data-lang]")) {
    highlight(code);
  }
  for (const block of document.querySelectorAll(".code")) {
    block.querySelector(".code-head")?.append(createCopyButton(block));
  }
}

function selectTab(tabs, selected) {
  for (const tab of tabs) {
    const isSelected = tab === selected;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden =
      !isSelected;
  }
}

function setUpTabs() {
  for (const block of document.querySelectorAll("[data-tabs]")) {
    const tabs = [...block.querySelectorAll('[role="tab"]')];
    for (const [position, tab] of tabs.entries()) {
      tab.addEventListener("click", () => selectTab(tabs, tab));
      tab.addEventListener("keydown", (event) => {
        const targets = {
          ArrowLeft: tabs.at(position - 1),
          ArrowRight: tabs[(position + 1) % tabs.length],
          End: tabs.at(-1),
          Home: tabs[0],
        };
        const next = targets[event.key];
        if (next) {
          event.preventDefault();
          selectTab(tabs, next);
          next.focus();
        }
      });
    }
  }
}

setUpTheme();
setUpDrawer();
setUpScrollSpy();
setUpCodeBlocks();
setUpTabs();
