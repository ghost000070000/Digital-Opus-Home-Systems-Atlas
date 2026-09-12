# Privacy

- No account.
- No telemetry.
- No required cloud.
- Atlas JSON lives in `localStorage` on this device.
- UI camera / filters use a second local key.
- QR labels encode `atlas:<id>:<label>` as local text. Scanning does not call a server.
- Export files are created by you and stay on the device you save them to.
- Restoring a file never phones home; it is parsed in-process.

If you clear site data, the atlas is gone unless you exported it.
