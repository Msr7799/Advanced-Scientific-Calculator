import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glass: "0 28px 80px rgba(15,23,42,0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
