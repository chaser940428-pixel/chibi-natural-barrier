# Sound effects / 音效素材

These third-party audio assets are dedicated to the public domain under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
They may be used, modified and redistributed, including in commercial games and
public source repositories. They are excluded from this project's reserved
rights over its original artwork and written content. No endorsement is implied.

以下音效為第三方 CC0 素材，可修改、商用及隨公開 GitHub 專案散布；
不適用本專案對原創美術及文字的保留權利聲明。

| Game file | Original file | Creator / source pack |
| --- | --- | --- |
| `move.wav` | `impactWood_light_000.ogg` | Kenney — Impact Sounds 1.0 |
| `capture.wav` | `impactWood_heavy_000.ogg` | Kenney — Impact Sounds 1.0 |
| `check.wav` | `impactBell_heavy_000.ogg` | Kenney — Impact Sounds 1.0 |
| `water.wav` | `splash_07.ogg` | rubberduck — 40 CC0 water / splash / slime SFX |
| `promotion.wav` | `jingles_PIZZI04.ogg` | Kenney — Music Jingles |
| `victory.wav` | `jingles_PIZZI10.ogg` | Kenney — Music Jingles |
| `defeat.wav` | `jingles_PIZZI01.ogg` | Kenney — Music Jingles |
| `draw.wav` | `jingles_PIZZI09.ogg` | Kenney — Music Jingles |

## Original sources

- Kenney: https://kenney.nl/assets/impact-sounds
- Kenney: https://kenney.nl/assets/music-jingles
- rubberduck: https://opengameart.org/content/40-cc0-water-splash-slime-sfx
- CC0 legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode

The original Kenney license notices are preserved alongside this file as
`LICENSE-Kenney-Impact.txt` and `LICENSE-Kenney-Jingles.txt`.
The rubberduck source page explicitly marks the water pack CC0.
Downloaded and checked on 2026-10-28.

## Processing

Source Ogg files were decoded to mono, 22,050 Hz, 16-bit PCM WAV for browser
compatibility. Leading/trailing silence and long tails were shortened, and short
fade-in/fade-out edges added. Move, capture and check were reprocessed on
2026-10-28 with a 0.5 ms attack fade, RMS gain and a smooth tanh limiter (peak
below 0.92) to retain the attack and make quiet samples audible. Other samples
retain peak normalization to at most 0.8. Playback gain is set separately for
each cue. The three ending jingles were reassigned after listening feedback.
No speech or background music is included.
