# MONYET AI

MONYET AI adalah AI companion berbahasa Indonesia dengan gaya nyolot, sarkas, random, dan bisa roasting secara komedi.

Project ini terdiri dari:

- Backend: Node.js + Express + Gemini API
- Mobile App: Expo React Native
- Voice: sementara memakai voice bawaan Android lewat Expo Speech
- Memory: percakapan disimpan sementara selama app belum di-restart

## Struktur Project

```text
monyet-ai/
  backend/
    server.js
    package.json
    .env.example
  app/
    src/
    app.json
    package.json
  README.md
  .gitignore