# Cloudflare setup for Vaultrix

Goal: put Cloudflare in front of the site and the API so bots, floods and direct hits on your server are stopped before they reach the app. Everything below is done in the Cloudflare dashboard, not in code. Time: about 30 minutes. The free plan is enough for steps 1 to 6.

## 1. Add the domain
1. Create a Cloudflare account and choose Add a site. Enter your domain.
2. Pick the Free plan.
3. At your domain registrar, change the nameservers to the two Cloudflare gives you. Wait until Cloudflare says the site is Active.

## 2. Turn on the proxy
1. Open DNS. For the records that point to your frontend and your API, click the grey cloud so it turns orange (Proxied).
2. Under SSL/TLS, set the mode to Full (strict). Turn on Always Use HTTPS.

## 3. Tell the backend it is behind a proxy
This is required, otherwise every visitor looks like one IP and the rate limits hit everyone at once.
1. In your backend environment variables set `TRUST_PROXY=1`.
2. Restart the backend.
3. Check it: sign in, then open the admin security view. The IP shown should be your own, not a Cloudflare address.

## 4. Block AI bots and bad bots
1. Open Security, then Bots.
2. Turn on Block AI bots (and Bot Fight Mode on the free plan).
3. Open Security, then WAF, and make sure the Cloudflare Managed Ruleset is on.

## 5. Rate limiting rules (outer layer)
Open Security, then WAF, then Rate limiting rules. Add:
- Path contains `/api/auth/` : 30 requests per 1 minute per IP, action Block for 10 minutes.
- Path contains `/api/` : 600 requests per 1 minute per IP, action Managed Challenge.
Do not add a rule for `/api/admin`, the admin area has no limit by design.

## 6. Turnstile
Turnstile is already verified on the server for sign in. In the Cloudflare dashboard open Turnstile, add your domain, and put the site key in `VITE_TURNSTILE_SITE_KEY` and the secret in the backend environment.

## 7. Stop people bypassing Cloudflare (the direct origin)
Anyone who learns your server address can skip all of the above. Close that door:
1. At your host (firewall or security group), allow inbound web traffic only from Cloudflare's published IP ranges (https://www.cloudflare.com/ips/). Block the rest.
2. If your host cannot filter by IP, use Authenticated Origin Pulls: SSL/TLS, then Origin Server, then turn on Authenticated Origin Pulls, and make the host require the Cloudflare client certificate.
3. Test: open your server's raw address (not the domain) in a browser. It must not load.

## 8. Check it works
- Visit the site: it still loads, login works, Google sign in works.
- Run a second test from your phone on mobile data: no Too many tries message on normal use.
- Open Security, then Events in Cloudflare and watch for a day. If a real user is challenged by mistake, loosen the rule from step 5.
