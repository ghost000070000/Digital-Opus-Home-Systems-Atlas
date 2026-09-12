# Limitations

- Not a network simulator.
- Not mains-electrical design. Power sources are recorded dependencies, not circuits.
- Failure impact is only as good as the relationships you entered.
- Custom relations do not propagate failure.
- Canvas remains comfortable for a few hundred nodes; analysis is tested to 2000.
- Item images (data URLs) inflate JSON backups.
- localStorage is per-browser and per-origin. It is not a sync service.
- QR encoder supports short identifiers (versions 1–4, ECC M). Long notes will not fit.
