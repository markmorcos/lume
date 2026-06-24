/* eslint-disable no-undef */
/*
 * LUMÉ build dashboard.
 *
 * Fetches the repo's GitHub Releases live on every page load (same behaviour as
 * the shared build-tooling dashboard) — delete a release on github.com and it
 * disappears here on next refresh, no redeploy needed. The public Releases API
 * is unauthenticated (60/hr per IP); on a shared/mobile IP that can 403, in
 * which case we show a clear message and a link to the releases page.
 */
(function () {
  'use strict';

  var repo = 'markmorcos/lume';

  var els = {
    loading: document.getElementById('state-loading'),
    error: document.getElementById('state-error'),
    empty: document.getElementById('state-empty'),
    grid: document.getElementById('grid'),
    filters: document.getElementById('filters'),
  };

  fetch('https://api.github.com/repos/' + repo + '/releases?per_page=100', {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then(function (res) {
      if (res.status === 403)
        throw new Error('GitHub rate-limited this network (403). Open github.com/' + repo + '/releases, or try again later / on Wi-Fi.');
      if (res.status === 404)
        throw new Error('github.com/' + repo + ' is private or missing — the public Releases API returns 404.');
      if (!res.ok) throw new Error('GitHub API ' + res.status);
      return res.json();
    })
    .then(function (releases) {
      render(releases.map(parseRelease).filter(Boolean));
    })
    .catch(function (err) {
      console.error(err);
      showError((err && err.message) || 'Failed to load releases.');
    });

  function parseRelease(release) {
    if (!release || release.draft) return null;
    var tag = release.tag_name || '';
    var assets = release.assets || [];
    var apk = assets.find(function (a) { return /\.apk$/i.test(a.name); });
    var aab = assets.find(function (a) { return /\.aab$/i.test(a.name); });
    var asset = apk || aab;

    var profile = 'other';
    var when = release.published_at
      ? new Date(release.published_at)
      : new Date(release.created_at);
    var m = tag.match(/^local-build-(.+?)-(preview|development|production)-(\d{8})-(\d{6})$/);
    if (m) {
      profile = m[2];
      var d = m[3], t = m[4];
      var iso = d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8)+'T'+t.slice(0,2)+':'+t.slice(2,4)+':'+t.slice(4,6)+'Z';
      var p = new Date(iso);
      if (!isNaN(p.getTime())) when = p;
    }
    return {
      tag: tag,
      profile: profile,
      when: when,
      sha: release.target_commitish || '',
      kind: apk ? 'apk' : aab ? 'aab' : 'none',
      downloadUrl: asset ? asset.browser_download_url : release.html_url,
      releaseUrl: release.html_url,
    };
  }

  function render(builds) {
    els.loading.hidden = true;
    if (!builds.length) { els.empty.hidden = false; return; }
    builds.sort(function (a, b) { return b.when - a.when; });
    renderFilters(builds);
    els.grid.innerHTML = '';
    builds.forEach(function (b) { els.grid.appendChild(renderCard(b)); });
    els.grid.hidden = false;
  }

  function renderFilters(builds) {
    var counts = builds.reduce(function (acc, b) {
      acc[b.profile] = (acc[b.profile] || 0) + 1; acc.all++; return acc;
    }, { all: 0 });
    var buckets = ['all'].concat(['production','preview','development','other'].filter(function (k) { return counts[k] > 0; }));
    els.filters.innerHTML = '';
    buckets.forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill';
      btn.dataset.profile = key;
      btn.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
      btn.innerHTML = '<span>' + (key === 'all' ? 'All' : cap(key)) + '</span><span class="count">(' + counts[key] + ')</span>';
      btn.addEventListener('click', function () { applyFilter(key); });
      els.filters.appendChild(btn);
    });
  }

  function applyFilter(profile) {
    els.grid.querySelectorAll('.card').forEach(function (c) {
      c.classList.toggle('hidden', !(profile === 'all' || c.dataset.profile === profile));
    });
    els.filters.querySelectorAll('.filter-pill').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.profile === profile ? 'true' : 'false');
    });
  }

  function renderCard(b) {
    var li = document.createElement('li');
    li.className = 'card';
    li.dataset.profile = b.profile;

    var head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML =
      '<span class="card-profile card-profile-' +
      (['preview','development','production'].indexOf(b.profile) >= 0 ? b.profile : 'other') +
      '">' + b.profile + '</span><span class="card-time" title="' + b.when.toISOString() + '">' + rel(b.when) + '</span>';
    li.appendChild(head);

    var tag = document.createElement('div');
    tag.className = 'card-tag';
    tag.textContent = b.tag;
    li.appendChild(tag);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    if (b.sha) meta.innerHTML = '<a href="https://github.com/' + repo + '/commit/' + b.sha + '" target="_blank" rel="noopener">' + b.sha.slice(0,7) + '</a>';
    meta.innerHTML += '<a href="' + b.releaseUrl + '" target="_blank" rel="noopener">release</a>';
    li.appendChild(meta);

    var body = document.createElement('div');
    body.className = 'card-body';

    // QR only makes sense for an installable APK (you can't sideload an AAB).
    if (b.kind === 'apk') {
      var qr = document.createElement('div');
      qr.className = 'card-qr';
      qr.innerHTML = makeQr(b.downloadUrl);
      body.appendChild(qr);
    }

    var actions = document.createElement('div');
    actions.className = 'card-actions';
    var dl = document.createElement('a');
    dl.className = 'btn btn-primary';
    dl.href = b.downloadUrl;
    dl.textContent = b.kind === 'apk' ? 'Download APK' : b.kind === 'aab' ? 'Download AAB (Play)' : 'View release';
    actions.appendChild(dl);
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn';
    copy.textContent = 'Copy link';
    copy.addEventListener('click', function () { copyLink(b.downloadUrl, copy); });
    actions.appendChild(copy);
    body.appendChild(actions);

    li.appendChild(body);
    return li;
  }

  function makeQr(value) {
    if (typeof qrcode !== 'function') return '';
    var q = qrcode(0, 'M');
    q.addData(value);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function copyLink(text, btn) {
    var restore = btn.textContent;
    function flash(m) { btn.textContent = m; btn.classList.add('btn-toast'); setTimeout(function () { btn.textContent = restore; btn.classList.remove('btn-toast'); }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash('Copied'); }, function () { flash('Copy failed'); });
    } else { flash('Clipboard unavailable'); }
  }

  function rel(date) {
    var s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return s + 's ago';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24); if (d < 30) return d + 'd ago';
    return date.toISOString().slice(0, 10);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function showError(msg) { els.loading.hidden = true; els.error.hidden = false; els.error.textContent = msg; }
})();
