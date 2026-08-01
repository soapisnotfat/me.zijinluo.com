# Hosting plan: GitHub Pages + Cloudflare

The production site lives at the repository root. The workflow at
`.github/workflows/pages.yml` uploads the root directly to GitHub Pages. It
deploys automatically whenever `master` changes, and can also be run manually.

## Architecture

```text
visitor
  -> me.zijinluo.com
  -> Cloudflare DNS / optional proxy
  -> soapisnotfat.github.io
  -> GitHub Pages artifact from the repository root
```

The custom-domain record must point to `soapisnotfat.github.io`, not to the
repository name or a GitHub repository URL.

## Safe activation order

Do these only after the design and copy are approved.

1. Commit and push the selected site and Pages workflow to `master`.
2. In the personal GitHub account settings, open **Pages**, add
   `zijinluo.com` as a verified domain, and copy GitHub's generated TXT value.
3. In Cloudflare DNS, add the generated TXT verification record. Keep it after
   verification to retain domain-takeover protection.
4. In the repository settings, open **Pages** and select **GitHub Actions** as
   the publishing source.
5. Confirm **Deploy personal site to GitHub Pages** succeeds. Every push to
   `master` triggers it automatically; it can also be rerun manually.
6. In the repository Pages settings, set the custom domain to
   `me.zijinluo.com` before pointing DNS at GitHub.
7. In Cloudflare DNS, create this record:

   | Type | Name | Target | TTL | Initial proxy status |
   | --- | --- | --- | --- | --- |
   | CNAME | `me` | `soapisnotfat.github.io` | Auto | DNS only |

8. Confirm the CNAME resolves, wait for GitHub's certificate, then enable
   **Enforce HTTPS** in the repository Pages settings.
9. After GitHub HTTPS is healthy, Cloudflare proxying can be evaluated. Starting
   DNS-only keeps certificate provisioning and origin diagnosis simple. If the
   orange-cloud proxy is enabled later, use Cloudflare SSL/TLS mode **Full
   (strict)** and do not add redirect rules that loop with GitHub's HTTPS
   enforcement.
10. Future site changes deploy automatically after they reach `master`.

## Verification

```sh
dig me.zijinluo.com CNAME +short
curl -I https://me.zijinluo.com/
curl -I https://me.zijinluo.com/about/
curl -I https://me.zijinluo.com/thoughts/
```

Expected CNAME target: `soapisnotfat.github.io.` All three HTTP requests should
settle on `200` after any HTTPS redirect.

## Important constraints

- Do not create a wildcard DNS record for this setup.
- Do not point `me.zijinluo.com` at `zijinluo.com`; GitHub warns that this can
  break HTTPS and routing for the custom subdomain.
- A custom Actions workflow ignores a repository `CNAME` file. The custom
  domain is stored in the repository Pages settings.
- GitHub Pages is public even when the repository itself is private.
