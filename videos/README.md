# Explainer videos

Short vertical explainers (Arabic, UAE dialect, burned-in captions) for the public site, made with Remotion from the
`reel-video-ad` skill. Not part of the bun workspaces.

| Folder | Composition | Shown on |
|---|---|---|
| `public/home` | `src/Home.tsx` · `HomeReel` | landing hero (`ExplainerVideo id="home"`) |
| `public/how` | `src/How.tsx` · `HowReel` | landing #how ("Watch the 3 steps" dialog) |
| `public/allaccess` | `src/AllAccess.tsx` · `AllAccessReel` | /all-access |
| `public/teach` | `src/Teach.tsx` · `TeachReel` | /teach ("Watch" dialog) |

Each folder holds `scenes.json` (script), `reel.config.json` (brand, voice), `timeline.json` and the processed voice clips
`vf-N.wav`, so a re-render needs no new voice. The teach video's last scene has no voice (the free TTS quota ran out); it is a
silent end card.

```bash
npm i
npx remotion render src/Home.tsx HomeReel output/home.mp4 --concurrency=4 --crf=20
# website copy: 4:5 crop of the content area, 720x900, plus the poster frame
ffmpeg -i output/home.mp4 -vf "crop=1080:1350:0:120,scale=720:900:flags=lanczos" -c:v libx264 -crf 27 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart ../apps/web/public/videos/home.mp4
ffmpeg -ss 1.4 -i output/home.mp4 -frames:v 1 -vf "crop=1080:1350:0:120,scale=720:900" -q:v 4 ../apps/web/public/videos/home.jpg
```

New voice lines: put `GOOGLE_API_KEY` in `videos/.env` (git-ignored), edit `scenes.json`, delete the scene's `voice-N.wav`, then
`python3 ~/.claude/skills/reel-video-ad/scripts/reel.py voice|audio|timeline public/<folder>`. `capture-clean.js` takes
phone screenshots of azza.academy with the cookie banner already answered.
