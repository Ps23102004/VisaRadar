(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarNav = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  var NAV_LINKS = [
    { href: 'app.html#browse',    label: 'Browse' },
    { href: 'app.html#check',     label: 'Check' },
    { href: 'byok.html',          label: 'Bring your key' },
    { href: 'app.html#journey',   label: 'My Journey' },
    { href: 'app.html#checklist', label: 'Checklist' },
    { href: 'guide.html',         label: 'Apply Yourself' },
    { href: 'install.html',       label: 'Install' },
    { href: 'mcp.html',           label: 'MCP' }
  ];
  var pointerTrackingAttached = false;

  function renderNav(currentHref){
    var links = NAV_LINKS.map(function(l){
      var isCurrent = l.href === currentHref;
      return '<a href="' + l.href + '"' +
        (isCurrent ? ' class="current" aria-current="page"' : '') +
        '>' + l.label + '</a>';
    }).join('\n      ');

    return '<header class="nav">\n' +
      '  <a class="logo" href="app.html#browse" aria-label="VisaRadar home">VisaRadar<span class="dot"></span></a>\n' +
      '  <nav class="nav-links" aria-label="Primary">\n      ' + links + '\n  </nav>\n' +
      '</header>';
  }

  function mountNav(currentHref){
    var mount = document.querySelector('.nav-mount');
    if (mount) mount.innerHTML = renderNav(currentHref);
    if (!pointerTrackingAttached){
      pointerTrackingAttached = true;
      document.addEventListener('mousemove', function(e){
        document.documentElement.style.setProperty('--mx', e.clientX + 'px');
        document.documentElement.style.setProperty('--my', e.clientY + 'px');
      }, { passive: true });
    }
  }

  return { NAV_LINKS: NAV_LINKS, renderNav: renderNav, mountNav: mountNav };
});
