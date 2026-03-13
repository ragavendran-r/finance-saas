/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1e2433',
          hover: '#2a3348',
          active: '#3b4a6b',
        },
      },
    },
  },
  plugins: [],
}

