module.exports = {
  apps: [
    {
      name: "dua-mp3-backend",
      script: "server.js",
      cwd: ".",
      watch: true,
      ignore_watch: ["node_modules", "downloads"],
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
    },
    {
      name: "dua-mp3-metadata",
      script: "python",
      args: "-m uvicorn metadata:app --port 8001",
      cwd: "../python",
      watch: true,
      ignore_watch: ["__pycache__"],
    },
  ],
};
