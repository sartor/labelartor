<template>
  <!-- A flex row centres the graphics on the text, whatever the font metrics. -->
  <footer
    class="container-lg py-3 small text-body-secondary d-flex flex-wrap justify-content-center align-items-center gap-2"
  >
    <span>
      Made by Sartor.
      <a href="https://www.sternenkofund.org/en/donate" target="_blank" rel="noopener">
        Help Ukraine
      </a>
    </span>
    <!-- Drawn rather than the flag emoji, which Chrome and Edge on Windows show as the letters "UA". -->
    <svg width="15" height="10" viewBox="0 0 15 10" role="img" aria-label="Flag of Ukraine">
      <rect width="15" height="5" fill="#0057b7" />
      <rect y="5" width="15" height="5" fill="#ffd700" />
    </svg>
    <a
      href="https://github.com/sartor/labelartor"
      target="_blank"
      rel="noopener"
      class="link-secondary d-inline-flex"
      title="Source code"
      aria-label="Source code on GitHub"
    >
      <!-- GitHub mark from Primer Octicons (MIT). -->
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        />
      </svg>
    </a>
  </footer>
</template>
