/**
 * AERO-TWIN — Shared Navigation & Theme Manager (Global)
 */
(function() {
  // ── Global Theme Manager ──────────────────────────────────────────────────
  window.AeroTheme = {
    get: function() { return 'light'; },
    set: function() {
      // Theme switching removed — always light
      localStorage.removeItem('aero_twin_theme');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.className = 'theme-light';
      if (document.body) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '').replace(/\bdark\b/g, '').trim() + ' theme-light';
      }
    },
    init: function() { this.set(); }
  };

  // Immediate theme application
  AeroTheme.init();

  var PAGES = [
    { id: 'overview',     label: 'OVERVIEW',       href: 'overview.html' },
    { id: 'digital-twin', label: 'DIGITAL TWIN',   href: 'digital-twin.html' },
    { id: 'engineer',     label: 'ENGINEER',        href: 'engineer.html' },
    { id: 'maintenance',  label: 'MAINTENANCE',     href: 'maintenance.html' },
    { id: 'replay',       label: 'MISSION REPLAY',  href: 'replay.html' }
  ];

  function getActivePage() {
    var path = window.location.pathname.toLowerCase();
    for (var i = 0; i < PAGES.length; i++) {
      if (path.indexOf(PAGES[i].href.replace('.html', '')) !== -1) return PAGES[i].id;
    }
    return 'overview';
  }

  window.AeroNav = {
    inject: function() {
      var activePage = getActivePage();

      var navEl = document.getElementById('aero-nav');

      if (navEl) {
        navEl.className = 'nav-bar';
        var links = '';
        for (var i = 0; i < PAGES.length; i++) {
          var p = PAGES[i];
          links += '<a href="' + p.href + '" class="nav-link ' + (p.id === activePage ? 'active' : '') + '">' + p.label + '</a>';
        }
        navEl.innerHTML = '<div class="nav-inner">' +
          '<div class="flex items-center gap-4">' +
            '<a href="index.html" class="nav-brand"><span class="nav-brand-name">AERO-TWIN</span><span class="nav-brand-badge">DIGITAL TWIN</span></a>' +
            '<div style="width:1px;height:16px;background:var(--at-panel-border)"></div>' +
            '<nav class="nav-links">' + links + '</nav>' +
          '</div>' +
          '<div class="nav-right">' +
            '<div class="nav-meta-badge" id="nav-asset-badge">--</div>' +
            '<div id="nav-connection-badge" class="badge badge-disconnected"><span class="pulse-dot caution"></span><span id="nav-connection-text">DISCONNECTED</span></div>' +
            '<div class="nav-meta-badge" id="nav-utc-clock">' + AeroUtils.utcNow() + '</div>' +
          '</div>' +
        '</div>';
      }

      var bannerEl = document.getElementById('aero-connection-banner');
      if (bannerEl) { bannerEl.className = 'connection-banner'; bannerEl.id = 'connection-banner'; }

      var infoEl = document.getElementById('aero-info-bar');
      if (infoEl) {
        infoEl.className = 'info-bar';
        infoEl.innerHTML = '<div class="info-bar-inner"><div class="info-bar-meta">' +
          '<div><strong>ASSET:</strong> <span id="info-asset">--</span></div>' +
          '<div><strong>ENGINE TYPE:</strong> AERO-PISTON (HORIZONTALLY-OPPOSED 4-CYL)</div>' +
          '<div><strong>MISSION:</strong> <span id="info-mission">ISR ENDURANCE CRUISE</span></div>' +
        '</div><div class="flex items-center gap-3">' +
          '<div class="flex items-center gap-1.5">' +
            '<span style="font-size:9px;color:var(--at-secondary);font-weight:700;letter-spacing:.05em">SCENARIO:</span>' +
            '<select id="global-scenario-select" onchange="if(window.AeroWS) window.AeroWS.setScenario(this.value);" style="font-size:10px;font-family:var(--font-mono);font-weight:700;padding:2px 8px;border-radius:4px;border:1px solid var(--at-panel-border);background:var(--at-panel-white);color:var(--at-graphite);cursor:pointer;outline:none;">' +
              '<option value="healthy">HEALTHY (NOMINAL CRUISE)</option>' +
              '<option value="lubrication">LUBRICATION FAILURE</option>' +
              '<option value="misfire">MISFIRE (CYL 3)</option>' +
              '<option value="sensor_drift">SENSOR DRIFT (OIL T)</option>' +
              '<option value="cooling">COOLING DEGRADATION</option>' +
              '<option value="intake">INTAKE RESTRICTION</option>' +
              '<option value="electrical">ELECTRICAL FAULT</option>' +
              '<option value="cycle">AUTO CYCLE ALL</option>' +
            '</select>' +
          '</div>' +
          '<span class="font-mono text-xs text-secondary" id="info-schema">--</span>' +
        '</div></div>';
      }

      var footerEl = document.getElementById('aero-footer');
      if (footerEl) {
        footerEl.className = 'page-footer';
        footerEl.innerHTML = '<div class="footer-inner"><div class="flex items-center gap-4">' +
          '<strong style="color:var(--at-graphite)">AERO-TWIN DIGITAL TWIN SYSTEM</strong>' +
          '<span>TAPAS-BH-201 | AERO-PISTON ENGINE</span>' +
        '</div><div class="flex items-center gap-4">' +
          '<a href="index.html">HOMEPAGE</a><span>•</span><span>SIH 26054</span>' +
        '</div></div>';
      }

      setInterval(function() {
        var el = document.getElementById('nav-utc-clock');
        if (el) el.innerText = AeroUtils.utcNow();
      }, 1000);

      AeroState.subscribe(function(state) {
        var assetEl = document.getElementById('nav-asset-badge');
        if (assetEl) assetEl.innerText = state.engineId ? state.engineId + ' / ' + (state.flightId || '--') : '--';

        var infoAsset = document.getElementById('info-asset');
        if (infoAsset) infoAsset.innerText = state.engineId ? state.engineId + ' / ' + (state.flightId || '--') : '--';

        var schemaEl = document.getElementById('info-schema');
        if (schemaEl) schemaEl.innerText = state.schemaVersion ? 'SCHEMA v' + state.schemaVersion : '';

        // Sync global scenario selector if flightId changed
        var scSelect = document.getElementById('global-scenario-select');
        if (scSelect && state.flightId) {
          var fid = state.flightId.toLowerCase();
          ['lubrication', 'misfire', 'sensor_drift', 'cooling', 'intake', 'electrical', 'healthy'].forEach(function(sc) {
            if (fid.indexOf(sc) !== -1 && scSelect.value !== sc) {
              scSelect.value = sc;
            }
          });
        }

        var connBadge = document.getElementById('nav-connection-badge');
        var connText = document.getElementById('nav-connection-text');
        if (connBadge && connText) {
          var dot = connBadge.querySelector('.pulse-dot');
          switch (state.connectionState) {
            case 'CONNECTED':
              connBadge.className = 'badge badge-live'; connText.innerText = 'BACKEND | CONNECTED';
              if (dot) dot.className = 'pulse-dot nominal'; break;
            case 'SIMULATION':
              connBadge.className = 'badge badge-live'; connText.innerText = 'SIMULATION | LOCAL';
              if (dot) dot.className = 'pulse-dot nominal'; break;
            case 'RECONNECTING':
              connBadge.className = 'badge badge-disconnected'; connText.innerText = 'RECONNECTING...';
              if (dot) dot.className = 'pulse-dot caution'; break;
            case 'REPLAY':
              connBadge.className = 'badge badge-replay'; connText.innerText = 'REPLAY MODE';
              if (dot) dot.className = 'pulse-dot nominal'; break;
            default:
              connBadge.className = 'badge badge-disconnected'; connText.innerText = 'DISCONNECTED';
              if (dot) dot.className = 'pulse-dot caution';
          }
        }

        var banner = document.getElementById('connection-banner');
        if (banner) {
          if (state.connectionState === 'RECONNECTING') { banner.className = 'connection-banner reconnecting'; banner.innerText = '⚠ RECONNECTING TO TELEMETRY STREAM...'; }
          else { banner.className = 'connection-banner'; }
        }
      });
    }
  };
})();
