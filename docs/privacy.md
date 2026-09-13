# Privacy

- No account.
- No telemetry.
- No required cloud.
- Atlas JSON lives in `localStorage` on this device.
- Named snapshots use a second local key. They never leave the browser.
- UI camera / filters use a third local key.
- Contacts (names, roles, phones) are stored only in the atlas JSON on this device.
- QR labels encode `atlas:<id>:<label>` as local text. Scanning does not call a server.
- Export files are created by you and stay on the device you save them to.
- Restoring a file never phones home; it is parsed in-process.

If you clear site data, the atlas is gone unless you exported it.
