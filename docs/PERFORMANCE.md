# Performance

Measured on 3 November 2026 on the development machine (Apple silicon laptop) with the production build, in the desktop app's built-in browser. Download sizes come from `npm run sizes`, which reads the built files, and are enforced by `tests/budget.test.ts`.

## Read this first: what these numbers can and cannot say

- The built-in browser pane throttles animation frames when it is not in front, so **smoothness of animation and frame rate cannot be certified here**. The behaviour was verified by sampling states (scroll positions, the page wipe's timeline, the stacking panels' cover values, characters' gaze values), not by watching fluid motion. Final feel needs your eyes in a real browser.
- No real phone, no older laptop and no real GPU stress was tried.

## Targets from the spec

| Target                                        | Result                                                                                                                                                                                      | Verdict                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Under 3 MB downloaded before the page appears | About **311 kB** gzip, and a test fails above 500 kB                                                                                                                                        | Met, with a wide margin               |
| No 3D code in the public site                 | A test fails if any first-visit file contains the WebGL renderer or the backend client                                                                                                      | Met                                   |
| 60 fps on a recent laptop                     | There is no continuous GPU work. Motion is transforms and opacity only, driven by the `motion` library and Lenis; only the marquee and the characters' small idle animations run constantly | Plausible; unproven on other hardware |
| Every effect off for reduced motion           | Verified: no smooth scroll, cursor, split words, magnetism, scrolling marquee, intro or page wipe; content fully visible                                                                    | Met                                   |

## First visit (gzip)

| Part                                                                | Size         |
| ------------------------------------------------------------------- | ------------ |
| HTML and snapshot                                                   | 7.1 kB       |
| App code and styles (React, `motion`, Lenis, the site)              | 175.6 kB     |
| Fonts used (Fraunces, Inter 400 and 500, JetBrains Mono 400, Latin) | 128.5 kB     |
| **Total**                                                           | **311.2 kB** |

After batch 9 (Launchpad, achievements, Elements, 3D renders) the first visit measured 315.9 kB. The Blender renders are lazy-loaded WebP files of 10 to 19 kB each, and the hero mark is about 19 kB.

For comparison, the retired 3D vault added about 282 kB more and drew hundreds of calls per frame; its removal is the single biggest performance change.

## Gaps and what to try next

1. **Judge the feel in a real browser.** Smooth scrolling, the stacking panels and the page wipe are the three things most affected by real frame rates.
2. **No real-device measurements.** Run the launch checklist's performance line on a recent laptop and a mid-range phone and write the numbers here.
3. **Fonts are the largest part of the download** (128 kB). Subsetting Fraunces to the characters used would save about half, if it ever matters.
