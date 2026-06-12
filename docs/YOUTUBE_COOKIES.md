# YouTube Cookie Maintenance Guide

To prevent "Sign in to confirm you're not a bot" errors, this application supports using YouTube cookies for `yt-dlp`.

## A. Export Cookies (Local Machine)

1.  Install the **"Get cookies.txt LOCALLY"** extension in Chrome or Firefox.
2.  Go to [YouTube.com](https://www.youtube.com) and ensure you are logged in.
3.  Click the extension and export the cookies as a `cookies.txt` file.
4.  (Optional) For local development, place this file in the `backend/` directory as `cookies.txt`.

## B. Upload Cookies to Render (Production)

1.  Open your exported `cookies.txt` file in a text editor.
2.  Copy the **entire** contents of the file.
3.  Go to your **Render Dashboard**.
4.  Navigate to **Environment Variables** for your web service.
5.  Add a new variable:
    *   **Key:** `YOUTUBE_COOKIES`
    *   **Value:** Paste the full contents of your `cookies.txt` here.
6.  Save changes. Render will automatically redeploy the service.

## C. Verification

Once deployed, verify the cookie status by visiting:
`https://your-app-url.com/api/system/youtube`

Expected response:
```json
{
  "cookiesConfigured": true,
  "cookiesFileExists": true,
  "ytdlpInstalled": true
}
```

## D. Troubleshooting

If you see `YOUTUBE_AUTH_REQUIRED` errors in the logs or frontend, your cookies have likely expired. You must repeat the export and upload process to refresh them.
