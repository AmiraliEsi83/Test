# Extract HARSI into AmiraliEsi83/harsi-trading

The Cursor GitHub App can only push to `AmiraliEsi83/Test`. You must create the dedicated repository from your account.

## 1. Create the empty repository

On GitHub: **New repository** → `harsi-trading` → Public → do **not** add a README.

Or:

```bash
gh repo create AmiraliEsi83/harsi-trading --public --description "HARSI AI trading terminal"
```

## 2. Push this tree as the new main

From a clone of this branch (after pulling the PR branch `cursor/harsi-production-platform-70e9`):

```bash
git clone https://github.com/AmiraliEsi83/Test.git harsi-src
cd harsi-src
git checkout cursor/harsi-production-platform-70e9
git remote add harsi https://github.com/AmiraliEsi83/harsi-trading.git
git push -u harsi HEAD:main
```

## 3. Do not merge this into Test/main

`main` on Test is the portfolio. Keep it that way.

## 4. Deploy

Follow the README deployment section. After Vercel/Railway are connected, replace this URL:

```text
https://harsi-trading.vercel.app   # example — assigned by your host
```

GitHub Pages (`https://amiraliesi83.github.io/harsi-trading/`) is only valid for a static export, which this app is not.
