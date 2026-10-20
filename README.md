# KeyStrike

KeyStrike is a JavaScript-only Expo React Native migration of the `keystrike-main` app for iOS and Android. It retains the original music lesson quiz, Piano Man songs, Tower Defense game, achievements, player profile, account statistics, and supplied artwork/audio.

You can start and play as a guest. Game results and achievements are stored locally; after a completed run, you can choose to sign in or create an account to sync the saved progress to Firebase.

## Run the app

Install dependencies and start Expo:

```sh
npm install
npm start
```

Use the Expo terminal shortcuts or run `npm run android` / `npm run ios` to launch on a configured simulator or device.

## Firebase authentication

Email/password sign-in, registration, password resets, and persistent native sessions use the Firebase project configured in `src/firebase.js`. Guest results are synced when you sign in after choosing to save a completed run.

To enable Google sign-in, create OAuth client IDs for the Android, iOS, and web application in Google Cloud and add them to a local `.env` file:

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

The Google OAuth redirect URI must also be allowed by the OAuth client configuration. Restart Expo after changing environment variables. Google sign-in reports a configuration message until the platform's client ID is set.
