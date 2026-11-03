# Performance, milestone 2

Measured 3 November 2026 on the development machine (Apple silicon laptop, 120 Hz display) with the production build served by `vite preview`, in the desktop app's built-in browser. Use `?dev` on any address to see the same readout.

## Caveats

- The built-in browser pane is sometimes hidden or throttled, which lowers frame rates and delays the first frame. Frame rates below are what the pane reported while visible. Treat them as indicative, not certified.
- Not tried: a real phone. The phone-sized runs used a 406 x 652 viewport, which the vault detects as lite mode. Open the preview on a real phone over the local network before relying on the lite numbers.
- `vite preview` serves compressed files, so the download figures match gzip sizes below. GitHub Pages also compresses.

## Download size (cold load, gzip)

Everything needed before the corridor first renders, on a desktop load:

| Part                                                                    | Size                               |
| ----------------------------------------------------------------------- | ---------------------------------- |
| HTML, CSS, snapshot                                                     | 12 kB                              |
| App code (React, router, pages, intro)                                  | 94 kB                              |
| 3D chunk (three, React Three Fiber, scene)                              | 275 kB                             |
| Shared chunks                                                           | 6 kB                               |
| Fonts actually used (Inter 400 and 500 latin, JetBrains Mono 400 latin) | 69 kB                              |
| **Total before the corridor**                                           | **about 456 kB** (readout: 449 kB) |

Target: under 3 MB. Met with a wide margin. Other fonts ranges (Cyrillic, Greek, Vietnamese) download only if the text needs them. The share image is 13 kB and is not part of the page load.

## Frame rate and draw calls

Full mode, one reading per stop:

| Stop         | Draw calls | Triangles    |
| ------------ | ---------- | ------------ |
| Hall         | about 100  | about 24,000 |
| Crew gallery | about 112  | about 24,000 |
| Contact      | about 119  | about 17,000 |
| Crew door    | 28         | about 1,200  |

Frame rate: 60 to 134 fps reported across the walk. Target: 60 fps on a recent laptop. Met on this machine.

Lite mode (phone-sized viewport), one reading per stop: 36 to 53 draw calls, 8,400 to 14,800 triangles, 60 to 87 fps.

The automatic switch from full to lite when the frame rate stays under 30 fps for two seconds is covered by unit tests (`tests/vault.test.ts`), not by a live slow device.

## Gaps

- No measurement on a real phone or an older laptop yet.
- Draw calls in full mode are higher than needed because every beat's objects stay in the scene. Culling is automatic, but the reflective floor draws the scene a second time. Merging static geometry is the first thing to try if a slow device turns up.
- Total page weight with lazy parts (dev panel, fonts for other scripts) was not measured separately.

## Added in milestone 3

- Rooms load only when visited: the room chunk (2.3 kB gzip) and its three screenshots are fetched on entry, and a fresh load of the hall requests neither. Verified from the resource timing list in the browser.
- The 3D chunk shrank to about 39 kB gzip because the shared three.js code moved into a common chunk; the total before the corridor is unchanged to within a few kB.
- Gap: time to the first rendered frame is erratic in the built-in browser, from about 0.5 s to about 9 s on cold loads (shader compile time with many lights, and the pane being throttled). The intro stops waiting after 6 s so a slow device is never trapped behind it. Measure on a real laptop and phone before launch; if it persists, compile shaders earlier or reduce the number of lights.
