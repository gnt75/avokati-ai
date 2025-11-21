# ⚖️ Avokati AI - Asistenti Ligjor Virtual

Ky është një aplikacion i inteligjencës artificiale (RAG) i ndërtuar për të asistuar juristët, noterët dhe qytetarët me legjislacionin shqiptar.

Aplikacioni lejon ngarkimin e qindra ligjeve (PDF), analizon çështje specifike dhe harton dokumente ligjore duke cituar nenet përkatëse.

## 🚀 Funksionalitetet Kryesore

*   **Truri i Dyfishtë (RAG):** Zgjedh automatikisht ligjet relevante për pyetjen nga databaza.
*   **Arkiva Lokale:** Ruan dokumentet në shfletues që të mos humbasin.
*   **Analizë e Kryqëzuar:** Lidh faktet e çështjes (Dosja) me Ligjet (Kodet).
*   **Eksportim:** Shkarkon përgjigjet si dokumente `.txt`.
*   **Instalim (PWA):** Mund të instalohet si aplikacion në telefon/kompjuter.

## 🛠️ Si ta hapni në kompjuter (Lokal)

1.  Klononi projektin:
    ```bash
    git clone https://github.com/gnt75/avokati-ai.git
    ```
2.  Instaloni paketat:
    ```bash
    npm install
    ```
3.  Krijoni një skedar `.env` në rrënjë të projektit dhe shtoni çelësin tuaj:
    ```env
    API_KEY=AIzaSy...
    ```
4.  Nisni aplikacionin:
    ```bash
    npm run dev
    ```

## 🌐 Publikimi (Deploy)

Ky projekt është gati për t'u publikuar në **Vercel**.
Sigurohuni që të shtoni `API_KEY` tek Environment Variables në panelin e Vercel.
