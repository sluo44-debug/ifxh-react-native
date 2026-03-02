# IFXH Mobile (Expo)

## Runtime entry (important)
This project currently runs from **App.js** (React Navigation) and the UI screens live under **./screens**.

The **./app** directory (expo-router file-based routing) has been removed in this clean build because it was not used by the current runtime entry.

## Get started

1) Install dependencies

```bash
npm install
```

2) Start Metro

```bash
npx expo start --clear
```

3) Run on iOS Simulator (optional)

```bash
npx expo run:ios
```

## If you ever want expo-router later
To migrate to expo-router, you would need to re-introduce an **./app** directory and change `package.json` `main` to `expo-router/entry`, then adjust navigation accordingly.
