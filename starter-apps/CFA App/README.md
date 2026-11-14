# CFA App — Starter App

The general-purpose CFA starting point: a small Home and Settings tab app with
complete View → ViewModel → Feature routes, AppModel composition, a persisted
appearance preference, and focused Swift Testing coverage.

Start a new named copy from the toolkit root:

```sh
node scripts/create-cfa-project.mjs --starter app --name MyApp --out ./MyApp
```

Replace the Home feature with the product's first real user journey. Keep the
Settings slice when it remains useful, and add new tabs only when the product
needs top-level navigation. This is starter infrastructure, not a finished
branded App Store product.
