# LeadRadar Lessons

## Toolchain

- "Latest" is not always compatible. TypeScript 7.0.2 is published, but `ts-jest` and `typescript-eslint` both exclude it by peer range, so this repository is on 5.9.3. Re-derive the pin from peer ranges before upgrading rather than assuming the newest release works.

## Workspace wiring

- A new workspace under `packages/` is not linked into `node_modules` until `npm install` runs again. Creating the package and immediately typechecking fails with a misleading "cannot find module".
- Pointing a workspace's `paths` at another workspace's *source* conflicts with `rootDir`. Consume the built `dist` through the workspace link instead, and order builds with a `pre*` script.

## Testing against MongoDB

- `connect-mongo` creates its `sessions` collection through the raw driver, so it does not appear in `mongoose.connection.collections`. A test cleanup helper that iterates that map silently leaves sessions behind between tests. List collections from `connection.db.collections()` instead.
- `express-session` middleware built at app-construction time cannot read the Mongoose client yet, because the connection opens later. Resolve the client from the `connected` event rather than from `asPromise()`.

## Express 5

- Requiring `Content-Type: application/json` on every state-changing route breaks bodyless requests such as logout, which send no content type at all. Reject disallowed types instead of requiring the header.
