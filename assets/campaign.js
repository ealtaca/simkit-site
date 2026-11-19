// Tells us which campaign a download came from, without cookies.
//
// A visit that arrives with ?utm_campaign=reddit-mcp (or ?ref=…) keeps that name for the
// browser tab's session. App Store buttons carry it to Apple as `ct`, so App Store
// Connect's App Analytics splits installs by campaign; clicks on the DMG and App Store
// buttons are counted in GoatCounter under the same name.
(function () {
    'use strict';

    // GoatCounter site code: the "simkit" of https://simkit.goatcounter.com. Empty: nothing is counted.
    var GOATCOUNTER = 'simkit';
    // App Store Connect provider token (`pt`). Apple ignores `ct` without it.
    var PROVIDER_TOKEN = '';

    var KEY = 'simkit.campaign';

    function clean(value) {
        // Apple takes up to 40 characters for ct.
        return (value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    }

    function campaign() {
        var params = new URLSearchParams(location.search);
        var fromURL = clean(params.get('utm_campaign') || params.get('ref') || params.get('utm_source'));
        try {
            if (fromURL) sessionStorage.setItem(KEY, fromURL);
            return fromURL || sessionStorage.getItem(KEY) || '';
        } catch (e) {
            return fromURL;
        }
    }

    var name = campaign();

    function isAppStore(link) { return link.hostname === 'apps.apple.com'; }
    function isDMG(link) { return /\.dmg$/.test(link.pathname); }

    // App Store links: the campaign replaces the page's own ct; the token makes Apple count it.
    Array.prototype.forEach.call(document.links, function (link) {
        if (!isAppStore(link)) return;
        var url = new URL(link.href);
        if (name) url.searchParams.set('ct', name);
        if (PROVIDER_TOKEN && url.searchParams.get('ct')) url.searchParams.set('pt', PROVIDER_TOKEN);
        link.href = url.toString();
    });

    if (!GOATCOUNTER) return;

    // No personal data: GoatCounter stores no cookie and no IP address.
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', 'https://' + GOATCOUNTER + '.goatcounter.com/count');
    document.head.appendChild(script);

    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a[href]');
        if (!link) return;
        var kind = isDMG(link) ? 'dmg' : isAppStore(link) ? 'appstore' : '';
        if (!kind || !window.goatcounter || !window.goatcounter.count) return;
        window.goatcounter.count({
            path: 'download-' + kind + '/' + (name || 'direct'),
            title: location.pathname,
            event: true
        });
    });
})();
