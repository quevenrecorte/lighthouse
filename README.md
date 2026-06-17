# Lighthouse v0.4 - Realtime Database Chat

Upload/replace all files in the lighthouse GitHub repository.

Files:
- index.html
- style.css
- app.js
- chat.html
- chat.js
- README.md

## Firebase Realtime Database Rules

Firebase Console → Build → Realtime Database → Rules

Paste these rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "messages": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$messageId": {
            ".validate": "newData.hasChildren(['text', 'uid', 'name', 'createdAt']) && newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 500 && newData.child('uid').val() === auth.uid"
          }
        }
      }
    }
  }
}
```

## Test

1. Go to https://quevenrecorte.github.io/lighthouse/
2. Sign in with the Firebase Auth account.
3. Send a message.
4. Open the site in another browser/device and sign in to see real-time updates.

Note: This version requires Firebase Authentication Email/Password to be enabled.
