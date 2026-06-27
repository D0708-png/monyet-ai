# MONYET AI

**MONYET AI** adalah aplikasi AI companion berbahasa Indonesia dengan karakter nyolot, sarkas, spontan, dan tidak terasa seperti chatbot formal.

Project ini dibuat sebagai eksperimen membangun AI assistant yang lebih ekspresif, lebih lokal, lebih multimodal, dan lebih punya kepribadian dibanding chatbot biasa.

MONYET AI saat ini tersedia dalam dua bentuk:

- **Android App** via Expo React Native
- **Web App / PWA** untuk pengguna iOS dan desktop
- **Backend API** berbasis Vercel Serverless Function
- **Gemini API** sebagai model AI utama

---

## Vision

Tujuan MONYET AI bukan cuma membuat chatbot yang bisa menjawab pertanyaan.

Project ini dibangun untuk mengeksplorasi bagaimana AI bisa punya persona yang lebih kuat, lebih natural dalam bahasa Indonesia, dan tetap bisa membantu user dalam berbagai konteks seperti:

- ngobrol santai
- roasting ide
- menjelaskan topik serius
- membaca gambar
- mengingat konteks percakapan
- memberi respons dengan gaya yang lebih hidup
- tetap terasa seperti karakter, bukan bot formal

MONYET AI juga menjadi fondasi untuk eksperimen AI companion yang lebih ambisius, termasuk:

- multimodal input
- temporary image understanding
- memory percakapan
- web-based access untuk iOS
- voice response
- camera support
- image from URL
- video/link analysis
- stronger personality engineering

---

## Current Features

### Chat AI Berbahasa Indonesia

MONYET AI dapat menjawab pesan user dengan gaya bahasa Indonesia yang santai, nyolot, dan tidak terlalu kaku.

Karakter utama MONYET AI adalah:

- spontan
- sarkastik
- cepat nyeletuk
- bisa membantu user
- tidak terlalu formal
- punya gaya bicara khas

### Mode AMAN dan BRUTAL

Aplikasi memiliki dua mode persona.

#### AMAN

Mode yang lebih ringan, cocok untuk:

- obrolan santai
- ide konten
- saran
- pertanyaan ringan
- roasting yang tidak terlalu keras

#### BRUTAL

Mode yang lebih pedas dan lebih agresif secara gaya komunikasi.

Mode ini dibuat untuk versi MONYET AI yang lebih ekstrem secara persona, tetapi tetap diarahkan sebagai gaya roasting komedi, bukan ancaman nyata atau kebencian serius.

### Temporary Image Upload

User dapat mengupload gambar agar MONYET AI bisa membaca dan menjelaskan isi gambar.

Fitur image upload ini bersifat **temporary**.

Artinya:

- gambar tidak disimpan ke database
- gambar tidak disimpan ke localStorage
- gambar tidak disimpan permanen di backend
- gambar hanya dikirim sekali sebagai bagian dari request
- gambar hilang saat user reset memory
- gambar hilang saat website di-refresh
- gambar hilang saat aplikasi ditutup

Fitur ini dibuat supaya aplikasi tetap ringan dan tidak menyimpan file user secara permanen.

### Image Understanding

MONYET AI dapat menerima gambar dari user dan memberikan respons berdasarkan isi gambar tersebut.

Contoh penggunaan:

- menjelaskan isi gambar
- mengomentari foto
- membantu memahami objek dalam gambar
- memberi opini berdasarkan visual
- menganalisis screenshot atau foto sederhana

### Conversation Memory

MONYET AI dapat mengingat riwayat percakapan terbaru selama sesi berjalan.

Memory digunakan supaya jawaban tetap nyambung saat user merujuk ke percakapan sebelumnya.

Pada Android app dan web app, user dapat menghapus memory dengan tombol reset.

### Web App untuk iOS

Karena build iOS native membutuhkan Apple Developer account dan proses signing, MONYET AI juga menyediakan versi web yang bisa diakses dari Safari.

User iPhone dapat membuka website lalu menggunakan fitur:

```text
Share → Add to Home Screen
```

Dengan begitu, MONYET AI bisa dipakai seperti aplikasi ringan di iPhone tanpa perlu TestFlight atau App Store.

### Voice Playback

Aplikasi Android mendukung voice playback menggunakan fitur speech bawaan device.

Pada versi web, voice playback menggunakan Web Speech API jika browser mendukung.

### Selective Info Check

Backend MONYET AI dapat mencoba menggunakan search grounding secara selektif untuk pertanyaan yang terlihat membutuhkan informasi terbaru, seperti:

- harga
- berita
- geopolitik
- ekonomi
- kebijakan
- kurs
- konflik
- data publik
- kondisi terkini

Jika search terkena limit, backend tetap mencoba fallback ke jawaban internal model.

---

## Tech Stack

### Frontend Android

- Expo
- React Native
- TypeScript
- Expo Speech
- Expo Image Picker
- EAS Build

### Frontend Web

- HTML
- CSS
- JavaScript
- GSAP animation
- Web Speech API
- localStorage untuk memory teks

### Backend

- Vercel Serverless Function
- Node.js
- Gemini API
- Google Search Grounding secara selektif
- CORS support

### AI Model

- Gemini API via `@google/genai`

---

## Project Structure

```text
monyet-ai/
├── api/
│   └── chat.js              # Backend API untuk chat, image, dan Gemini
│
├── app/
│   ├── src/
│   │   └── app/
│   │       └── index.tsx    # Android app screen
│   ├── assets/
│   │   └── images/          # Icon dan asset app
│   ├── app.json             # Expo config
│   └── eas.json             # EAS build config
│
├── index.html               # Web app / PWA untuk iOS dan desktop
├── package.json             # Root package untuk Vercel backend
├── README.md
└── .gitignore
```

---

## How It Works

Alur utama MONYET AI:

```text
User mengirim pesan atau gambar
        ↓
Frontend Android/Web mengirim request ke /api/chat
        ↓
Backend menerima message, mode, history, dan optional imageBase64
        ↓
Backend menyusun prompt persona MONYET AI
        ↓
Jika pertanyaan butuh data terbaru, backend dapat mencoba search grounding
        ↓
Jika ada gambar, backend mengirim gambar ke Gemini sebagai inline data
        ↓
Gemini menghasilkan response sesuai persona
        ↓
Frontend menampilkan jawaban dan menyimpan memory teks sementara
```

---

## Image Handling

Fitur image upload menggunakan base64 inline data.

Contoh request payload:

```json
{
  "message": "Jelaskan gambar ini",
  "mode": "AMAN",
  "history": [],
  "imageBase64": "base64-image-data",
  "imageMimeType": "image/jpeg"
}
```

Backend mengirim gambar ke Gemini sebagai inline data.

Image tidak disimpan permanen. Setelah request selesai, image hanya ada di memory runtime sementara.

---

## Environment Variables

Backend membutuhkan environment variable berikut:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

Untuk Vercel, environment variable diatur melalui dashboard project:

```text
Project Settings → Environment Variables
```

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/D0708-png/monyet-ai
cd monyet-ai
```

Ganti `username` dengan username GitHub pemilik repository.

### 2. Install Root Dependencies

```bash
npm install
```

Root dependency digunakan untuk backend Vercel.

### 3. Install Android App Dependencies

```bash
cd app
npm install
```

### 4. Run Expo App

```bash
npx expo start --clear
```

---

## Android Build

Build APK menggunakan EAS:

```bash
cd app
eas build -p android --profile preview
```

Output build berupa file `.apk` yang dapat diinstall langsung di Android.

---

## Web Deployment

Website dan API berjalan di Vercel.

Root URL:

```text
https://monyet-ai.vercel.app
```

API endpoint:

```text
https://monyet-ai.vercel.app/api/chat
```

---

## Current Platform Support

| Platform | Status | Notes |
|---|---|---|
| Android | Supported | Native APK via EAS |
| iOS | Supported via Web | Safari + Add to Home Screen |
| Desktop Browser | Supported | Web app |
| Native iOS | Planned | Requires Apple Developer account |

---

## Roadmap

### Short Term

- Improve image upload reliability
- Add camera capture directly from Android app
- Improve web app mobile responsiveness
- Add better loading states
- Add source display when search grounding is used
- Improve prompt consistency between AMAN and BRUTAL mode

### Mid Term

- Image input from URL
- Video link summary
- YouTube metadata and transcript analysis
- More polished PWA behavior
- Better voice selection
- Custom MONYET voice
- Better mobile UI refinement

### Long Term

- Native iOS build
- More advanced memory system
- User persona settings
- Character customization
- Safer but still expressive personality controls
- Offline cache for UI
- Multi-agent reasoning mode

---

## Privacy Notes

MONYET AI does not intentionally store uploaded images.

Current image behavior:

- temporary image preview on frontend
- base64 sent to backend for one request
- no database persistence
- reset memory clears selected image
- closing or refreshing app removes temporary image state

Chat history is stored locally only for conversation continuity.

---

## Important Notes

This project is experimental.

MONYET AI is designed as a personality-driven AI companion, not a professional advisor. Responses may contain sarcasm, roasting, or exaggerated comedic tone depending on selected mode.

For serious topics such as health, legal, finance, safety, or emergency situations, users should verify information through reliable sources.

---

## Credits

Built as an experimental AI companion project using:

- Expo
- React Native
- Vercel
- Gemini API
- GSAP
- EAS Build

---

## Status

MONYET AI is actively being developed.

Current focus:

```text
Android App + Web App + Temporary Image Upload + Stronger AI Personality
```
