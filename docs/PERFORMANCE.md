# Performance

Measured on 3 November 2026 on the development machine (Apple silicon laptop) with the production build served by `vite preview`, in the desktop app's built-in browser, using `?dev`. Download sizes come from `npm run sizes`, which reads the built files, and are enforced by `tests/budget.test.ts`.

## Read this first: what these numbers can and cannot say

- The built-in browser pane throttles animation frames hard when it is not in front (about 1.5 frames a second at times), so **frame rate and time to first frame in this environment are not reliable**. Frame rates below are the smoothed figure the readout showed; the readout ignores very long frames on purpose, so a throttled pane can still show a high number.
- No real phone, no older laptop and no real GPU stress was tried. The phone-sized runs used a 406 by 652 viewport, which the vault treats as lite mode.
- Draw calls are counted per whole frame and include the second pass the reflective floor makes in full mode, so full mode roughly doubles what is on screen.

## Targets from the spec, and where we stand

The site is now two things: the bright site everyone sees first, and Explore in 3D (`?explore`) for those who ask. They are measured separately.

| Target                                                             | Result                                                                                                                                        | Verdict                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Under 3 MB downloaded before the page appears                      | Bright site: **about 253 kB** gzip. Explore adds about 282 kB more when opened (`npm run sizes`, enforced by `tests/budget.test.ts`)          | Met, with a wide margin                         |
| No 3D code on the bright site's first visit                        | A test fails if any first-visit file contains the WebGL renderer                                                                              | Met                                             |
| 60 fps on a recent laptop                                          | Explore: 65 to 96 fps reported at every stop in both modes. The bright site has no continuous 3D, apart from the avatars row once scrolled to | Met on this machine; unproven on other hardware |
| Lite mode when frame rate stays under 30 fps for 2 s, or low power | Explore only. Logic covered by unit tests; battery, memory, cores and save-data signals feed the choice                                       | Not exercised on a real slow device             |
| Each project room loaded only when visited                         | Explore: the room chunk and its screenshots load on entry                                                                                     | Met                                             |

## First visit to the bright site (gzip)

| Part                                                                | Size         |
| ------------------------------------------------------------------- | ------------ |
| HTML and snapshot                                                   | 4.6 kB       |
| App code and styles                                                 | 119.5 kB     |
| Fonts used (Fraunces, Inter 400 and 500, JetBrains Mono 400, Latin) | 128.5 kB     |
| **Total**                                                           | **252.5 kB** |

On demand, not part of the first visit: the 3D crew avatars (loaded only when the crew row scrolls into view, and skipped on low-memory, save-data or no-WebGL devices, which keep the initials badges), Explore in 3D (about 282 kB), project rooms, and the sound engine (0.5 kB).

## Scene cost per stop (Explore in 3D)

| Stop          | Full mode: draw calls, triangles   | Lite mode: draw calls, triangles |
| ------------- | ---------------------------------- | -------------------------------- |
| Entrance      | 80, 18,500                         | 38, 5,900                        |
| Hall          | about 230 to 350, 30,000 to 49,000 | 152, 24,600                      |
| Crew gallery  | about 218, 31,500                  | 107, 15,700                      |
| Contact       | about 84, 6,000                    | 19, 2,700                        |
| Crew door     | about 70, 1,700                    | 12, 600                          |
| Inside a room | about 36, 4,700                    | not measured                     |

Reading the table: the five busts are the heaviest thing in the scene. Each is about 35 small parts. Two measures already cut that: gallery and room busts use a half-smoothness version of the avatar, and a bust further than 38 m from the camera (deep in the fog) is not drawn. These halved the triangle count at the entrance from about 117,000 to 18,500.

## Gaps and what to try next

1. **Draw calls in the hall are higher than they need to be** (up to about 350 in full mode, mostly the busts, drawn twice because of the reflective floor). Next step if a real device struggles: merge each avatar's parts into a few meshes, or skip the floor reflection of the busts.
2. **Time to first frame is unproven.** It ranged from under a second to about nine in this environment, and the pane's frame throttling explains much of it. The intro stops waiting after 6 seconds so nobody is trapped, and the scene now reports ready after 2 rendered frames instead of 3. Measure on a real laptop and phone before launch.
3. **No real-device measurements.** Run the launch checklist's performance line on a recent laptop and a mid-range phone and write the numbers here.
4. The automatic drop to lite mode is only tested in unit tests.
