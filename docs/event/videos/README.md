# Video mirrors

Mirrored with [`inbox/notion-export/mirror_video.py`](../../inbox/notion-export/mirror_video.py), which wraps yt-dlp and regroups the caption cues into readable paragraphs:

```bash
python3 inbox/notion-export/mirror_video.py <url-or-id> resources/videos/<slug>
```

## The two mirrors hold the same talk

Read this before using either. There is **one** Innovation Labs talk here, kept in two forms:

1. `ux-customer-discovery/` - the whole 57:12 talk in one file.
2. The other 15 folders - playlist `PLRXTREYLEfAc`, the same talk cut into chapters of 25 seconds to 9 minutes.

They are duplicates, kept on purpose: the long file when you want the argument end to end, a chapter when you want one idea.

**Evidence.** The long video carries YouTube chapter marks, and there are 15 of them - one per clip, each the length of its clip. [CHAPTERS.md](CHAPTERS.md) lays them side by side. Supporting numbers: the playlist runs 57:22 against the talk's 57:12, and the chapter transcripts total 8,829 words against the talk's 8,958 (98.6%).

**Use [CHAPTERS.md](CHAPTERS.md) to navigate.** It turns the 57-minute transcript into 15 topics: each row gives a timestamp to search for in `ux-customer-discovery/transcript.md` and a link to the matching clip.

## Chapters

| #   | Chapter                             | Length | Transcript |
| --- | ----------------------------------- | ------ | ---------- |
| 1   | introduction                        | 1:31   | 251 w      |
| 2   | why-startups-fail                   | 3:44   | 630 w      |
| 3   | ux-user-experience                  | 7:41   | 1,195 w    |
| 4   | where-ai-fits-in-ux                 | 1:50   | 258 w      |
| 5   | customer-discovery                  | 3:54   | 612 w      |
| 6   | hypotheses                          | 3:56   | 653 w      |
| 7   | what-discovery-gets-you             | 3:33   | 579 w      |
| 8   | customer-interviews                 | 4:26   | 679 w      |
| 9   | tips-for-customer-interviews        | 8:57   | 1,407 w    |
| 10  | where-ai-fits-in-customer-discovery | 2:16   | 342 w      |
| 11  | experiments                         | 6:13   | 860 w      |
| 12  | where-ai-fits-in-experiments        | 1:13   | 168 w      |
| 13  | jobs-to-be-done                     | 2:02   | 311 w      |
| 14  | user-personas                       | 5:41   | 823 w      |
| 15  | conclusion                          | 0:25   | 61 w       |

Chapters 9 to 15 are not linked from the Notion page, which lists only the first eight.

### What each folder holds

**Only `ux-customer-discovery/` holds an `.mp4`.** The 15 chapter clips were deleted on 2026-09-11: they are the same footage as the long file, which knows where every chapter starts and ends. Cut any of them back out in about a second, no download and no quality loss:

```bash
python3 inbox/notion-export/cut_chapter.py              # list the chapters
python3 inbox/notion-export/cut_chapter.py hypotheses   # cut one
python3 inbox/notion-export/cut_chapter.py all          # cut all 15
```

The text was kept for every chapter, so nothing you would read or search is gone - only bytes that were sitting on disk twice.

| File               | Where          | Keep it?                                                                                                                       |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `<slug>.mp4`       | long talk only | 108 MB. The 15 chapter clips are cut from it on demand.                                                                        |
| `transcript.md`    | every folder   | What you read: paragraphs stamped every ~45s.                                                                                  |
| `<slug>.en.vtt`    | every folder   | The per-cue timings, 888 KB total. Keep it - it is the only exact-phrase index, and the source to regenerate transcripts from. |
| `<slug>.info.json` | every folder   | Slimmed on 2026-09-11 from 8.4 MB to 64 KB.                                                                                    |
| `<slug>.webp`      | every folder   | Thumbnail.                                                                                                                     |

The `.info.json` files arrived at ~540 KB each, but 461 KB of that was an `automatic_captions` index and 42 KB a `formats` list - both nothing but URLs that expire within hours. Only the durable fields were kept, `chapters` and `description` among them, which is where [CHAPTERS.md](CHAPTERS.md) comes from. To pull the full metadata back for one video:

```bash
yt-dlp --write-info-json --skip-download <video-id>
```

Total on disk: 111 MB - 108 MB of it the single video file.

## UX & Customer Discovery

The "video version" of the [UX & Customer Discovery](../notion/innovation-labs-academy/ux-customer-discovery.md) theory page in the Innovation Labs knowledge base.

- **Source:** https://www.youtube.com/watch?v=8mKsZKB4Pnc
- **Channel:** Innovation Labs - 57:12, uploaded 1 September 2026
- **Mirrored:** 2026-09-11

| File                                                    | What it is                                       |
| ------------------------------------------------------- | ------------------------------------------------ |
| `ux-customer-discovery/ux-customer-discovery.mp4`       | 720p video, 108 MB                               |
| `ux-customer-discovery/transcript.md`                   | 8,735-word transcript, 44 timestamped paragraphs |
| `ux-customer-discovery/ux-customer-discovery.en.vtt`    | raw captions with per-cue timings                |
| `ux-customer-discovery/ux-customer-discovery.info.json` | yt-dlp metadata, slimmed to the durable fields   |
| `ux-customer-discovery/ux-customer-discovery.webp`      | thumbnail                                        |

### On the transcript

The video has no human-written captions, only YouTube's automatic ones. Those turned out good enough to keep: punctuated, coherent, and 8,735 words over 57 minutes (~153 wpm, which matches the speaker). So **MacWhisper was not run.** The text still carries filler words ("um", "uh") and mishears the odd term ("UXUI"). If you want a cleaner pass later:

```bash
mw transcribe resources/videos/ux-customer-discovery/ux-customer-discovery.mp4
```

### How it was downloaded

```bash
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" \
  --write-auto-subs --sub-langs en --sub-format vtt \
  --write-info-json --write-thumbnail --merge-output-format mp4 \
  -o "ux-customer-discovery.%(ext)s" \
  "https://www.youtube.com/watch?v=8mKsZKB4Pnc"
```

The first attempt failed with `HTTP Error 403: Forbidden`. The cause was a stale yt-dlp (2026.07.04); `brew upgrade yt-dlp` to 2026.08.19 fixed it. Expect the same failure mode next time - upgrade first.

### Short-form alternative

The same Notion page links playlist `PLRXTREYLEfAc`, which is this talk cut into chapters. All 15 are mirrored - see **Chapters** above.

## The chapters

- **Playlist:** https://www.youtube.com/playlist?list=PLRXTREYLEfAc
- **Channel:** Innovation Labs - 15 videos, 57:22 total
- **Mirrored:** 2026-09-11, one folder per chapter, slug named after the title

Every chapter carried usable auto-captions, so MacWhisper was not run on any of them. Word rates land between 135 and 166 wpm, consistent with the long talk.

One chapter, `where-ai-fits-in-experiments`, failed its first download and succeeded on a plain retry. If you re-run the batch, check the tail of the output for `failed:` lines rather than trusting the exit code - the loop keeps going past a failure.
